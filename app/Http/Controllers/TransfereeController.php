<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Subject;
use App\Models\Strand;
use App\Models\TransfereeCreditedSubject;
use App\Models\TransfereePreviousSchool;
use App\Models\Enrollment;

class TransfereeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Store previous school information for a transferee student
     */
    public function storePreviousSchool(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:users,id',
            'last_school' => 'required|string|max:255'
        ]);

        try {
            // First, verify this is a transferee student
            $student = User::find($request->student_id);
            
            // Check if student exists and get their personal info
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $request->student_id)
                ->first();
            
            // Verify this is a transferee student (check both possible fields)
            $isTransferee = ($student && $student->student_type === 'transferee') || 
                           ($studentPersonalInfo && $studentPersonalInfo->student_status === 'Transferee');
            
            if (!$isTransferee) {
                return response()->json([
                    'success' => false,
                    'message' => 'This function is only available for transferee students'
                ], 403);
            }

            // Use updateOrCreate to handle one record per student
            $previousSchool = TransfereePreviousSchool::updateOrCreate(
                ['student_id' => $request->student_id],
                $validated
            );
            
            // Ensure student is marked as transferee in users table
            User::where('id', $request->student_id)
                ->update(['student_type' => 'transferee']);

            Log::info('Previous school saved for transferee student', [
                'student_id' => $request->student_id,
                'last_school' => $validated['last_school']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Previous school information saved successfully for transferee student',
                'data' => $previousSchool
            ]);
        } catch (\Exception $e) {
            Log::error('Error storing previous school for transferee: ' . $e->getMessage(), [
                'student_id' => $request->student_id ?? 'unknown'
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to save previous school information'
            ], 500);
        }
    }

    /**
     * Store credited subjects for a transferee student
     */
    public function storeCreditedSubjects(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'credited_subjects' => 'required|array',
            'credited_subjects.*.subject_id' => 'required|exists:subjects,id',
            'credited_subjects.*.grade' => 'required|numeric|min:75|max:100',
            'credited_subjects.*.semester' => 'required|in:1st,2nd',
            'credited_subjects.*.school_year' => 'required|string|max:20',
            'credited_subjects.*.remarks' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // First, verify this is a transferee student
            $student = User::find($request->student_id);
            
            // Check if student exists and get their personal info
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $request->student_id)
                ->first();
            
            // Verify this is a transferee student (check both possible fields)
            $isTransferee = ($student && $student->student_type === 'transferee') || 
                           ($studentPersonalInfo && $studentPersonalInfo->student_status === 'Transferee');
            
            if (!$isTransferee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Subject credits can only be saved for transferee students'
                ], 403);
            }
            DB::beginTransaction();

            $studentId = $request->student_id;
            $creditedSubjects = [];

            foreach ($request->credited_subjects as $subjectData) {
                // Check if credit already exists for this subject/semester combination
                $existingCredit = TransfereeCreditedSubject::where([
                    'student_id' => $studentId,
                    'subject_id' => $subjectData['subject_id'],
                    'semester' => $subjectData['semester']
                ])->first();

                if ($existingCredit) {
                    // Update existing credit
                    $existingCredit->update([
                        'grade' => $subjectData['grade'],
                        'school_year' => $subjectData['school_year'],
                        'remarks' => $subjectData['remarks'] ?? null
                    ]);
                    $creditedSubjects[] = $existingCredit;
                } else {
                    // Create new credit
                    $creditedSubject = TransfereeCreditedSubject::create([
                        'student_id' => $studentId,
                        'subject_id' => $subjectData['subject_id'],
                        'grade' => $subjectData['grade'],
                        'semester' => $subjectData['semester'],
                        'school_year' => $subjectData['school_year'],
                        'remarks' => $subjectData['remarks'] ?? null
                    ]);
                    $creditedSubjects[] = $creditedSubject;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Credited subjects saved successfully',
                'data' => $creditedSubjects
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error storing credited subjects: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save credited subjects'
            ], 500);
        }
    }

    /**
     * Get transferee student data including previous school and credited subjects
     */
    public function getTransfereeData($studentId)
    {
        try {
            $student = User::with([
                'transfereePreviousSchools',
                'transfereeCreditedSubjects.subject'
            ])->where('id', $studentId)
              ->where('student_type', 'transferee')
              ->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transferee student not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'student' => $student,
                    'previous_schools' => $student->transfereePreviousSchools,
                    'credited_subjects' => $student->transfereeCreditedSubjects,
                    'total_credited_subjects' => $student->getCreditedSubjectsCount(),
                    'total_credited_units' => $student->getTotalCreditedUnits()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting transferee data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transferee data'
            ], 500);
        }
    }

    /**
     * Get available subjects for credit assignment
     */
    public function getAvailableSubjects(Request $request)
    {
        try {
            $strandId = $request->query('strand_id');
            $semester = $request->query('semester');

            $query = Subject::query();

            if ($strandId) {
                $query->where('strand_id', $strandId);
            }

            if ($semester) {
                $query->where('semester', $semester);
            }

            $subjects = $query->with('strand')->get();

            return response()->json([
                'success' => true,
                'data' => $subjects
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting available subjects: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve subjects'
            ], 500);
        }
    }

    /**
     * Remove credited subject
     */
    public function removeCreditedSubject($creditId)
    {
        try {
            $credit = TransfereeCreditedSubject::findOrFail($creditId);
            $credit->delete();

            return response()->json([
                'success' => true,
                'message' => 'Credited subject removed successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error removing credited subject: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove credited subject'
            ], 500);
        }
    }

    /**
     * Get transferee statistics for dashboard
     */
    public function getTransfereeStatistics()
    {
        try {
            $stats = [
                'total_transferees' => User::where('student_type', 'transferee')->count(),
                'transferees_with_credits' => User::where('student_type', 'transferee')
                    ->whereHas('transfereeCreditedSubjects')
                    ->count(),
                'total_credited_subjects' => TransfereeCreditedSubject::count(),
                'average_credited_subjects' => TransfereeCreditedSubject::selectRaw('AVG(grade) as avg_grade')
                    ->first()->avg_grade ?? 0,
                'subjects_by_semester' => [
                    '1st' => TransfereeCreditedSubject::where('semester', '1st')->count(),
                    '2nd' => TransfereeCreditedSubject::where('semester', '2nd')->count()
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting transferee statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve statistics'
            ], 500);
        }
    }

    /**
     * Enroll transferee student with credited subjects in one action
     */
    public function enrollWithCreditedSubjects(Request $request)
    {
        // Debug authentication
        Log::info('TransfereeController::enrollWithCreditedSubjects called', [
            'user_id' => Auth::id(),
            'user_role' => Auth::user()->role,
            'request_data' => $request->all()
        ]);
        
        // Debug: Check if student exists
        $studentExists = User::where('id', $request->student_id)->where('role', 'student')->first();
        Log::info('Student existence check', [
            'requested_student_id' => $request->student_id,
            'student_exists' => $studentExists ? 'yes' : 'no',
            'student_name' => $studentExists ? $studentExists->name : 'N/A'
        ]);

        if (!$studentExists) {
            return redirect()->back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => 'Student Not Found',
                    'text' => 'The student with ID ' . $request->student_id . ' does not exist.',
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        }

        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'section_id' => 'required|exists:sections,id',
            'strand_id' => 'required|exists:strands,id',
            'credited_subjects' => 'required|array|min:1',
            'credited_subjects.*.subject_id' => 'required|exists:subjects,id',
            'credited_subjects.*.grade' => 'required|numeric|min:75|max:100',
            'credited_subjects.*.semester' => 'required|in:1st Semester,2nd Semester',
            'school_year' => 'required|string|max:20',
            'remarks' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            Log::error('TransfereeController validation failed', [
                'errors' => $validator->errors()->toArray(),
                'request_data' => $request->all()
            ]);
            return redirect()->back()->withErrors($validator)->withInput();
        }

        try {
            DB::beginTransaction();

            $studentId = $request->student_id;
            $student = User::find($studentId);

            // Verify this is a transferee student
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $studentId)
                ->first();
            
            $isTransferee = ($student && $student->student_type === 'transferee') || 
                           ($studentPersonalInfo && $studentPersonalInfo->student_status === 'Transferee');
            
            if (!$isTransferee) {
                return redirect()->back()->with([
                    'swal' => [
                        'type' => 'error',
                        'title' => 'Access Denied',
                        'text' => 'This function is only available for transferee students',
                        'icon' => 'error',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }

            // Get active school year
            $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return redirect()->back()->with([
                    'swal' => [
                        'type' => 'error',
                        'title' => 'No Active School Year',
                        'text' => 'No active school year found. Please contact the registrar.',
                        'icon' => 'error',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }

            // 1. Create or update enrollment record
            Log::info('Creating enrollment record', [
                'student_id' => $studentId,
                'school_year_id' => $activeSchoolYear->id,
                'section_id' => $request->section_id,
                'strand_id' => $request->strand_id
            ]);
            
            $enrollment = Enrollment::updateOrCreate(
                [
                    'student_id' => $studentId,
                    'school_year_id' => $activeSchoolYear->id
                ],
                [
                    'assigned_section_id' => $request->section_id,
                    'strand_id' => $request->strand_id,
                    'status' => 'enrolled',
                    'enrollment_date' => now(),
                    'enrolled_by' => Auth::id(),
                    'student_type' => 'transferee'
                ]
            );
            
            Log::info('Enrollment record created/updated', [
                'enrollment_id' => $enrollment->id,
                'status' => $enrollment->status,
                'assigned_section_id' => $enrollment->assigned_section_id
            ]);

            // 2. Store credited subjects with grades
            $creditedSubjects = [];
            
            Log::info('Processing credited subjects', [
                'student_id' => $studentId,
                'credited_subjects_count' => count($request->credited_subjects),
                'credited_subjects_data' => $request->credited_subjects
            ]);
            
            foreach ($request->credited_subjects as $subjectData) {
                Log::info('Processing individual credited subject', [
                    'student_id' => $studentId,
                    'subject_data' => $subjectData
                ]);
                
                // Remove existing credit for this subject if any
                $deletedCount = TransfereeCreditedSubject::where([
                    'student_id' => $studentId,
                    'subject_id' => $subjectData['subject_id']
                ])->delete();
                
                Log::info('Deleted existing credits', [
                    'student_id' => $studentId,
                    'subject_id' => $subjectData['subject_id'],
                    'deleted_count' => $deletedCount
                ]);

                // Create new credit record
                try {
                    $creditedSubject = TransfereeCreditedSubject::create([
                        'student_id' => $studentId,
                        'subject_id' => $subjectData['subject_id'],
                        'grade' => $subjectData['grade'],
                        'semester' => $subjectData['semester'],
                        'school_year' => $request->school_year,
                        'remarks' => $request->remarks
                    ]);

                    Log::info('Created credited subject record', [
                        'credited_subject_id' => $creditedSubject->id,
                        'student_id' => $studentId,
                        'subject_id' => $subjectData['subject_id'],
                        'grade' => $subjectData['grade'],
                        'semester' => $subjectData['semester']
                    ]);

                    $creditedSubjects[] = $creditedSubject;
                } catch (\Exception $e) {
                    Log::error('Failed to create credited subject record', [
                        'student_id' => $studentId,
                        'subject_data' => $subjectData,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    throw $e;
                }
            }

            // 3. Create class details for non-credited subjects in the assigned section
            $sectionSubjects = \App\Models\ClassSchedule::where('section_id', $request->section_id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->pluck('subject_id')
                ->unique();

            $creditedSubjectIds = collect($request->credited_subjects)->pluck('subject_id');

            foreach ($sectionSubjects as $subjectId) {
                if (!$creditedSubjectIds->contains($subjectId)) {
                    // Find the class for this subject and section
                    $class = \App\Models\ClassSchedule::where('section_id', $request->section_id)
                        ->where('subject_id', $subjectId)
                        ->where('school_year_id', $activeSchoolYear->id)
                        ->first();

                    if ($class) {
                        // Create class detail for non-credited subject
                        \App\Models\ClassDetail::updateOrCreate(
                            [
                                'class_id' => $class->id,
                                'enrollment_id' => $enrollment->id
                            ],
                            [
                                'student_id' => $studentPersonalInfo->id, // Use student_personal_info ID for foreign key
                                'section_id' => $request->section_id,
                                'is_enrolled' => true,
                                'enrolled_at' => now()
                            ]
                        );
                    }
                }
            }

            Log::info('About to commit transaction', [
                'student_id' => $studentId,
                'enrollment_id' => $enrollment->id,
                'credited_subjects_created' => count($creditedSubjects)
            ]);
            
            DB::commit();
            
            Log::info('Transaction committed successfully', [
                'student_id' => $studentId,
                'enrollment_id' => $enrollment->id
            ]);

            Log::info('Transferee student enrolled with credited subjects', [
                'student_id' => $studentId,
                'section_id' => $request->section_id,
                'credited_subjects_count' => count($creditedSubjects),
                'enrollment_id' => $enrollment->id
            ]);

            return redirect()->back()->with([
                'swal' => [
                    'type' => 'success',
                    'title' => 'Enrollment Successful!',
                    'text' => 'Transferee student enrolled successfully with ' . count($creditedSubjects) . ' credited subjects.',
                    'icon' => 'success',
                    'timer' => 3000,
                    'showConfirmButton' => false
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error enrolling transferee with credited subjects: ' . $e->getMessage(), [
                'student_id' => $request->student_id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => 'Enrollment Failed',
                    'text' => 'Failed to enroll student with credited subjects: ' . $e->getMessage(),
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        }
    }
}
