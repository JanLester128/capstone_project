<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\User;
use App\Models\StudentPersonalInfo;
use App\Models\SchoolYear;
use App\Models\Strand;
use App\Models\Section;
use App\Models\Subject;
use App\Models\TransfereeSubjectCredit;
use App\Models\TransfereePreviousSchool;
use App\Models\TransfereeCreditedSubject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Carbon\Carbon;

class EnrollmentController extends Controller
{
    /**
     * Display student enrollment page
     */
    public function studentEnrollmentPage()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'student') {
            return redirect('/login')->with('error', 'Access denied.');
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Student/Student_Enrollment', [
                'error' => 'No active school year found.',
                'enrollmentOpen' => false
            ]);
        }

        // Check if enrollment is open for current semester
        $enrollmentOpen = $this->isEnrollmentOpen($currentSchoolYear);
        
        // Get available strands
        $strands = Strand::where('is_active', true)->get();
        
        // Get existing enrollment for current school year
        $existingEnrollment = $this->getStudentEnrollment($user->id, $currentSchoolYear->id);
        
        return Inertia::render('Student/Student_Enrollment', [
            'user' => $user,
            'currentSchoolYear' => $currentSchoolYear,
            'enrollmentOpen' => $enrollmentOpen,
            'strands' => $strands,
            'existingEnrollment' => $existingEnrollment
        ]);
    }

    /**
     * Submit student enrollment application
     */
    public function submitEnrollment(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'student') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear || !$this->isEnrollmentOpen($currentSchoolYear)) {
            return response()->json(['error' => 'Enrollment is currently closed.'], 422);
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'strand_id' => 'required|exists:strands,id',
            'intended_grade_level' => 'required|in:11,12',
            'student_type' => 'required|in:new,continuing,transferee',
            'previous_school_name' => 'required_if:student_type,transferee|string|max:255',
            'previous_school_address' => 'required_if:student_type,transferee|string|max:500',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:5120' // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check for existing enrollment
        $existingEnrollment = $this->getStudentEnrollment($user->id, $currentSchoolYear->id);
        
        if ($existingEnrollment && $existingEnrollment->status !== 'rejected') {
            return response()->json(['error' => 'You already have an enrollment application for this school year.'], 422);
        }

        DB::beginTransaction();
        
        try {
            // Get or create student personal info
            $studentInfo = StudentPersonalInfo::where('user_id', $user->id)->first();
            
            if (!$studentInfo) {
                return response()->json(['error' => 'Student personal information not found. Please complete your profile first.'], 422);
            }

            // Create enrollment record
            $enrollmentData = [
                'student_personal_info_id' => $studentInfo->id,
                'strand_id' => $request->strand_id,
                'school_year_id' => $currentSchoolYear->id,
                'intended_grade_level' => $request->intended_grade_level,
                'status' => 'pending',
                'enrollment_type' => $request->student_type === 'transferee' ? 'transferee' : 'regular',
                'enrollment_method' => 'self',
                'enrollment_date' => now()
            ];

            // For transferees, require coordinator evaluation
            if ($request->student_type === 'transferee') {
                $enrollmentData['status'] = 'pending_evaluation';
            }

            $enrollment = Enrollment::create($enrollmentData);

            // Handle transferee-specific data
            if ($request->student_type === 'transferee') {
                $this->handleTransfereeData($enrollment, $request);
            }

            // Handle document uploads
            if ($request->hasFile('documents')) {
                $this->handleDocumentUploads($enrollment, $request->file('documents'));
            }

            // Update user student_type if needed
            if ($user->student_type !== $request->student_type) {
                User::where('id', $user->id)->update(['student_type' => $request->student_type]);
            }

            DB::commit();

            // Log enrollment submission
            Log::info('Enrollment submitted', [
                'user_id' => $user->id,
                'enrollment_id' => $enrollment->id,
                'student_type' => $request->student_type,
                'strand_id' => $request->strand_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Enrollment application submitted successfully.',
                'enrollment' => $enrollment->load(['strand', 'schoolYear'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Enrollment submission failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json(['error' => 'Failed to submit enrollment. Please try again.'], 500);
        }
    }

    /**
     * Get enrollments for coordinator/registrar review
     */
    public function getEnrollmentsForReview(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['registrar', 'coordinator'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return response()->json(['error' => 'No active school year found.'], 422);
        }

        $query = Enrollment::with([
            'studentPersonalInfo.user',
            'strand',
            'assignedSection',
            'coordinator'
        ])->where('school_year_id', $currentSchoolYear->id);

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by enrollment type
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('enrollment_type', $request->type);
        }

        // For coordinators, show only transferee enrollments needing evaluation
        if ($user->role === 'coordinator') {
            $query->where('enrollment_type', 'transferee')
                  ->whereIn('status', ['pending_evaluation', 'evaluated']);
        }

        $enrollments = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'enrollments' => $enrollments,
            'currentSchoolYear' => $currentSchoolYear
        ]);
    }

    /**
     * Approve enrollment (Registrar only)
     */
    public function approveEnrollment(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $enrollment = Enrollment::with(['studentPersonalInfo.user', 'strand'])->find($enrollmentId);
        
        if (!$enrollment) {
            return response()->json(['error' => 'Enrollment not found.'], 404);
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'assigned_section_id' => 'required|exists:sections,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        
        try {
            // Update enrollment status
            $enrollment->update([
                'status' => 'approved',
                'assigned_section_id' => $request->assigned_section_id
            ]);

            // Log approval
            Log::info('Enrollment approved', [
                'enrollment_id' => $enrollment->id,
                'student_id' => $enrollment->studentPersonalInfo->user_id,
                'approved_by' => $user->id,
                'section_id' => $request->assigned_section_id
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Enrollment approved successfully.',
                'enrollment' => $enrollment->fresh(['studentPersonalInfo.user', 'strand', 'assignedSection'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Enrollment approval failed', [
                'enrollment_id' => $enrollment->id,
                'error' => $e->getMessage()
            ]);

            return response()->json(['error' => 'Failed to approve enrollment.'], 500);
        }
    }

    /**
     * Reject enrollment
     */
    public function rejectEnrollment(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['registrar', 'coordinator'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $enrollment = Enrollment::find($enrollmentId);
        
        if (!$enrollment) {
            return response()->json(['error' => 'Enrollment not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        
        try {
            $enrollment->update([
                'status' => 'rejected',
                'rejection_reason' => $request->rejection_reason
            ]);

            Log::info('Enrollment rejected', [
                'enrollment_id' => $enrollment->id,
                'rejected_by' => $user->id,
                'reason' => $request->rejection_reason
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Enrollment rejected.',
                'enrollment' => $enrollment->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            return response()->json(['error' => 'Failed to reject enrollment.'], 500);
        }
    }

    /**
     * Show transferee management dashboard (Coordinator only)
     */
    public function transfereeManagement()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'coordinator') {
            return redirect('/faculty/dashboard')->with('error', 'Access denied. Coordinator privileges required.');
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Faculty/TransfereeManagement', [
                'error' => 'No active school year found.',
                'transfereeEnrollments' => [],
                'stats' => []
            ]);
        }

        // Get transferee enrollments with related data
        $transfereeEnrollments = Enrollment::with([
            'studentPersonalInfo.user',
            'strand',
            'transfereePreviousSchool',
            'coordinator'
        ])
        ->where('school_year_id', $currentSchoolYear->id)
        ->where('enrollment_type', 'transferee')
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($enrollment) {
            return [
                'id' => $enrollment->id,
                'student_name' => $enrollment->studentPersonalInfo->user->firstname . ' ' . $enrollment->studentPersonalInfo->user->lastname,
                'student_email' => $enrollment->studentPersonalInfo->user->email,
                'intended_grade_level' => $enrollment->intended_grade_level,
                'strand_name' => $enrollment->strand->name,
                'previous_school' => $enrollment->transfereePreviousSchool->school_name ?? null,
                'status' => $enrollment->status,
                'enrollment_date' => $enrollment->enrollment_date,
                'evaluation_notes' => $enrollment->evaluation_notes,
                'coordinator_name' => $enrollment->coordinator ? $enrollment->coordinator->firstname . ' ' . $enrollment->coordinator->lastname : null
            ];
        });

        // Calculate statistics
        $stats = [
            'pending_evaluation' => $transfereeEnrollments->where('status', 'pending_evaluation')->count(),
            'evaluated' => $transfereeEnrollments->where('status', 'evaluated')->count(),
            'approved' => $transfereeEnrollments->where('status', 'approved')->count(),
            'rejected' => $transfereeEnrollments->where('status', 'rejected')->count(),
            'returned' => $transfereeEnrollments->where('status', 'returned')->count(),
            'total' => $transfereeEnrollments->count()
        ];

        return Inertia::render('Faculty/TransfereeManagement', [
            'transfereeEnrollments' => $transfereeEnrollments,
            'stats' => $stats,
            'currentSchoolYear' => $currentSchoolYear
        ]);
    }

    /**
     * Show transferee evaluation page (Coordinator only)
     */
    public function showTransfereeEvaluation($enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'coordinator') {
            return redirect('/faculty/enrollment')->with('error', 'Access denied.');
        }

        $enrollment = Enrollment::with([
            'studentPersonalInfo.user',
            'strand',
            'schoolYear'
        ])->find($enrollmentId);
        
        if (!$enrollment || $enrollment->enrollment_type !== 'transferee') {
            return redirect('/faculty/enrollment')->with('error', 'Transferee enrollment not found.');
        }

        // Get available strands
        $strands = Strand::where('is_active', true)->get();
        
        // Get standard subjects for the intended grade level and strand
        $standardSubjects = Subject::where('year_level', $enrollment->intended_grade_level)
            ->where('strand_id', $enrollment->strand_id)
            ->get();
        
        // Get all subjects for reference
        $subjects = Subject::all();

        // Try to get transferee previous school data safely
        $previousSchool = null;
        $creditedSubjects = [];
        
        try {
            if ($enrollment->studentPersonalInfo && $enrollment->studentPersonalInfo->user) {
                $studentId = $enrollment->studentPersonalInfo->user->id;
                $studentPersonalInfoId = $enrollment->studentPersonalInfo->id;
                
                $previousSchool = TransfereePreviousSchool::where('student_personal_info_id', $studentPersonalInfoId)->first();
                $creditedSubjects = TransfereeCreditedSubject::where('student_id', $studentId)
                    ->with('subject')
                    ->get();
            }
        } catch (\Exception $e) {
            // Log the error but continue
            Log::warning('Could not load transferee previous school data', [
                'enrollment_id' => $enrollmentId,
                'error' => $e->getMessage()
            ]);
        }

        // Add the previous school and subject credits to the enrollment data
        $enrollmentData = $enrollment->toArray();
        $enrollmentData['transferee_previous_school'] = $previousSchool;
        $enrollmentData['transferee_subject_credits'] = $creditedSubjects;

        return Inertia::render('Faculty/TransfereeEvaluation', [
            'enrollment' => $enrollmentData,
            'strands' => $strands,
            'subjects' => $subjects,
            'standardSubjects' => $standardSubjects
        ]);
    }

    /**
     * Evaluate transferee enrollment (Coordinator only)
     */
    public function evaluateTransferee(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'coordinator') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $enrollment = Enrollment::with(['studentPersonalInfo.user'])->find($enrollmentId);
        
        if (!$enrollment || $enrollment->enrollment_type !== 'transferee') {
            return response()->json(['error' => 'Transferee enrollment not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'recommended_strand_id' => 'required|exists:strands,id',
            'recommended_grade_level' => 'required|in:11,12',
            'subject_evaluations' => 'array',
            'subject_evaluations.*.standard_subject_id' => 'required|exists:subjects,id',
            'subject_evaluations.*.is_credited' => 'required|boolean',
            'subject_evaluations.*.equivalent_grade' => 'nullable|numeric|min:0|max:100',
            'subject_evaluations.*.remarks' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        
        try {
            // Update enrollment with coordinator evaluation
            $enrollment->update([
                'status' => 'evaluated', // Will need registrar approval before enrollment
                'coordinator_id' => $user->id,
                'strand_id' => $request->recommended_strand_id,
                'intended_grade_level' => $request->recommended_grade_level
            ]);

            // Ensure transferee previous school record exists
            $this->ensureTransfereePreviousSchool($enrollment);

            // Save subject evaluations to transferee_credited_subjects table
            if (!empty($request->subject_evaluations)) {
                $studentId = $enrollment->studentPersonalInfo->user_id;
                $currentSchoolYear = SchoolYear::where('is_active', true)->first();
                
                // Generate school year if none is active - ensure it's never null
                $schoolYearValue = null;
                if ($currentSchoolYear && !empty($currentSchoolYear->school_year)) {
                    $schoolYearValue = $currentSchoolYear->school_year;
                } else {
                    // Fallback to current academic year
                    $currentYear = date('Y');
                    $nextYear = $currentYear + 1;
                    $schoolYearValue = $currentYear . '-' . $nextYear;
                }
                
                // Double-check that we have a value
                if (empty($schoolYearValue)) {
                    $schoolYearValue = '2025-2026'; // Hard fallback
                }
                
                Log::info('Saving transferee subject evaluations', [
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $studentId,
                    'evaluations_count' => count($request->subject_evaluations),
                    'current_school_year' => $currentSchoolYear ? $currentSchoolYear->school_year : 'null',
                    'school_year_value' => $schoolYearValue
                ]);
                
                // Clear existing credited subjects for this student
                TransfereeCreditedSubject::where('student_id', $studentId)->delete();
                
                foreach ($request->subject_evaluations as $index => $evaluation) {
                    if (isset($evaluation['is_credited']) && $evaluation['is_credited'] && !empty($evaluation['equivalent_grade'])) {
                        try {
                            // Validate data before creation
                            $createData = [
                                'student_id' => $studentId,
                                'subject_id' => $evaluation['standard_subject_id'],
                                'grade' => $evaluation['equivalent_grade'],
                                'semester' => '1st', // Default to 1st semester, can be made dynamic
                                'school_year' => $schoolYearValue,
                                'remarks' => $evaluation['remarks'] ?? ''
                            ];
                            
                            // Log the data being inserted
                            Log::info('Creating credited subject with data', [
                                'create_data' => $createData,
                                'school_year_check' => $createData['school_year']
                            ]);
                            
                            $creditedSubject = TransfereeCreditedSubject::create($createData);
                            
                            Log::info('Created credited subject', [
                                'credited_subject_id' => $creditedSubject->id,
                                'subject_id' => $evaluation['standard_subject_id'],
                                'grade' => $evaluation['equivalent_grade']
                            ]);
                        } catch (\Exception $e) {
                            Log::error('Failed to create credited subject', [
                                'evaluation_index' => $index,
                                'evaluation_data' => $evaluation,
                                'error' => $e->getMessage()
                            ]);
                            throw $e; // Re-throw to trigger rollback
                        }
                    }
                }
            }

            Log::info('Transferee enrollment evaluated', [
                'enrollment_id' => $enrollment->id,
                'evaluated_by' => $user->id,
                'recommended_strand' => $request->recommended_strand_id,
                'recommended_grade' => $request->recommended_grade_level
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transferee evaluation completed successfully.',
                'enrollment' => $enrollment->fresh(['strand', 'coordinator'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Transferee evaluation failed', [
                'enrollment_id' => $enrollment->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to complete evaluation.',
                'message' => $e->getMessage(),
                'details' => 'Please check the logs for more information.'
            ], 500);
        }
    }

    /**
     * Return transferee evaluation for revision (Registrar only)
     */
    public function returnForRevision(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $enrollment = Enrollment::find($enrollmentId);
        
        if (!$enrollment || $enrollment->enrollment_type !== 'transferee') {
            return response()->json(['error' => 'Transferee enrollment not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'revision_notes' => 'required|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        
        try {
            $enrollment->update([
                'status' => 'returned',
                'revision_notes' => $request->revision_notes
            ]);

            // Notify coordinator about the return
            if ($enrollment->coordinator) {
                $enrollment->coordinator->notify(new \App\Notifications\EvaluationReturnedForRevision($enrollment, $request->revision_notes));
            }

            Log::info('Transferee evaluation returned for revision', [
                'enrollment_id' => $enrollment->id,
                'returned_by' => $user->id,
                'notes' => $request->revision_notes
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Evaluation returned for revision.',
                'enrollment' => $enrollment->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            return response()->json(['error' => 'Failed to return evaluation.'], 500);
        }
    }

    /**
     * Get evaluation history for an enrollment
     */
    public function getEvaluationHistory($enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['registrar', 'coordinator'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $enrollment = Enrollment::with([
            'transfereeSubjectCredits',
            'coordinator'
        ])->find($enrollmentId);
        
        if (!$enrollment) {
            return response()->json(['error' => 'Enrollment not found.'], 404);
        }

        // Get evaluation history (you might want to create an EvaluationHistory model)
        $history = [
            'enrollment_date' => $enrollment->enrollment_date,
            'evaluation_completed' => $enrollment->coordinator_id ? $enrollment->updated_at : null,
            'coordinator' => $enrollment->coordinator ? [
                'name' => $enrollment->coordinator->firstname . ' ' . $enrollment->coordinator->lastname,
                'email' => $enrollment->coordinator->email
            ] : null,
            'subject_credits_count' => $enrollment->transfereeSubjectCredits->count(),
            'total_credited_units' => $enrollment->transfereeSubjectCredits->sum('units'),
            'status_changes' => [
                // This would ideally come from an audit log
                [
                    'status' => 'pending_evaluation',
                    'date' => $enrollment->created_at,
                    'note' => 'Application submitted'
                ],
                [
                    'status' => $enrollment->status,
                    'date' => $enrollment->updated_at,
                    'note' => $enrollment->evaluation_notes ?? 'Status updated'
                ]
            ]
        ];

        return response()->json([
            'enrollment' => $enrollment,
            'history' => $history
        ]);
    }

    /**
     * Private helper methods
     */
    private function isEnrollmentOpen($schoolYear)
    {
        $now = Carbon::now();
        
        // Check if current date is within enrollment period
        if ($schoolYear->enrollment_start && $schoolYear->enrollment_end) {
            return $now->between(
                Carbon::parse($schoolYear->enrollment_start),
                Carbon::parse($schoolYear->enrollment_end)
            );
        }
        
        // Default: enrollment is open if no specific dates are set
        return true;
    }

    private function getStudentEnrollment($userId, $schoolYearId)
    {
        return Enrollment::with(['strand', 'assignedSection', 'schoolYear'])
            ->whereHas('studentPersonalInfo', function($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->where('school_year_id', $schoolYearId)
            ->first();
    }

    private function handleTransfereeData($enrollment, $request)
    {
        // Create or update transferee previous school record
        TransfereePreviousSchool::updateOrCreate(
            ['enrollment_id' => $enrollment->id],
            [
                'school_name' => $request->previous_school_name,
                'school_address' => $request->previous_school_address,
                'last_grade_level' => $request->last_grade_level ?? null,
                'last_school_year' => $request->last_school_year ?? null
            ]
        );
    }

    private function handleDocumentUploads($enrollment, $documents)
    {
        foreach ($documents as $document) {
            $path = $document->store('enrollment_documents/' . $enrollment->id, 'public');
            
            // You might want to create a separate EnrollmentDocument model
            // For now, we'll just log the uploaded files
            Log::info('Document uploaded for enrollment', [
                'enrollment_id' => $enrollment->id,
                'file_path' => $path,
                'original_name' => $document->getClientOriginalName()
            ]);
        }
    }

    /**
     * Ensure transferee previous school record exists for transferee students
     */
    private function ensureTransfereePreviousSchool($enrollment)
    {
        if ($enrollment->enrollment_type !== 'transferee') {
            return;
        }

        $studentInfo = $enrollment->studentPersonalInfo;
        if (!$studentInfo) {
            return;
        }

        // Check if transferee previous school record already exists
        $existingRecord = TransfereePreviousSchool::where('student_personal_info_id', $studentInfo->id)->first();
        
        if (!$existingRecord) {
            // Get previous school from student personal info
            $lastSchool = $studentInfo->last_school ?? $studentInfo->previous_school ?? 'Not specified';
            
            try {
                TransfereePreviousSchool::create([
                    'student_personal_info_id' => $studentInfo->id,
                    'last_school' => $lastSchool
                ]);
                
                Log::info('Auto-created transferee previous school record', [
                    'enrollment_id' => $enrollment->id,
                    'student_personal_info_id' => $studentInfo->id,
                    'last_school' => $lastSchool
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to auto-create transferee previous school record', [
                    'enrollment_id' => $enrollment->id,
                    'student_personal_info_id' => $studentInfo->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }
}
