<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\GradeInputRequest;
use App\Models\TransfereeSubjectCredit;
use App\Models\TransfereeCreditedSubject;
use App\Models\TransfereePreviousSchool;
use App\Models\CertificateOfRegistration;
use App\Models\SummerClassSchedule;
use App\Models\SummerClass;

class RegistrarController extends Controller
{
    /**
     * Display registrar dashboard
     */
    public function dashboard()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return redirect()->route('login');
        }

        // Get dashboard statistics
        $stats = $this->getDashboardStats();

        return Inertia::render('Registrar/Dashboard', [
            'user' => $user,
            'stats' => $stats
        ]);
    }

    /**
     * Get dashboard statistics
     */
    private function getDashboardStats()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        return [
            'total_faculty' => User::where('role', 'faculty')->count(),
            'total_students' => User::where('role', 'student')->count(),
            'pending_enrollments' => $activeSchoolYear ? 
                Enrollment::where('school_year_id', $activeSchoolYear->id)
                    ->where('status', 'pending')->count() : 0,
            'pending_grades' => Grade::where('status', 'pending_registrar_approval')->count(),
            'pending_grade_requests' => $activeSchoolYear ? 
                GradeInputRequest::where('school_year_id', $activeSchoolYear->id)
                    ->where('status', 'pending')->count() : 0,
            'total_strands' => Strand::count(),
            'total_subjects' => Subject::count(),
            'total_sections' => Section::count()
        ];
    }

    /**
     * Faculty Management Page
     */
    public function facultyPage()
    {
        $faculty = User::where('role', 'faculty')
            ->orWhere('role', 'coordinator')
            ->with('assignedStrand')
            ->orderBy('created_at', 'desc')
            ->get();

        $strands = Strand::orderBy('name')->get();

        return Inertia::render('Registrar/Faculty', [
            'faculty' => $faculty,
            'strands' => $strands
        ]);
    }

    /**
     * Create new faculty account
     */
    public function createFaculty(Request $request)
    {
        $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'assigned_strand_id' => 'nullable|exists:strands,id'
        ]);

        try {
            // Generate secure password
            $password = $this->generateSecurePassword();
            
            // Create faculty user (always create as faculty, can be promoted to coordinator later)
            $faculty = User::create([
                'firstname' => $request->firstname,
                'lastname' => $request->lastname,
                'email' => $request->email,
                'password' => Hash::make($password),
                'role' => 'faculty',
                'is_coordinator' => false,
                'assigned_strand_id' => $request->assigned_strand_id ?: null,
                'password_change_required' => true,
                'generated_password' => $password,
                'password_changed' => false
            ]);

            // Send email notification
            $this->sendFacultyCredentials($faculty, $password);

            Log::info('Faculty account created', [
                'faculty_id' => $faculty->id,
                'email' => $faculty->email,
                'created_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Faculty account created successfully. Login credentials sent to email.',
                'faculty' => $faculty
            ]);

        } catch (\Exception $e) {
            Log::error('Faculty creation failed', [
                'error' => $e->getMessage(),
                'email' => $request->email
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create faculty account: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate secure password
     */
    private function generateSecurePassword()
    {
        return Str::random(2) . rand(10, 99) . Str::random(2) . rand(10, 99);
    }

    /**
     * Send faculty credentials via email
     */
    private function sendFacultyCredentials($faculty, $password)
    {
        try {
            Mail::send('emails.faculty-credentials', [
                'faculty' => $faculty,
                'password' => $password,
                'login_url' => url('/login')
            ], function ($message) use ($faculty) {
                $message->to($faculty->email)
                    ->subject('ONSTS - Faculty Account Created');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send faculty credentials email', [
                'faculty_id' => $faculty->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Strand Management Page
     */
    public function strandsPage()
    {
        $strands = Strand::orderBy('name')->get();

        return Inertia::render('Registrar/Strands', [
            'strands' => $strands
        ]);
    }

    /**
     * Create new strand
     */
    public function createStrand(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:strands,code',
            'description' => 'nullable|string'
        ]);

        $strand = Strand::create($request->all());

        Log::info('Strand created', [
            'strand_id' => $strand->id,
            'created_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Strand created successfully',
            'strand' => $strand
        ]);
    }

    /**
     * Update strand
     */
    public function updateStrand(Request $request, $id)
    {
        $strand = Strand::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:strands,code,' . $id,
            'description' => 'nullable|string'
        ]);

        $strand->update($request->all());

        Log::info('Strand updated', [
            'strand_id' => $strand->id,
            'updated_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Strand updated successfully',
            'strand' => $strand
        ]);
    }

    /**
     * Subject Management Page
     */
    public function subjectsPage()
    {
        $subjects = Subject::with('strand')->orderBy('name')->get();
        $strands = Strand::all();

        return Inertia::render('Registrar/Subjects', [
            'subjects' => $subjects,
            'strands' => $strands
        ]);
    }

    /**
     * Create new subject
     */
    public function createSubject(Request $request)
    {
        $request->validate([
            'subject_name' => 'required|string|max:255',
            'subject_code' => 'required|string|max:20|unique:subjects,code',
            'strand_id' => 'nullable|exists:strands,id',
            'semester' => 'required|in:1,2',
            'grade_level' => 'required|in:11,12'
        ]);

        $subject = Subject::create([
            'name' => $request->subject_name,
            'code' => $request->subject_code,
            'strand_id' => $request->strand_id,
            'semester' => $request->semester,
            'year_level' => $request->grade_level,
            'is_active' => true
        ]);

        Log::info('Subject created', [
            'subject_id' => $subject->id,
            'created_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject created successfully',
            'subject' => $subject->load('strand')
        ]);
    }

    /**
     * Enrollment Management Page
     */
    public function enrollmentPage()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Registrar/Enrollment', [
                'enrollments' => [],
                'strands' => [],
                'sections' => [],
                'message' => 'No active school year found'
            ]);
        }

        $enrollments = Enrollment::with(['student', 'strand', 'section'])
            ->where('school_year_id', $activeSchoolYear->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $strands = Strand::all();
        $sections = Section::where('school_year_id', $activeSchoolYear->id)->get();

        return Inertia::render('Registrar/Enrollment', [
            'enrollments' => $enrollments,
            'strands' => $strands,
            'sections' => $sections,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    /**
     * Approve enrollment
     */
    public function approveEnrollment(Request $request, $id)
    {
        $enrollment = Enrollment::findOrFail($id);

        $request->validate([
            'strand_id' => 'required|exists:strands,id',
            'assigned_section_id' => 'required|exists:sections,id'
        ]);

        // Check section capacity before approval
        $section = Section::findOrFail($request->assigned_section_id);
        if (!$section->hasAvailableSlots()) {
            return response()->json([
                'success' => false,
                'message' => "Cannot approve enrollment. Section '{$section->section_name}' is at full capacity ({$section->max_capacity} students).",
            ], 400);
        }

        $enrollment->update([
            'status' => 'approved',
            'strand_id' => $request->strand_id,
            'assigned_section_id' => $request->assigned_section_id,
            'approved_at' => now(),
            'approved_by' => Auth::id()
        ]);

        // Update section capacity status after enrollment
        $section->updateCapacityStatus();

        Log::info('Enrollment approved', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $enrollment->student_id,
            'approved_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Enrollment approved successfully'
        ]);
    }

    /**
     * Grade Approval Management Page
     */
    public function gradeApprovalPage()
    {
        $pendingGrades = Grade::with(['student', 'subject', 'faculty'])
            ->where('status', 'pending_registrar_approval')
            ->get()
            ->map(function ($grade) {
                return [
                    'id' => $grade->id,
                    'student' => [
                        'id' => $grade->student->id ?? null,
                        'firstname' => $grade->student->firstname ?? 'Unknown',
                        'lastname' => $grade->student->lastname ?? 'Student',
                        'email' => $grade->student->email ?? 'N/A',
                    ],
                    'subject' => [
                        'id' => $grade->subject->id ?? null,
                        'subject_name' => $grade->subject->name ?? 'Unknown Subject',
                        'subject_code' => $grade->subject->code ?? 'N/A',
                    ],
                    'faculty' => [
                        'id' => $grade->faculty->id ?? null,
                        'firstname' => $grade->faculty->firstname ?? 'Unknown',
                        'lastname' => $grade->faculty->lastname ?? 'Faculty',
                    ],
                    // Map database fields to frontend expected fields
                    'prelim' => $grade->first_quarter,
                    'midterm' => $grade->second_quarter,
                    'finals' => $grade->semester_grade,
                    'created_at' => $grade->created_at,
                    'updated_at' => $grade->updated_at,
                    'status' => $grade->status,
                ];
            });

        return Inertia::render('Registrar/GradeApproval', [
            'pendingGrades' => $pendingGrades
        ]);
    }

    /**
     * Display pending grades for approval
     */
    public function pendingGrades()
    {
        try {
            // Log the query for debugging
            Log::info('Fetching pending grades for registrar approval');
            
            $pendingGrades = Grade::with(['student.studentPersonalInfo', 'subject', 'faculty', 'schoolYear'])
                ->where('status', 'pending_registrar_approval')
                ->orderBy('created_at', 'desc')
                ->get();
                
            Log::info('Pending grades query result', [
                'total_found' => $pendingGrades->count(),
                'status_filter' => 'pending_registrar_approval'
            ]);
            
            $pendingGrades = $pendingGrades->map(function ($grade) {
                    // Log individual grade data for debugging
                    Log::info('Processing grade for approval', [
                        'grade_id' => $grade->id,
                        'student_id' => $grade->student_id,
                        'first_quarter' => $grade->first_quarter,
                        'second_quarter' => $grade->second_quarter,
                        'semester_grade' => $grade->semester_grade,
                        'status' => $grade->status,
                        'created_at' => $grade->created_at,
                        'updated_at' => $grade->updated_at
                    ]);

                    return [
                        'id' => $grade->id,
                        // Nested objects for detailed access
                        'student' => [
                            'id' => $grade->student->id ?? null,
                            'firstname' => $grade->student->firstname ?? 'Unknown',
                            'lastname' => $grade->student->lastname ?? 'Student',
                            'email' => $grade->student->email ?? 'N/A',
                            'lrn' => $grade->student->studentPersonalInfo->lrn ?? 'N/A',
                        ],
                        'subject' => [
                            'id' => $grade->subject->id ?? null,
                            'subject_name' => $grade->subject->name ?? 'Unknown Subject',
                            'subject_code' => $grade->subject->code ?? 'N/A',
                        ],
                        'faculty' => [
                            'id' => $grade->faculty->id ?? null,
                            'firstname' => $grade->faculty->firstname ?? 'Unknown',
                            'lastname' => $grade->faculty->lastname ?? 'Faculty',
                        ],
                        // Flat properties for frontend compatibility
                        'student_name' => ($grade->student->firstname ?? 'Unknown') . ' ' . ($grade->student->lastname ?? 'Student'),
                        'subject_name' => $grade->subject->name ?? 'Unknown Subject',
                        'faculty_name' => ($grade->faculty->firstname ?? 'Unknown') . ' ' . ($grade->faculty->lastname ?? 'Faculty'),
                        'semester' => $grade->semester ?? '1st',
                        // Map Philippine SHS quarters to expected format
                        'prelim' => $grade->first_quarter ?? null,  // Q1 or Q3 depending on semester
                        'midterm' => $grade->second_quarter ?? null, // Q2 or Q4 depending on semester
                        'finals' => $grade->areBothQuartersComplete() ? $grade->semester_grade : null,  // Only show final if both quarters complete
                        // Also keep original fields for compatibility
                        'first_quarter' => $grade->first_quarter ?? null,
                        'second_quarter' => $grade->second_quarter ?? null,
                        'semester_grade' => $grade->semester_grade ?? null,
                        'remarks' => $grade->remarks ?? '',
                        'status' => $grade->status ?? 'pending_approval',
                        'school_year' => ($grade->schoolYear->year_start ?? '2024') . '-' . ($grade->schoolYear->year_end ?? '2025'),
                        'created_at' => $grade->created_at ? $grade->created_at->toISOString() : null,
                        'updated_at' => $grade->updated_at ? $grade->updated_at->toISOString() : null,
                        'submitted_at' => $grade->updated_at ? $grade->updated_at->toISOString() : null,
                    ];
                });

            return Inertia::render('Registrar/GradeApproval', [
                'pendingGrades' => $pendingGrades,
                'totalPending' => $pendingGrades->count(),
                'summary' => [
                    'total_pending' => $pendingGrades->count(),
                    'first_semester' => $pendingGrades->where('semester', '1st')->count(),
                    'second_semester' => $pendingGrades->where('semester', '2nd')->count(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching pending grades', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Inertia::render('Registrar/GradeApproval', [
                'pendingGrades' => [],
                'totalPending' => 0,
                'error' => 'Failed to load pending grades. Please try again.',
                'summary' => [
                    'total_pending' => 0,
                    'first_semester' => 0,
                    'second_semester' => 0,
                ]
            ]);
        }
    }

    /**
     * Approve grades
     */
    public function approveGrades(Request $request)
    {
        try {
            $request->validate([
                'grade_ids' => 'required|array',
                'grade_ids.*' => 'exists:grades,id',
                'action' => 'required|in:approve,reject',
                'remarks' => 'nullable|string'
            ]);

            $grades = Grade::whereIn('id', $request->grade_ids)->get();

            if ($grades->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No grades found with the provided IDs'
                ], 404);
            }

            foreach ($grades as $grade) {
                $grade->update([
                    'status' => $request->action === 'approve' ? 'approved' : 'rejected',
                    'approved_by' => Auth::id(),
                    'approved_at' => now()
                ]);
                
                // Log the approval action for audit trail
                Log::info('Grade approval action', [
                    'grade_id' => $grade->id,
                    'student_id' => $grade->student_id,
                    'action' => $request->action,
                    'approved_by' => Auth::id(),
                    'grade_visible_to_student' => $request->action === 'approve'
                ]);
                
                // Log remarks separately since approval_remarks field doesn't exist
                if ($request->remarks) {
                    Log::info('Grade approval with remarks', [
                        'grade_id' => $grade->id,
                        'action' => $request->action,
                        'remarks' => $request->remarks,
                        'approved_by' => Auth::id()
                    ]);
                }
            }

            Log::info('Grades ' . $request->action . 'd', [
                'grade_ids' => $request->grade_ids,
                'action' => $request->action,
                'approved_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Grades ' . $request->action . 'd successfully'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Grade approval validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('Grade approval failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process grade approval. Please try again.'
            ], 500);
        }
    }

    /**
     * Reports Page
     */
    public function reportsPage()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        $reports = [
            'enrollment_by_strand' => $this->getEnrollmentByStrand($activeSchoolYear),
            'grade_approval_summary' => $this->getGradeApprovalSummary(),
            'faculty_summary' => $this->getFacultySummary()
        ];

        // Get filter options
        $filterOptions = [
            'schoolYears' => SchoolYear::orderBy('year_start', 'desc')->get(['id', 'year', 'year_start', 'year_end']),
            'strands' => DB::table('strands')->select('id', 'name', 'code')->orderBy('name')->get(),
            'sections' => DB::table('sections')->select('id', 'section_name', 'strand_id')->orderBy('section_name')->get(),
            'subjects' => DB::table('subjects')->select('id', 'name', 'code')->orderBy('name')->get(),
            'semesters' => ['1st', '2nd']
        ];

        return Inertia::render('Registrar/Reports', [
            'reports' => $reports,
            'activeSchoolYear' => $activeSchoolYear,
            'filterOptions' => $filterOptions
        ]);
    }

    /**
     * Get enrollment statistics by strand
     */
    private function getEnrollmentByStrand($schoolYear)
    {
        if (!$schoolYear) return [];

        try {
            // Check which strand column exists in enrollments table
            $strandColumn = 'strand_id'; // Default to strand_id
            
            if (Schema::hasColumn('enrollments', 'strand_id')) {
                $strandColumn = 'strand_id';
            } elseif (Schema::hasColumn('enrollments', 'assigned_strand_id')) {
                $strandColumn = 'assigned_strand_id';
            } else {
                // If neither column exists, return empty array
                Log::warning('Neither strand_id nor assigned_strand_id column found in enrollments table');
                return [];
            }

            return DB::table('enrollments')
                ->join('strands', "enrollments.{$strandColumn}", '=', 'strands.id')
                ->where('enrollments.school_year_id', $schoolYear->id)
                ->select('strands.name', 'strands.code', 
                    DB::raw('COUNT(*) as total'),
                    DB::raw('SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END) as approved'),
                    DB::raw('SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending'))
                ->groupBy('strands.id', 'strands.name', 'strands.code')
                ->get();
        } catch (\Exception $e) {
            Log::error('Error in getEnrollmentByStrand: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get grade approval summary
     */
    private function getGradeApprovalSummary()
    {
        return DB::table('grades')
            ->select('status',
                DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();
    }

    /**
     * Get faculty summary
     */
    private function getFacultySummary()
    {
        return [
            'total_faculty' => User::where('role', 'faculty')->count(),
            'coordinators' => User::where('is_coordinator', true)->count(),
            'password_change_required' => User::where('password_change_required', true)->count()
        ];
    }

    /**
     * Update faculty member
     */
    public function updateFaculty(Request $request, $id)
    {
        $faculty = User::findOrFail($id);

        $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'assigned_strand_id' => 'nullable|exists:strands,id'
        ]);

        $faculty->update([
            'firstname' => $request->firstname,
            'lastname' => $request->lastname,
            'email' => $request->email,
            'assigned_strand_id' => $request->assigned_strand_id
        ]);

        Log::info('Faculty updated', [
            'faculty_id' => $faculty->id,
            'updated_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Faculty updated successfully',
            'faculty' => $faculty
        ]);
    }

    /**
     * Delete faculty member
     */
    public function deleteFaculty($id)
    {
        $faculty = User::findOrFail($id);

        // Soft delete by disabling the account
        $faculty->update(['is_disabled' => true]);

        Log::info('Faculty disabled', [
            'faculty_id' => $faculty->id,
            'disabled_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Faculty account disabled successfully'
        ]);
    }

    /**
     * Delete strand
     */
    public function deleteStrand($id)
    {
        $strand = Strand::findOrFail($id);

        // Check if strand has subjects or students
        $hasSubjects = Subject::where('strand_id', $id)->exists();
        $hasStudents = Enrollment::where('strand_id', $id)->exists();

        if ($hasSubjects || $hasStudents) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete strand. It has associated subjects or students.'
            ], 400);
        }

        $strand->delete();

        Log::info('Strand deleted', [
            'strand_id' => $id,
            'deleted_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Strand deleted successfully'
        ]);
    }

    /**
     * Update subject
     */
    public function updateSubject(Request $request, $id)
    {
        $subject = Subject::findOrFail($id);

        $request->validate([
            'subject_name' => 'required|string|max:255',
            'subject_code' => 'required|string|max:20|unique:subjects,code,' . $id,
            'strand_id' => 'nullable|exists:strands,id',
            'semester' => 'required|in:1,2',
            'grade_level' => 'required|in:11,12'
        ]);

        $subject->update([
            'name' => $request->subject_name,
            'code' => $request->subject_code,
            'strand_id' => $request->strand_id,
            'semester' => $request->semester,
            'year_level' => $request->grade_level
        ]);

        Log::info('Subject updated', [
            'subject_id' => $subject->id,
            'updated_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject updated successfully',
            'subject' => $subject->load('strand')
        ]);
    }

    /**
     * Delete subject
     */
    public function deleteSubject($id)
    {
        $subject = Subject::findOrFail($id);

        // Check if subject has grades or schedules
        $hasGrades = Grade::where('subject_id', $id)->exists();
        
        if ($hasGrades) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete subject. It has associated grades or schedules.'
            ], 400);
        }

        $subject->delete();

        Log::info('Subject deleted', [
            'subject_id' => $id,
            'deleted_by' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject deleted successfully'
        ]);
    }

    /**
     * Reject an enrollment
     */
    public function rejectEnrollment(Request $request, $id)
    {
        $enrollment = Enrollment::findOrFail($id);

        $request->validate([
            'rejection_reason' => 'required|string|max:500'
        ]);

        // Get the previously assigned section to update capacity
        $previousSection = null;
        if ($enrollment->assigned_section_id) {
            $previousSection = Section::find($enrollment->assigned_section_id);
        }

        $enrollment->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'rejected_at' => now(),
            'rejected_by' => Auth::id(),
            'assigned_section_id' => null // Remove section assignment on rejection
        ]);

        // Update capacity status of the previously assigned section
        if ($previousSection) {
            $previousSection->updateCapacityStatus();
        }

        Log::info('Enrollment rejected', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $enrollment->student_id,
            'rejected_by' => Auth::id(),
            'reason' => $request->rejection_reason,
            'previous_section_id' => $previousSection ? $previousSection->id : null
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Enrollment rejected successfully'
        ]);
    }

    /**
     * Export report
     */
    public function exportReport($type, Request $request)
    {
        $format = $request->query('format', 'excel');
        $range = $request->query('range', 'current');

        // This would typically use Laravel Excel or similar package
        // For now, return a JSON response
        return response()->json([
            'success' => true,
            'message' => "Export functionality for {$type} report in {$format} format will be implemented",
            'type' => $type,
            'format' => $format,
            'range' => $range
        ]);
    }

    /**
     * Send email to faculty
     */
    public function sendFacultyEmail($id)
    {
        $faculty = User::findOrFail($id);

        // Generate password if it doesn't exist
        if (!$faculty->generated_password) {
            $password = $this->generateSecurePassword();
            $faculty->update([
                'generated_password' => $password,
                'password' => Hash::make($password),
                'password_change_required' => true,
                'password_changed' => false
            ]);
            
            Log::info('Generated new password for faculty', [
                'faculty_id' => $faculty->id,
                'generated_by' => Auth::id()
            ]);
        }

        try {
            $this->sendFacultyCredentials($faculty, $faculty->generated_password);

            Log::info('Faculty credentials email resent', [
                'faculty_id' => $faculty->id,
                'sent_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Email sent successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to resend faculty credentials email', [
                'faculty_id' => $faculty->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send email'
            ], 500);
        }
    }

    /**
     * Sections Management Page
     */
    public function sectionsPage()
    {
        $sections = Section::with(['strand', 'adviser', 'schoolYear'])->orderBy('section_name')->get();
        
        // Add capacity information to each section
        $sections->each(function ($section) {
            $section->capacity_status = $section->capacity_status;
            $section->current_enrollment = $section->getCurrentEnrollmentCount();
        });
        $strands = Strand::all();
        
        // Get faculty and coordinators with proper filtering and debugging
        $faculty = User::whereIn('role', ['faculty', 'coordinator'])
            ->where(function($query) {
                $query->where('is_disabled', false)
                      ->orWhereNull('is_disabled'); // Include users where is_disabled is null
            })
            ->orderBy('firstname')
            ->orderBy('lastname')
            ->get(['id', 'firstname', 'lastname', 'email', 'role', 'is_coordinator', 'assigned_strand_id']);
        
        // Debug logging for faculty data
        Log::info('Faculty data for sections dropdown:', [
            'faculty_count' => $faculty->count(),
            'faculty_data' => $faculty->toArray()
        ]);
        
        // Filter school years based on semester progression rules
        $schoolYears = $this->getAvailableSchoolYears();

        return Inertia::render('Registrar/Sections', [
            'sections' => $sections,
            'strands' => $strands,
            'faculty' => $faculty,
            'schoolYears' => $schoolYears
        ]);
    }

    /**
     * Get available school years based on semester progression rules
     */
    private function getAvailableSchoolYears()
    {
        // For section creation, allow all school years regardless of dates
        // Coordinators should be able to create sections for future semesters
        return SchoolYear::orderBy('year_start', 'desc')
            ->orderBy('semester', 'asc')
            ->get();
    }

    /**
     * Check if a school year is available based on semester progression rules
     */
    private function isSchoolYearAvailable($schoolYear)
    {
        // Always allow 1st semester
        if ($schoolYear->semester === '1st Semester') {
            return true;
        }
        
        // For 2nd semester, check if 1st semester of the same academic year has ended
        if ($schoolYear->semester === '2nd Semester') {
            $firstSemester = SchoolYear::where('year_start', $schoolYear->year_start)
                ->where('year_end', $schoolYear->year_end)
                ->where('semester', '1st Semester')
                ->first();

            if ($firstSemester) {
                // Check if 1st semester has ended (current date is after 1st semester end date)
                return now()->gt($firstSemester->end_date);
            } else {
                // If no 1st semester exists for this academic year, allow 2nd semester
                return true;
            }
        }
        
        // Allow other semester types (if any)
        return true;
    }

    /**
     * Create a new section
     */
    public function createSection(Request $request)
    {
        try {
            $request->validate([
                'section_name' => 'required|string|max:255',
                'year_level' => 'required|integer|min:11|max:12',
                'strand_id' => 'required|exists:strands,id',
                'adviser_id' => 'nullable|exists:users,id',
                'school_year_id' => 'required|exists:school_years,id',
                'max_capacity' => 'required|integer|min:1|max:100',
            ]);

            // Validate semester progression rules
            $selectedSchoolYear = SchoolYear::findOrFail($request->school_year_id);
            if (!$this->isSchoolYearAvailable($selectedSchoolYear)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot select 2nd semester until the 1st semester of the same academic year has ended.',
                ], 400);
            }

            // Check if section name already exists for the same year level and school year
            $existingSection = Section::where('section_name', $request->section_name)
                ->where('year_level', $request->year_level)
                ->where('school_year_id', $request->school_year_id)
                ->first();

            if ($existingSection) {
                return response()->json([
                    'success' => false,
                    'message' => 'Section name already exists for this year level and school year.',
                ], 400);
            }

            $section = Section::create([
                'section_name' => $request->section_name,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
                'adviser_id' => $request->adviser_id,
                'school_year_id' => $request->school_year_id,
                'max_capacity' => $request->max_capacity,
                'is_full' => false,
            ]);

            Log::info('Section created', [
                'section_id' => $section->id,
                'section_name' => $section->section_name,
                'created_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Section created successfully.',
                'section' => $section->load(['strand', 'adviser', 'schoolYear']),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create section', [
                'error' => $e->getMessage(),
                'created_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create section. Please try again.',
            ], 500);
        }
    }

    /**
     * Update a section
     */
    public function updateSection(Request $request, $id)
    {
        try {
            $section = Section::findOrFail($id);

            $request->validate([
                'section_name' => 'required|string|max:255',
                'year_level' => 'required|integer|min:11|max:12',
                'strand_id' => 'required|exists:strands,id',
                'adviser_id' => 'nullable|exists:users,id',
                'school_year_id' => 'required|exists:school_years,id',
                'max_capacity' => 'required|integer|min:1|max:100',
            ]);

            // Validate semester progression rules
            $selectedSchoolYear = SchoolYear::findOrFail($request->school_year_id);
            if (!$this->isSchoolYearAvailable($selectedSchoolYear)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot select 2nd semester until the 1st semester of the same academic year has ended.',
                ], 400);
            }

            // Check if section name already exists for the same year level and school year (excluding current section)
            $existingSection = Section::where('section_name', $request->section_name)
                ->where('year_level', $request->year_level)
                ->where('school_year_id', $request->school_year_id)
                ->where('id', '!=', $id)
                ->first();

            if ($existingSection) {
                return response()->json([
                    'success' => false,
                    'message' => 'Section name already exists for this year level and school year.',
                ], 400);
            }

            // Check if capacity is being reduced and if it would exceed current enrollment
            $currentEnrollment = $section->getCurrentEnrollmentCount();
            if ($request->max_capacity < $currentEnrollment) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot reduce capacity to {$request->max_capacity}. Current enrollment is {$currentEnrollment} students.",
                ], 400);
            }

            $section->update([
                'section_name' => $request->section_name,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
                'adviser_id' => $request->adviser_id,
                'school_year_id' => $request->school_year_id,
                'max_capacity' => $request->max_capacity,
            ]);

            // Update capacity status after changing capacity
            $section->updateCapacityStatus();

            Log::info('Section updated', [
                'section_id' => $section->id,
                'section_name' => $section->section_name,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Section updated successfully.',
                'section' => $section->fresh()->load(['strand', 'adviser', 'schoolYear']),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update section', [
                'error' => $e->getMessage(),
                'section_id' => $id,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update section. Please try again.',
            ], 500);
        }
    }

    /**
     * Delete a section
     */
    public function deleteSection($id)
    {
        try {
            $section = Section::findOrFail($id);

            // Check if section has enrolled students
            $hasStudents = $section->enrollments()->count() > 0;

            if ($hasStudents) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete section. It has enrolled students.',
                ], 400);
            }

            $sectionName = $section->section_name;
            $section->delete();

            Log::info('Section deleted', [
                'section_id' => $id,
                'section_name' => $sectionName,
                'deleted_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Section deleted successfully.',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete section', [
                'error' => $e->getMessage(),
                'section_id' => $id,
                'deleted_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete section. Please try again.',
            ], 500);
        }
    }

    /**
     * School Years Management Page
     */
    public function schoolYearsPage()
    {
        $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();

        return Inertia::render('Registrar/SchoolYears', [
            'schoolYears' => $schoolYears
        ]);
    }

    /**
     * Create a new school year
     */
    public function createSchoolYear(Request $request)
    {
        try {
            Log::info('School year creation attempt', [
                'request_data' => $request->all(),
                'user_id' => Auth::id(),
            ]);
            // Semester-specific validation rules
            $rules = [
                'year_start' => 'required|integer|min:2020|max:2050',
                'year_end' => 'required|integer|min:2020|max:2050|gt:year_start',
                'semester' => 'required|in:1st Semester,2nd Semester',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'enrollment_start_date' => 'required|date',  // ← FIXED: Use new field names
                'enrollment_end_date' => 'required|date|after:enrollment_start_date', // ← FIXED: Use new field names
                'grading_deadline' => 'required|date',
                'is_active' => 'boolean',
                'is_enrollment_open' => 'boolean',
            ];

            // Add semester-specific quarter validation
            if ($request->semester === '1st Semester') {
                $rules['quarter_1_start'] = 'required|date';
                $rules['quarter_1_end'] = 'required|date|after:quarter_1_start';
                $rules['quarter_2_start'] = 'required|date|after:quarter_1_end';
                $rules['quarter_2_end'] = 'required|date|after:quarter_2_start';
                $rules['quarter_3_start'] = 'nullable|date';
                $rules['quarter_3_end'] = 'nullable|date';
                $rules['quarter_4_start'] = 'nullable|date';
                $rules['quarter_4_end'] = 'nullable|date';
            } else { // 2nd Semester
                $rules['quarter_1_start'] = 'nullable|date';
                $rules['quarter_1_end'] = 'nullable|date';
                $rules['quarter_2_start'] = 'nullable|date';
                $rules['quarter_2_end'] = 'nullable|date';
                $rules['quarter_3_start'] = 'required|date';
                $rules['quarter_3_end'] = 'required|date|after:quarter_3_start';
                $rules['quarter_4_start'] = 'required|date|after:quarter_3_end';
                $rules['quarter_4_end'] = 'required|date|after:quarter_4_start';
            }

            $request->validate($rules);

            // If setting as active, deactivate other school years
            if ($request->is_active) {
                SchoolYear::where('is_active', true)->update(['is_active' => false]);
            }

            $schoolYear = SchoolYear::create([
                'year_start' => $request->year_start,
                'year_end' => $request->year_end,
                'semester' => $request->semester,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'enrollment_start_date' => $request->enrollment_start_date,  // New field
                'enrollment_end_date' => $request->enrollment_end_date,      // New field
                'enrollment_start' => $request->enrollment_start_date,       // Sync old field
                'enrollment_end' => $request->enrollment_end_date,           // Sync old field
                'quarter_1_start' => $request->quarter_1_start ?: null,
                'quarter_1_end' => $request->quarter_1_end ?: null,
                'quarter_2_start' => $request->quarter_2_start ?: null,
                'quarter_2_end' => $request->quarter_2_end ?: null,
                'quarter_3_start' => $request->quarter_3_start ?: null,
                'quarter_3_end' => $request->quarter_3_end ?: null,
                'quarter_4_start' => $request->quarter_4_start ?: null,
                'quarter_4_end' => $request->quarter_4_end ?: null,
                'grading_deadline' => $request->grading_deadline,
                'is_active' => $request->boolean('is_active', false),
                'is_current_academic_year' => $request->boolean('is_active', false),
                'is_enrollment_open' => $request->boolean('is_enrollment_open', false),
            ]);

            Log::info('School year created', [
                'school_year_id' => $schoolYear->id,
                'year' => $schoolYear->year_start . '-' . $schoolYear->year_end,
                'semester' => $schoolYear->semester,
                'created_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'School year created successfully.',
                'schoolYear' => $schoolYear,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create school year', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
                'created_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create school year: ' . $e->getMessage(),
                'debug' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Update a school year
     */
    public function updateSchoolYear(Request $request, $id)
    {
        try {
            $schoolYear = SchoolYear::findOrFail($id);

            // Semester-specific validation rules
            $rules = [
                'year_start' => 'required|integer|min:2020|max:2050',
                'year_end' => 'required|integer|min:2020|max:2050|gt:year_start',
                'semester' => 'required|in:1st Semester,2nd Semester',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'enrollment_start' => 'nullable|date',
                'enrollment_end' => 'nullable|date|after:enrollment_start',
                'grading_deadline' => 'nullable|date',
                'is_active' => 'boolean',
                'is_enrollment_open' => 'boolean',
            ];

            // Add semester-specific quarter validation
            if ($request->semester === '1st Semester') {
                $rules['quarter_1_start'] = 'required|date';
                $rules['quarter_1_end'] = 'required|date|after:quarter_1_start';
                $rules['quarter_2_start'] = 'required|date|after:quarter_1_end';
                $rules['quarter_2_end'] = 'required|date|after:quarter_2_start';
                $rules['quarter_3_start'] = 'nullable|date';
                $rules['quarter_3_end'] = 'nullable|date';
                $rules['quarter_4_start'] = 'nullable|date';
                $rules['quarter_4_end'] = 'nullable|date';
            } else { // 2nd Semester
                $rules['quarter_1_start'] = 'nullable|date';
                $rules['quarter_1_end'] = 'nullable|date';
                $rules['quarter_2_start'] = 'nullable|date';
                $rules['quarter_2_end'] = 'nullable|date';
                $rules['quarter_3_start'] = 'required|date';
                $rules['quarter_3_end'] = 'required|date|after:quarter_3_start';
                $rules['quarter_4_start'] = 'required|date|after:quarter_3_end';
                $rules['quarter_4_end'] = 'required|date|after:quarter_4_start';
            }

            $request->validate($rules);

            // If setting as active, deactivate other school years
            if ($request->is_active && !$schoolYear->is_active) {
                SchoolYear::where('is_active', true)->where('id', '!=', $id)->update(['is_active' => false]);
            }

            $updateData = [
                'year_start' => $request->year_start,
                'year_end' => $request->year_end,
                'semester' => $request->semester,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'quarter_1_start' => $request->quarter_1_start ?: null,
                'quarter_1_end' => $request->quarter_1_end ?: null,
                'quarter_2_start' => $request->quarter_2_start ?: null,
                'quarter_2_end' => $request->quarter_2_end ?: null,
                'quarter_3_start' => $request->quarter_3_start ?: null,
                'quarter_3_end' => $request->quarter_3_end ?: null,
                'quarter_4_start' => $request->quarter_4_start ?: null,
                'quarter_4_end' => $request->quarter_4_end ?: null,
                'is_active' => $request->boolean('is_active', false),
                'is_current_academic_year' => $request->boolean('is_active', false),
                'is_enrollment_open' => $request->boolean('is_enrollment_open', false),
            ];

            // Only update enrollment dates if provided
            if ($request->has('enrollment_start')) {
                $updateData['enrollment_start'] = $request->enrollment_start;
                $updateData['enrollment_start_date'] = $request->enrollment_start;
            }
            if ($request->has('enrollment_end')) {
                $updateData['enrollment_end'] = $request->enrollment_end;
                $updateData['enrollment_end_date'] = $request->enrollment_end;
            }
            if ($request->has('grading_deadline')) {
                $updateData['grading_deadline'] = $request->grading_deadline;
            }

            $schoolYear->update($updateData);

            Log::info('School year updated', [
                'school_year_id' => $schoolYear->id,
                'year' => $schoolYear->year_start . '-' . $schoolYear->year_end,
                'semester' => $schoolYear->semester,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'School year updated successfully.',
                'schoolYear' => $schoolYear->fresh(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update school year', [
                'error' => $e->getMessage(),
                'school_year_id' => $id,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update school year. Please try again.',
            ], 500);
        }
    }

    /**
     * Delete a school year
     */
    public function deleteSchoolYear($id)
    {
        try {
            $schoolYear = SchoolYear::findOrFail($id);

            // Check if school year has associated data
            $hasEnrollments = $schoolYear->enrollments()->count() > 0;
            $hasGrades = $schoolYear->grades()->count() > 0;
            $hasSubjects = Subject::where('school_year_id', $id)->count() > 0;

            if ($hasEnrollments || $hasGrades || $hasSubjects) {
                $associations = [];
                if ($hasEnrollments) $associations[] = 'enrollments';
                if ($hasGrades) $associations[] = 'grades';
                if ($hasSubjects) $associations[] = 'subjects';
                
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete school year. It has associated ' . implode(', ', $associations) . '. Please remove or reassign these records first.',
                ], 400);
            }

            $yearInfo = $schoolYear->year_start . '-' . $schoolYear->year_end . ' (' . $schoolYear->semester . ')';
            $schoolYear->delete();

            Log::info('School year deleted', [
                'school_year_id' => $id,
                'year_info' => $yearInfo,
                'deleted_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'School year deleted successfully.',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete school year', [
                'error' => $e->getMessage(),
                'school_year_id' => $id,
                'deleted_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete school year. Please try again.',
            ], 500);
        }
    }

    /**
     * Toggle school year active status
     */
    public function toggleSchoolYearStatus(Request $request, $id)
    {
        try {
            $schoolYear = SchoolYear::findOrFail($id);
            
            $request->validate([
                'is_active' => 'required|boolean',
            ]);

            // If activating, deactivate other school years
            if ($request->is_active) {
                SchoolYear::where('is_active', true)->where('id', '!=', $id)->update(['is_active' => false]);
            }

            $schoolYear->update([
                'is_active' => $request->is_active,
                'is_current_academic_year' => $request->is_active,
            ]);

            Log::info('School year status toggled', [
                'school_year_id' => $id,
                'is_active' => $request->is_active,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'School year status updated successfully.',
                'schoolYear' => $schoolYear->fresh(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to toggle school year status', [
                'error' => $e->getMessage(),
                'school_year_id' => $id,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update school year status. Please try again.',
            ], 500);
        }
    }


    /**
     * Toggle faculty status
     */
    public function toggleFacultyStatus(Request $request, $id)
    {
        try {
            $faculty = User::findOrFail($id);
            
            $request->validate([
                'is_coordinator' => 'sometimes|boolean',
                'is_disabled' => 'sometimes|boolean',
            ]);

            $updateData = [];
            
            // Handle coordinator status toggle
            if ($request->has('is_coordinator')) {
                $updateData['is_coordinator'] = $request->is_coordinator;
                $updateData['role'] = $request->is_coordinator ? 'coordinator' : 'faculty';
            }
            
            // Handle enable/disable toggle
            if ($request->has('is_disabled')) {
                $updateData['is_disabled'] = $request->is_disabled;
            }

            $faculty->update($updateData);

            Log::info('Faculty status toggled', [
                'faculty_id' => $id,
                'update_data' => $updateData,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Faculty status updated successfully.',
                'faculty' => $faculty,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to toggle faculty status', [
                'error' => $e->getMessage(),
                'faculty_id' => $id,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update faculty status. Please try again.',
            ], 500);
        }
    }

    /**
     * Profile Management Page
     */
    public function profilePage()
    {
        $user = Auth::user();

        return Inertia::render('Registrar/Profile', [
            'user' => $user
        ]);
    }

    /**
     * Update Profile
     */
    public function updateProfile(Request $request)
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            
            $request->validate([
                'firstname' => 'required|string|max:255',
                'lastname' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $user->id,
            ]);

            $user->update([
                'firstname' => $request->firstname,
                'lastname' => $request->lastname,
                'email' => $request->email,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully.',
                'user' => $user->fresh(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update profile', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile. Please try again.',
            ], 500);
        }
    }

    // ===== ACADEMIC CALENDAR MANAGEMENT =====

    /**
     * Display academic calendar management page.
     */
    public function academicCalendarPage()
    {
        $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        return Inertia::render('Registrar/AcademicCalendar', [
            'schoolYears' => $schoolYears,
            'activeSchoolYear' => $activeSchoolYear,
        ]);
    }

    /**
     * Update academic calendar for a school year.
     */
    public function updateAcademicCalendar(Request $request, $schoolYearId)
    {
        $request->validate([
            'enrollment_start' => 'nullable|date',
            'enrollment_end' => 'nullable|date|after_or_equal:enrollment_start',
            'quarter_1_start' => 'nullable|date',
            'quarter_1_end' => 'nullable|date|after_or_equal:quarter_1_start',
            'quarter_2_start' => 'nullable|date',
            'quarter_2_end' => 'nullable|date|after_or_equal:quarter_2_start',
            'quarter_3_start' => 'nullable|date',
            'quarter_3_end' => 'nullable|date|after_or_equal:quarter_3_start',
            'quarter_4_start' => 'nullable|date',
            'quarter_4_end' => 'nullable|date|after_or_equal:quarter_4_start',
            'grading_deadline' => 'nullable|date',
            'is_enrollment_open' => 'boolean',
        ]);

        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        try {
            // Log the incoming data for debugging
            Log::info('Updating academic calendar', [
                'school_year_id' => $schoolYearId,
                'user_id' => Auth::id(),
                'data' => $request->all()
            ]);

            $updateData = [
                'enrollment_start' => $request->enrollment_start,
                'enrollment_end' => $request->enrollment_end,
                'quarter_1_start' => $request->quarter_1_start,
                'quarter_1_end' => $request->quarter_1_end,
                'quarter_2_start' => $request->quarter_2_start,
                'quarter_2_end' => $request->quarter_2_end,
                'quarter_3_start' => $request->quarter_3_start,
                'quarter_3_end' => $request->quarter_3_end,
                'quarter_4_start' => $request->quarter_4_start,
                'quarter_4_end' => $request->quarter_4_end,
                'grading_deadline' => $request->grading_deadline,
                'is_enrollment_open' => $request->boolean('is_enrollment_open', false),
            ];

            // Also update the new field names for consistency
            if ($request->enrollment_start) {
                $updateData['enrollment_start_date'] = $request->enrollment_start;
            }
            if ($request->enrollment_end) {
                $updateData['enrollment_end_date'] = $request->enrollment_end;
            }

            $schoolYear->update($updateData);

            Log::info('Academic calendar updated successfully', [
                'school_year_id' => $schoolYearId,
                'updated_by' => Auth::id(),
                'changes' => $updateData
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Academic calendar updated successfully.',
                'school_year' => $schoolYear->fresh(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update academic calendar', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'school_year_id' => $schoolYearId,
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to update academic calendar. Please try again.',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Toggle enrollment status for a school year.
     */
    public function toggleEnrollmentStatus(Request $request, $schoolYearId)
    {
        $request->validate([
            'is_enrollment_open' => 'required|boolean',
        ]);

        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        try {
            $schoolYear->update([
                'is_enrollment_open' => $request->is_enrollment_open,
            ]);

            Log::info('Enrollment status toggled', [
                'school_year_id' => $schoolYearId,
                'is_enrollment_open' => $request->is_enrollment_open,
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Enrollment status updated successfully.',
                'is_enrollment_open' => $schoolYear->is_enrollment_open,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to toggle enrollment status', [
                'error' => $e->getMessage(),
                'school_year_id' => $schoolYearId,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'error' => 'Failed to update enrollment status. Please try again.',
            ], 500);
        }
    }

    /**
     * Get academic calendar information for API.
     */
    public function getAcademicCalendarInfo($schoolYearId = null)
    {
        if ($schoolYearId) {
            $schoolYear = SchoolYear::findOrFail($schoolYearId);
        } else {
            $schoolYear = SchoolYear::where('is_active', true)->first();
        }

        if (!$schoolYear) {
            return response()->json([
                'error' => 'No school year found.',
            ], 404);
        }

        return response()->json([
            'school_year' => $schoolYear,
            'semester_info' => $schoolYear->getSemesterInfo(),
            'current_quarter' => $schoolYear->getCurrentQuarter(),
            'is_enrollment_open' => $schoolYear->isEnrollmentOpen(),
            'is_grading_open' => $schoolYear->isGradingOpen(),
        ]);
    }

    /**
     * Get enrollment periods for all school years.
     */
    public function getEnrollmentPeriods()
    {
        $schoolYears = SchoolYear::select([
            'id', 'year_start', 'year_end', 'semester',
            'enrollment_start', 'enrollment_end', 'is_enrollment_open', 'is_active'
        ])->orderBy('year_start', 'desc')->get();

        return response()->json([
            'enrollment_periods' => $schoolYears->map(function ($schoolYear) {
                return [
                    'id' => $schoolYear->id,
                    'display_name' => $schoolYear->display_name,
                    'enrollment_start' => $schoolYear->enrollment_start,
                    'enrollment_end' => $schoolYear->enrollment_end,
                    'is_enrollment_open' => $schoolYear->isEnrollmentOpen(),
                    'is_active' => $schoolYear->is_active,
                ];
            }),
        ]);
    }

    /**
     * Get grading periods for faculty.
     */
    public function getGradingPeriods($schoolYearId = null)
    {
        if ($schoolYearId) {
            $schoolYear = SchoolYear::findOrFail($schoolYearId);
        } else {
            $schoolYear = SchoolYear::where('is_active', true)->first();
        }

        if (!$schoolYear) {
            return response()->json([
                'error' => 'No school year found.',
            ], 404);
        }

        $quarters = [];
        for ($i = 1; $i <= 4; $i++) {
            $startField = "quarter_{$i}_start";
            $endField = "quarter_{$i}_end";
            
            $quarters[] = [
                'quarter' => $i,
                'name' => "Quarter {$i}",
                'start_date' => $schoolYear->$startField,
                'end_date' => $schoolYear->$endField,
                'is_active' => $schoolYear->getCurrentQuarter() === $i,
                'duration_months' => 2.5,
            ];
        }

        return response()->json([
            'school_year' => [
                'id' => $schoolYear->id,
                'display_name' => $schoolYear->display_name,
                'semester' => $schoolYear->semester,
            ],
            'quarters' => $quarters,
            'current_quarter' => $schoolYear->getCurrentQuarter(),
            'grading_deadline' => $schoolYear->grading_deadline,
            'is_grading_open' => $schoolYear->isGradingOpen(),
        ]);
    }

    // ===== SCHEDULE MANAGEMENT =====
    // Note: ScheduleController functionality can be moved here if needed

    // ===== FACULTY LOAD MANAGEMENT =====
    // Note: FacultyLoadController functionality can be moved here if needed

    // ===== NOTIFICATION MANAGEMENT =====
    // Note: NotificationController functionality can be moved here if needed

    // ===== REPORTS =====
    // Note: reportsPage() and exportReport() methods already exist above

    // ===== COR

    /**
     * Display summer schedule management page.
     */
    public function summerSchedulePage()
    {
        // Get students who need summer classes (failed grades or summer required status)
        $summerEnrollments = Enrollment::with(['studentPersonalInfo.user', 'schoolYear', 'assignedSection'])
            ->where(function($query) {
                $query->where('enrollment_type', 'summer')
                      ->orWhere('academic_year_status', 'summer_required')
                      ->orWhere('academic_year_status', 'failed');
            })
            ->where('status', 'enrolled')
            ->get();

        // Get students with failed grades using Eloquent for better relationship handling
        $failedGradeStudentIds = Grade::where('semester_grade', '<', 75)
            ->where('status', 'approved')
            ->pluck('student_id')
            ->unique();

        // Get enrollments for students with failed grades
        $failedGradeEnrollments = collect();
        if ($failedGradeStudentIds->isNotEmpty()) {
            $failedGradeEnrollments = Enrollment::with(['studentPersonalInfo.user', 'schoolYear', 'assignedSection'])
                ->whereIn('student_id', $failedGradeStudentIds)
                ->where('status', 'enrolled')
                ->get();
        }

        // Merge both collections and remove duplicates
        $allSummerEnrollments = $summerEnrollments->concat($failedGradeEnrollments)->unique('id');

        $subjects = Subject::where('is_summer_subject', true)->get();
        $faculty = User::where('role', 'faculty')->get();
        $schoolYears = SchoolYear::all();

        return Inertia::render('Registrar/SummerSchedule', [
            'summerEnrollments' => $allSummerEnrollments->values(),
            'subjects' => $subjects,
            'faculty' => $faculty,
            'schoolYears' => $schoolYears
        ]);
    }

    /**
     * Get summer schedules.
     */
    public function getSummerSchedules(Request $request)
    {
        $query = SummerClassSchedule::with([
            'enrollment.studentPersonalInfo.user',
            'subject',
            'faculty',
            'schoolYear'
        ]);

        if ($request->has('school_year_id')) {
            $query->where('school_year_id', $request->school_year_id);
        }

        if ($request->has('faculty_id')) {
            $query->where('faculty_id', $request->faculty_id);
        }

        if ($request->has('schedule_type')) {
            $query->where('schedule_type', $request->schedule_type);
        }

        $schedules = $query->orderBy('start_date')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'success' => true,
            'schedules' => $schedules
        ]);
    }

    /**
     * Create a new summer schedule.
     */
    public function createSummerSchedule(Request $request)
    {
        $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'required|exists:users,id',
            'school_year_id' => 'required|exists:school_years,id',
            'schedule_type' => 'required|in:intensive,regular,weekend',
            'class_days' => 'required|array',
            'class_days.*' => 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'room' => 'nullable|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'total_hours' => 'required|integer|min:1|max:200'
        ]);

        try {
            // Check for conflicts
            $conflicts = SummerClassSchedule::where('faculty_id', $request->faculty_id)
                ->where('school_year_id', $request->school_year_id)
                ->where('is_active', true)
                ->where(function ($query) use ($request) {
                    $query->where(function ($q) use ($request) {
                        $q->where('start_time', '<', $request->end_time)
                          ->where('end_time', '>', $request->start_time);
                    });
                })
                ->where(function ($query) use ($request) {
                    $query->where('start_date', '<=', $request->end_date)
                          ->where('end_date', '>=', $request->start_date);
                })
                ->whereRaw('JSON_OVERLAPS(class_days, ?)', [json_encode($request->class_days)])
                ->exists();

            if ($conflicts) {
                return response()->json([
                    'success' => false,
                    'error' => 'Schedule conflict detected with existing faculty schedule.'
                ], 422);
            }

            $schedule = SummerClassSchedule::create($request->all());

            Log::info('Summer schedule created', [
                'schedule_id' => $schedule->id,
                'created_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Summer schedule created successfully.',
                'schedule' => $schedule->load(['enrollment.studentPersonalInfo.user', 'subject', 'faculty'])
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create summer schedule', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to create summer schedule. Please try again.'
            ], 500);
        }
    }

    /**
     * Update a summer schedule.
     */
    public function updateSummerSchedule(Request $request, $id)
    {
        $request->validate([
            'enrollment_id' => 'required|exists:enrollments,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'required|exists:users,id',
            'school_year_id' => 'required|exists:school_years,id',
            'schedule_type' => 'required|in:intensive,regular,weekend',
            'class_days' => 'required|array',
            'class_days.*' => 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'room' => 'nullable|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'total_hours' => 'required|integer|min:1|max:200',
            'is_active' => 'boolean'
        ]);

        try {
            $schedule = SummerClassSchedule::findOrFail($id);

            // Check for conflicts (excluding current schedule)
            $conflicts = SummerClassSchedule::where('faculty_id', $request->faculty_id)
                ->where('school_year_id', $request->school_year_id)
                ->where('is_active', true)
                ->where('id', '!=', $id)
                ->where(function ($query) use ($request) {
                    $query->where(function ($q) use ($request) {
                        $q->where('start_time', '<', $request->end_time)
                          ->where('end_time', '>', $request->start_time);
                    });
                })
                ->where(function ($query) use ($request) {
                    $query->where('start_date', '<=', $request->end_date)
                          ->where('end_date', '>=', $request->start_date);
                })
                ->whereRaw('JSON_OVERLAPS(class_days, ?)', [json_encode($request->class_days)])
                ->exists();

            if ($conflicts) {
                return response()->json([
                    'success' => false,
                    'error' => 'Schedule conflict detected with existing faculty schedule.'
                ], 422);
            }

            $schedule->update($request->all());

            Log::info('Summer schedule updated', [
                'schedule_id' => $schedule->id,
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Summer schedule updated successfully.',
                'schedule' => $schedule->load(['enrollment.studentPersonalInfo.user', 'subject', 'faculty'])
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update summer schedule', [
                'error' => $e->getMessage(),
                'schedule_id' => $id,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to update summer schedule. Please try again.'
            ], 500);
        }
    }

    /**
     * Delete a summer schedule.
     */
    public function deleteSummerSchedule($id)
    {
        try {
            $schedule = SummerClassSchedule::findOrFail($id);
            $schedule->delete();

            Log::info('Summer schedule deleted', [
                'schedule_id' => $id,
                'deleted_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Summer schedule deleted successfully.'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete summer schedule', [
                'error' => $e->getMessage(),
                'schedule_id' => $id,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to delete summer schedule. Please try again.'
            ], 500);
        }
    }

    /**
     * Update student enrollment status based on failed grades.
     * This method should be called after grades are approved.
     */
    public function updateSummerRequiredStatus()
    {
        try {
            // Get students with failed grades (below 75)
            $studentsWithFailedGrades = DB::table('grades as g')
                ->join('enrollments as e', 'g.student_id', '=', 'e.student_id')
                ->where('g.semester_grade', '<', 75)
                ->where('g.status', 'approved')
                ->where('e.status', 'enrolled')
                ->select('e.id', 'e.student_id')
                ->distinct()
                ->get();

            // Update their enrollment status to summer_required
            foreach ($studentsWithFailedGrades as $student) {
                Enrollment::where('id', $student->id)
                    ->update(['academic_year_status' => 'summer_required']);
            }

            Log::info('Updated summer required status', [
                'students_updated' => $studentsWithFailedGrades->count(),
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => "Updated {$studentsWithFailedGrades->count()} students to summer required status.",
                'students_updated' => $studentsWithFailedGrades->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update summer required status', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to update summer required status.'
            ], 500);
        }
    }

    /**
     * View COR in browser.
     */
    public function viewCOR($studentId)
    {
        // Implementation for viewing COR
        return response()->json(['message' => 'COR view not implemented yet']);
    }

    /**
     * Generate COR as PDF.
     */
    public function generateCORPDF($studentId)
    {
        // Implementation for generating COR PDF
        return response()->json(['message' => 'COR PDF generation not implemented yet']);
    }

    /**
     * Get section schedules for API.
     */
    public function getSectionSchedulesAPI($sectionId)
    {
        // Implementation for getting section schedules
        return response()->json(['message' => 'Section schedules API not implemented yet']);
    }

    /**
     * Get available sections for enrollment (sections that are not full).
     */
    public function getAvailableSections(Request $request)
    {
        $query = Section::with(['strand', 'adviser', 'schoolYear']);

        // Filter by strand if provided
        if ($request->strand_id) {
            $query->where('strand_id', $request->strand_id);
        }

        // Filter by year level if provided
        if ($request->year_level) {
            $query->where('year_level', $request->year_level);
        }

        // Filter by school year if provided
        if ($request->school_year_id) {
            $query->where('school_year_id', $request->school_year_id);
        }

        $sections = $query->orderBy('section_name')->get();

        // Add capacity information and filter out full sections
        $availableSections = $sections->filter(function ($section) {
            $section->capacity_status = $section->capacity_status;
            $section->current_enrollment = $section->getCurrentEnrollmentCount();
            return $section->hasAvailableSlots();
        })->values();

        return response()->json([
            'success' => true,
            'sections' => $availableSections
        ]);
    }

    /**
     * Get pending grade input requests for registrar approval.
     */
    public function getPendingGradeInputRequests()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Registrar/GradeInputRequests', [
                'error' => 'No active school year found',
                'requests' => []
            ]);
        }

        $requests = GradeInputRequest::pending()
                                   ->where('school_year_id', $activeSchoolYear->id)
                                   ->with(['faculty', 'class.subject', 'class.section'])
                                   ->orderBy('is_urgent', 'desc')
                                   ->orderBy('created_at', 'asc')
                                   ->get()
                                   ->map(function ($request) {
                                       return [
                                           'id' => $request->id,
                                           'faculty_name' => $request->faculty->firstname . ' ' . $request->faculty->lastname,
                                           'faculty_email' => $request->faculty->email,
                                           'class_name' => $request->class->subject->name . ' - ' . $request->class->section->section_name,
                                           'quarter' => $request->quarter,
                                           'reason' => $request->reason,
                                           'is_urgent' => $request->is_urgent,
                                           'students_count' => count($request->student_list ?? []),
                                           'students_without_grades' => $request->student_list ?? [],
                                           'created_at' => $request->created_at,
                                           'days_pending' => $request->created_at->diffInDays(now()),
                                           'quarter_status' => 'ended' // Since request was allowed, quarter must have ended
                                       ];
                                   });

        return Inertia::render('Registrar/GradeInputRequests', [
            'requests' => $requests,
            'stats' => [
                'total_pending' => $requests->count(),
                'urgent_requests' => $requests->where('is_urgent', true)->count(),
                'overdue_requests' => $requests->where('days_pending', '>', 3)->count()
            ]
        ]);
    }

    /**
     * Approve a grade input request.
     */
    public function approveGradeInputRequest(Request $request, $id)
    {
        try {
            $request->validate([
                'notes' => 'nullable|string|max:1000',
                'expires_in_days' => 'integer|min:1|max:30'
            ]);

            $gradeInputRequest = GradeInputRequest::findOrFail($id);

            if (!$gradeInputRequest->isPending()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This request has already been processed'
                ], 400);
            }

            $expiresInDays = $request->input('expires_in_days', 7);
            $gradeInputRequest->approve(Auth::id(), $request->notes, $expiresInDays);

            Log::info('Grade input request approved', [
                'request_id' => $gradeInputRequest->id,
                'faculty_id' => $gradeInputRequest->faculty_id,
                'class_id' => $gradeInputRequest->class_id,
                'quarter' => $gradeInputRequest->quarter,
                'approved_by' => Auth::id(),
                'expires_at' => $gradeInputRequest->expires_at
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Grade input request approved successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error approving grade input request', [
                'request_id' => $id,
                'error' => $e->getMessage(),
                'approved_by' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve request. Please try again.'
            ], 500);
        }
    }

    /**
     * Reject a grade input request.
     */
    public function rejectGradeInputRequest(Request $request, $id)
    {
        try {
            $request->validate([
                'notes' => 'required|string|max:1000'
            ]);

            $gradeInputRequest = GradeInputRequest::findOrFail($id);

            if (!$gradeInputRequest->isPending()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This request has already been processed'
                ], 400);
            }

            $gradeInputRequest->reject(Auth::id(), $request->notes);

            Log::info('Grade input request rejected', [
                'request_id' => $gradeInputRequest->id,
                'faculty_id' => $gradeInputRequest->faculty_id,
                'class_id' => $gradeInputRequest->class_id,
                'quarter' => $gradeInputRequest->quarter,
                'rejected_by' => Auth::id(),
                'reason' => $request->notes
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Grade input request rejected successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error rejecting grade input request', [
                'request_id' => $id,
                'error' => $e->getMessage(),
                'rejected_by' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject request. Please try again.'
            ], 500);
        }
    }

    /**
     * Get all grade input requests (for history/management).
     */
    public function getAllGradeInputRequests(Request $request)
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json([
                'success' => false,
                'message' => 'No active school year found'
            ], 400);
        }

        $status = $request->get('status', 'all');
        $query = GradeInputRequest::where('school_year_id', $activeSchoolYear->id)
                                 ->with(['faculty', 'class.subject', 'class.section', 'approvedBy']);

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $requests = $query->orderBy('created_at', 'desc')
                         ->get()
                         ->map(function ($request) {
                             return [
                                 'id' => $request->id,
                                 'faculty_name' => $request->faculty->firstname . ' ' . $request->faculty->lastname,
                                 'faculty_email' => $request->faculty->email,
                                 'class_name' => $request->class->subject->name . ' - ' . $request->class->section->section_name,
                                 'quarter' => $request->quarter,
                                 'status' => $request->status,
                                 'status_text' => $request->getStatusText(),
                                 'status_color' => $request->getStatusColor(),
                                 'reason' => $request->reason,
                                 'registrar_notes' => $request->registrar_notes,
                                 'is_urgent' => $request->is_urgent,
                                 'students_count' => count($request->student_list ?? []),
                                 'created_at' => $request->created_at,
                                 'approved_at' => $request->approved_at,
                                 'expires_at' => $request->expires_at,
                                 'approved_by_name' => $request->approvedBy ? 
                                     $request->approvedBy->firstname . ' ' . $request->approvedBy->lastname : null,
                                 'is_expired' => $request->isExpired(),
                                 'days_since_created' => $request->created_at->diffInDays(now())
                             ];
                         });

        return response()->json([
            'success' => true,
            'requests' => $requests
        ]);
    }

    // ===== SUMMER ENROLLMENT =====

    /**
     * Generate summer enrollment eligibility
     */
    public function generateSummerEnrollment()
    {
        return response()->json(['message' => 'Summer enrollment eligibility not implemented yet']);
    }

    /**
     * Process summer enrollment
     */
    public function processSummerEnrollment(Request $request)
    {
        return response()->json(['message' => 'Summer enrollment processing not implemented yet']);
    }

    /**
     * Get class schedules for enrollment
     */
    public function getClassSchedules($enrollmentId)
    {
        return response()->json(['message' => 'Class schedules for enrollment not implemented yet']);
    }

    // ===== REPORT GENERATION METHODS =====

    /**
     * Generate student list report
     */
    public function generateStudentListReport(Request $request)
    {
        try {
            Log::info('Student list report request data', [
                'request_data' => $request->all(),
                'semester_value' => $request->semester,
                'semester_type' => gettype($request->semester)
            ]);

            $request->validate([
                'section_id' => 'nullable|exists:sections,id',
                'strand_id' => 'nullable|exists:strands,id',
                'semester' => 'nullable|string|in:,1st,2nd,1st Semester,2nd Semester,First Semester,Second Semester,1,2',
                'school_year_id' => 'nullable|exists:school_years,id',
                'grade_status' => 'nullable|in:passed,failed,incomplete,honor',
                'enrollment_status' => 'nullable|in:enrolled,pending,dropped,graduated',
                'date_range' => 'nullable|string',
                'grade_threshold' => 'nullable|integer|min:60|max:100',
                'format' => 'required|in:excel,pdf,json'
            ]);

            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $schoolYearId = $request->school_year_id ?? $activeSchoolYear->id;
            
            Log::info('Student report query setup', [
                'active_school_year' => $activeSchoolYear ? $activeSchoolYear->toArray() : null,
                'school_year_id' => $schoolYearId,
                'enrollment_status' => $request->enrollment_status
            ]);

            // First, let's try a simpler query to see if we can find any enrollments
            $simpleCount = DB::table('enrollments as e')
                ->join('users as u', 'e.student_id', '=', 'u.id')
                ->where('e.school_year_id', $schoolYearId)
                ->where('u.role', 'student')
                ->count();

            // Check enrolled students specifically
            $enrolledCount = DB::table('enrollments as e')
                ->join('users as u', 'e.student_id', '=', 'u.id')
                ->where('e.school_year_id', $schoolYearId)
                ->where('u.role', 'student')
                ->whereIn('e.status', ['enrolled', 'approved'])
                ->count();

            // Check what statuses exist
            $statusBreakdown = DB::table('enrollments as e')
                ->join('users as u', 'e.student_id', '=', 'u.id')
                ->where('e.school_year_id', $schoolYearId)
                ->where('u.role', 'student')
                ->select('e.status', DB::raw('COUNT(*) as count'))
                ->groupBy('e.status')
                ->get();
                
            Log::info('Enrollment analysis', [
                'school_year_id' => $schoolYearId,
                'total_enrollments' => $simpleCount,
                'enrolled_students' => $enrolledCount,
                'status_breakdown' => $statusBreakdown->toArray(),
                'request_filters' => [
                    'report_type' => $request->report_type,
                    'section_id' => $request->section_id,
                    'strand_id' => $request->strand_id,
                    'enrollment_status' => $request->enrollment_status
                ]
            ]);

            Log::info('Using class_details table for enrolled students report', [
                'school_year_id' => $schoolYearId,
                'report_type' => $request->report_type
            ]);

            // Use class_details as primary source for enrolled students
            $query = DB::table('class_details as cd')
                ->join('users as u', 'cd.student_id', '=', 'u.id')
                ->join('enrollments as e', 'cd.enrollment_id', '=', 'e.id')
                ->join('class as c', 'cd.class_id', '=', 'c.id')
                ->join('sections as s', 'c.section_id', '=', 's.id')
                ->join('subjects as subj', 'c.subject_id', '=', 'subj.id')
                ->leftJoin('student_personal_info as spi', 'u.id', '=', 'spi.user_id')
                ->leftJoin('strands as st_section', 's.strand_id', '=', 'st_section.id')
                ->leftJoin('strands as st_enrollment', 'e.strand_id', '=', 'st_enrollment.id')
                ->leftJoin('grades as g', function($join) use ($schoolYearId) {
                    $join->on('u.id', '=', 'g.student_id')
                         ->where('g.school_year_id', '=', $schoolYearId);
                })
                ->where('c.school_year_id', $schoolYearId)
                ->where('cd.is_enrolled', true)
                ->where('u.role', 'student');

            // Filter by enrollment status - focus on enrolled students for enrolled students report
            if ($request->enrollment_status) {
                $query->where('e.status', $request->enrollment_status);
                Log::info('Filtering by specific enrollment status', [
                    'enrollment_status' => $request->enrollment_status
                ]);
            } else {
                // For enrolled students report, focus on actually enrolled students
                if ($request->report_type === 'enrolled_students') {
                    $query->whereIn('e.status', ['enrolled', 'approved']);
                    Log::info('Enrolled students report - filtering for enrolled/approved only', [
                        'statuses' => ['enrolled', 'approved']
                    ]);
                } else {
                    $query->whereIn('e.status', ['enrolled', 'approved', 'pending', 'pending_evaluation']);
                    Log::info('General report - including all active statuses', [
                        'default_statuses' => ['enrolled', 'approved', 'pending', 'pending_evaluation']
                    ]);
                }
            }

            // Store original query for fallback
            $originalQuery = clone $query;
            
            if ($request->section_id) {
                // Filter by section from class_details (more accurate)
                $query->where('s.id', $request->section_id);
                Log::info('Filtering by section from class_details', [
                    'section_id' => $request->section_id
                ]);
            }

            if ($request->strand_id) {
                // Filter by strand from either section or enrollment
                $query->where(function($q) use ($request) {
                    $q->where('st_section.id', $request->strand_id)
                      ->orWhere('st_enrollment.id', $request->strand_id);
                });
                Log::info('Filtering by strand', [
                    'strand_id' => $request->strand_id
                ]);
            }

            // Filter by grade status
            $gradeThreshold = $request->grade_threshold ?? 75;
            if ($request->grade_status) {
                switch ($request->grade_status) {
                    case 'passed':
                        $query->where('g.semester_grade', '>=', $gradeThreshold);
                        break;
                    case 'failed':
                        $query->where('g.semester_grade', '<', $gradeThreshold)
                              ->whereNotNull('g.semester_grade');
                        break;
                    case 'honor':
                        $query->where('g.semester_grade', '>=', 90);
                        break;
                    case 'incomplete':
                        $query->whereNull('g.semester_grade');
                        break;
                }
            }

            $students = $query->select([
                'u.id',
                'u.username',
                'u.firstname',
                'u.lastname',
                'u.email',
                DB::raw('COALESCE(spi.lrn, "N/A") as lrn'),
                DB::raw('COALESCE(spi.grade_level, "N/A") as grade_level'),
                DB::raw('COALESCE(spi.student_status, "N/A") as student_status'),
                DB::raw('COALESCE(s.section_name, "N/A") as section_name'),
                DB::raw('COALESCE(COALESCE(st_section.name, st_enrollment.name), "N/A") as strand_name'),
                DB::raw('COALESCE(COALESCE(st_section.code, st_enrollment.code), "N/A") as strand_code'),
                'e.enrollment_date',
                'e.status as enrollment_status',
                'e.intended_grade_level',
                'e.enrollment_type',
                DB::raw('COUNT(DISTINCT cd.class_id) as total_classes'),
                DB::raw('GROUP_CONCAT(DISTINCT subj.name SEPARATOR ", ") as subjects_enrolled')
            ])
            ->groupBy([
                'u.id', 'u.username', 'u.firstname', 'u.lastname', 'u.email', 'spi.lrn', 'spi.grade_level', 
                'spi.student_status', 's.section_name', 'st_section.name', 
                'st_enrollment.name', 'st_section.code', 'st_enrollment.code',
                'e.enrollment_date', 'e.status', 'e.intended_grade_level', 'e.enrollment_type'
            ])
            ->orderBy('u.username')->get();

            // Fallback: If no students found with section filter, try without section filter
            if ($students->isEmpty() && $request->section_id) {
                Log::info('No students found with section filter, trying without section filter');
                
                $fallbackStudents = $originalQuery->select([
                    'u.id',
                    'u.username',
                    'u.firstname',
                    'u.lastname',
                    'u.email',
                    DB::raw('COALESCE(spi.lrn, "N/A") as lrn'),
                    DB::raw('COALESCE(spi.grade_level, "N/A") as grade_level'),
                    DB::raw('COALESCE(spi.student_status, "N/A") as student_status'),
                    DB::raw('COALESCE(s.section_name, "N/A") as section_name'),
                    DB::raw('COALESCE(COALESCE(st_section.name, st_enrollment.name), "N/A") as strand_name'),
                    DB::raw('COALESCE(COALESCE(st_section.code, st_enrollment.code), "N/A") as strand_code'),
                    'e.enrollment_date',
                    'e.status as enrollment_status',
                    'e.intended_grade_level',
                    'e.enrollment_type',
                    DB::raw('COUNT(DISTINCT cd.class_id) as total_classes'),
                    DB::raw('GROUP_CONCAT(DISTINCT subj.name SEPARATOR ", ") as subjects_enrolled')
                ])
                ->groupBy([
                    'u.id', 'u.username', 'u.firstname', 'u.lastname', 'u.email', 'spi.lrn', 'spi.grade_level', 
                    'spi.student_status', 's.section_name', 'st_section.name', 
                    'st_enrollment.name', 'st_section.code', 'st_enrollment.code',
                    'e.enrollment_date', 'e.status', 'e.intended_grade_level', 'e.enrollment_type'
                ])
                ->orderBy('u.username')->get();
                
                Log::info('Fallback query results', [
                    'fallback_students_found' => $fallbackStudents->count()
                ]);
                
                if ($fallbackStudents->isNotEmpty()) {
                    $students = $fallbackStudents;
                    Log::info('Using fallback results without section filter');
                }
            }
            
            // Debug: Log the actual query and first few results
            Log::info('Student query executed', [
                'query_sql' => $query->toSql(),
                'query_bindings' => $query->getBindings(),
                'first_student_data' => $students->first() ? (array) $students->first() : null,
                'total_found' => $students->count()
            ]);

            Log::info('Student report query results', [
                'total_students_found' => $students->count(),
                'first_student_sample' => $students->first() ? $students->first() : 'No students found',
                'query_filters' => [
                    'school_year_id' => $schoolYearId,
                    'enrollment_status' => $request->enrollment_status,
                    'section_id' => $request->section_id,
                    'strand_id' => $request->strand_id
                ]
            ]);

            if ($request->format === 'json') {
                // Calculate comprehensive statistics
                $totalStudents = $students->count();
                
                // Count approved/enrolled students (multiple status values)
                $enrolledStudents = $students->whereIn('enrollment_status', ['enrolled', 'approved'])->count();
                $pendingStudents = $students->whereIn('enrollment_status', ['pending', 'pending_evaluation'])->count();
                $rejectedStudents = $students->where('enrollment_status', 'rejected')->count();
                
                // Debug logging to see actual status values
                $statusBreakdown = $students->groupBy('enrollment_status')->map->count();
                Log::info('Actual enrollment status breakdown', [
                    'status_breakdown' => $statusBreakdown->toArray(),
                    'sample_students' => $students->take(3)->pluck('enrollment_status', 'username')->toArray()
                ]);
                
                // Count unique sections
                $sectionsCount = $students->whereNotNull('section_name')->unique('section_name')->count();
                
                // Count by strand
                $strandStats = $students->groupBy('strand_name')->map(function($group) {
                    return $group->count();
                });
                
                Log::info('Student report statistics calculated', [
                    'total_students' => $totalStudents,
                    'enrolled_students' => $enrolledStudents,
                    'pending_students' => $pendingStudents,
                    'rejected_students' => $rejectedStudents,
                    'sections_count' => $sectionsCount,
                    'strand_stats' => $strandStats->toArray()
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $students,
                    'total' => (int) $totalStudents,
                    'summary' => [
                        'total_students' => (int) $totalStudents,
                        'enrolled_students' => (int) $enrolledStudents,
                        'pending_students' => (int) $pendingStudents,
                        'rejected_students' => (int) $rejectedStudents,
                        'sections_count' => (int) $sectionsCount,
                        'strand_stats' => $strandStats,
                        'enrollment_rate' => $totalStudents > 0 ? ($enrolledStudents / $totalStudents) * 100 : 0,
                        'strand_distribution' => $students->groupBy('strand_name')->map->count(),
                        'section_distribution' => $students->groupBy('section_name')->map->count()
                    ],
                    'filters' => $request->only(['section_id', 'strand_id', 'semester', 'school_year_id', 'grade_status', 'enrollment_status', 'grade_threshold'])
                ]);
            }

            // For Excel/PDF export, we'll implement this later
            return $this->exportStudentList($students, $request->format, $request->all());

        } catch (\Exception $e) {
            Log::error('Error generating student list report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate student list report. Please try again.'
            ], 500);
        }
    }

    /**
     * Generate grades report
     */
    public function generateGradesReport(Request $request)
    {
        try {
            $request->validate([
                'subject_id' => 'nullable|exists:subjects,id',
                'section_id' => 'nullable|exists:sections,id',
                'semester' => 'nullable|in:1st,2nd',
                'school_year_id' => 'nullable|exists:school_years,id',
                'faculty_id' => 'nullable|exists:users,id',
                'grade_status' => 'nullable|in:passed,failed',
                'grade_threshold' => 'nullable|numeric|min:0|max:100',
                'format' => 'required|in:excel,pdf,json'
            ]);

            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $schoolYearId = $request->school_year_id ?? $activeSchoolYear->id;

            $query = Grade::with(['student', 'subject', 'faculty', 'schoolYear'])
                ->where('school_year_id', $schoolYearId);

            if ($request->subject_id) {
                $query->where('subject_id', $request->subject_id);
            }

            if ($request->semester) {
                $query->where('semester', $request->semester);
            }

            if ($request->faculty_id) {
                $query->where('faculty_id', $request->faculty_id);
            }

            // Filter by section through class relationship
            if ($request->section_id) {
                $query->whereHas('class', function($q) use ($request) {
                    $q->where('section_id', $request->section_id);
                });
            }

            // Filter by grade status (Passed/Failed)
            $gradeThreshold = $request->grade_threshold ?? 75; // Default passing grade is 75
            if ($request->grade_status) {
                switch ($request->grade_status) {
                    case 'passed':
                        $query->where('semester_grade', '>=', $gradeThreshold);
                        Log::info('Filtering for passed grades', [
                            'threshold' => $gradeThreshold
                        ]);
                        break;
                    case 'failed':
                        $query->where(function($q) use ($gradeThreshold) {
                            $q->where('semester_grade', '<', $gradeThreshold)
                              ->whereNotNull('semester_grade'); // Only include students with actual grades
                        });
                        Log::info('Filtering for failed grades', [
                            'threshold' => $gradeThreshold
                        ]);
                        break;
                }
            }

            $grades = $query->orderBy('created_at', 'desc')->get()->map(function($grade) {
                return [
                    'id' => $grade->id,
                    'student_name' => $grade->student->firstname . ' ' . $grade->student->lastname,
                    'student_lrn' => $grade->student->studentPersonalInfo->lrn ?? 'N/A',
                    'subject_name' => $grade->subject->name,
                    'subject_code' => $grade->subject->code,
                    'faculty_name' => $grade->faculty->firstname . ' ' . $grade->faculty->lastname,
                    'semester' => $grade->semester,
                    'first_quarter' => $grade->first_quarter,
                    'second_quarter' => $grade->second_quarter,
                    'semester_grade' => $grade->semester_grade,
                    'remarks' => $grade->remarks,
                    'status' => $grade->status,
                    'school_year' => $grade->schoolYear->year_start . '-' . $grade->schoolYear->year_end,
                    'submitted_at' => $grade->updated_at
                ];
            });

            if ($request->format === 'json') {
                return response()->json([
                    'success' => true,
                    'data' => $grades,
                    'total' => $grades->count(),
                    'summary' => [
                        'total_grades' => $grades->count(),
                        'approved' => $grades->where('status', 'approved')->count(),
                        'pending' => $grades->where('status', 'pending_approval')->count(),
                        'ongoing' => $grades->where('status', 'ongoing')->count(),
                        'average_grade' => $grades->where('semester_grade', '!=', null)->avg('semester_grade')
                    ],
                    'filters' => $request->only(['subject_id', 'section_id', 'semester', 'school_year_id', 'faculty_id'])
                ]);
            }

            return $this->exportGradesList($grades, $request->format, $request->all());

        } catch (\Exception $e) {
            Log::error('Error generating grades report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate grades report. Please try again.'
            ], 500);
        }
    }

    /**
     * Generate subjects report
     */
    public function generateSubjectsReport(Request $request)
    {
        return response()->json(['message' => 'Subjects report generation not implemented yet']);
    }

    /**
     * Generate faculty loads report
     */
    public function generateFacultyLoadsReport(Request $request)
    {
        try {
            Log::info('Faculty loads report request', [
                'request_data' => $request->all()
            ]);
            
            $schoolYearId = $request->school_year_id;
            $semester = $request->semester;
            
            // Get active school year if not specified
            if (!$schoolYearId) {
                $activeSchoolYear = SchoolYear::where('is_active', true)->first();
                $schoolYearId = $activeSchoolYear ? $activeSchoolYear->id : null;
            }
            
            if (!$schoolYearId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No school year specified and no active school year found'
                ], 400);
            }
            
            // Build query for faculty loads
            $query = DB::table('class')
                ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('sections', 'class.section_id', '=', 'sections.id')
                ->join('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('class.school_year_id', $schoolYearId)
                ->where('faculty.role', 'faculty');
            
            // Apply semester filter if specified
            if ($semester) {
                // Handle different semester formats
                if ($semester === '1st' || $semester === '1st Semester' || $semester === 'First Semester') {
                    $query->where('subjects.semester', 1);
                } elseif ($semester === '2nd' || $semester === '2nd Semester' || $semester === 'Second Semester') {
                    $query->where('subjects.semester', 2);
                } elseif (is_numeric($semester)) {
                    $query->where('subjects.semester', $semester);
                }
            }
            
            $facultyLoads = $query->select([
                'faculty.id as faculty_id',
                'faculty.username as faculty_name',
                'faculty.email',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'subjects.semester',
                'sections.section_name',
                'strands.name as strand_name',
                'strands.code as strand_code',
                'class.day_of_week',
                'class.start_time',
                'class.end_time'
            ])
            ->orderBy('faculty.username')
            ->orderBy('subjects.semester')
            ->get();
            
            Log::info('Faculty loads query results', [
                'total_faculty_loads' => $facultyLoads->count(),
                'sample_faculty_load' => $facultyLoads->first() ? $facultyLoads->first() : 'No faculty loads found',
                'query_filters' => [
                    'school_year_id' => $schoolYearId,
                    'semester' => $semester
                ]
            ]);
            
            // Group by faculty for summary
            $facultySummary = [];
            foreach ($facultyLoads as $load) {
                $facultyKey = $load->faculty_id;
                if (!isset($facultySummary[$facultyKey])) {
                    $facultySummary[$facultyKey] = [
                        'faculty_id' => $load->faculty_id,
                        'name' => $load->faculty_name,
                        'email' => $load->email,
                        'total_subjects' => 0,
                        'subjects_by_semester' => ['1st' => 0, '2nd' => 0],
                        'subjects' => []
                    ];
                }
                
                $facultySummary[$facultyKey]['total_subjects']++;
                
                // Convert numeric semester to readable format
                $semesterKey = $load->semester == 1 ? '1st' : ($load->semester == 2 ? '2nd' : $load->semester);
                $facultySummary[$facultyKey]['subjects_by_semester'][$semesterKey]++;
                
                $facultySummary[$facultyKey]['subjects'][] = [
                    'subject_name' => $load->subject_name,
                    'subject_code' => $load->subject_code,
                    'semester' => $load->semester,
                    'section' => $load->section_name,
                    'strand' => $load->strand_name,
                    'schedule' => $load->day_of_week . ' ' . $load->start_time . '-' . $load->end_time
                ];
            }
            
            if ($request->format === 'json') {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'faculty_loads' => $facultyLoads,
                        'faculty_summary' => array_values($facultySummary),
                        'total_faculty' => count($facultySummary),
                        'filters' => $request->all()
                    ],
                    'total' => $facultyLoads->count()
                ]);
            }
            
            // Export as Excel/PDF
            return $this->exportFacultyLoads(array_values($facultySummary), $request->format, $request->all());
            
        } catch (\Exception $e) {
            Log::error('Error generating faculty loads report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate faculty loads report. Please try again.'
            ], 500);
        }
    }
    
    /**
     * Export faculty loads data
     */
    private function exportFacultyLoads($facultyLoads, $format, $filters)
    {
        $filename = 'faculty_loads_report_' . date('Y-m-d_H-i-s');
        
        if ($format === 'excel') {
            $headers = [
                'Faculty Name',
                'Email',
                'Total Subjects',
                '1st Semester Subjects',
                '2nd Semester Subjects',
                'Subject Details'
            ];
            
            $data = [];
            foreach ($facultyLoads as $faculty) {
                $subjectDetails = [];
                foreach ($faculty['subjects'] as $subject) {
                    $subjectDetails[] = $subject['subject_code'] . ' - ' . $subject['subject_name'] . 
                                      ' (' . $subject['semester'] . ' Sem, ' . $subject['section'] . ')';
                }
                
                $data[] = [
                    $faculty['name'],
                    $faculty['email'],
                    $faculty['total_subjects'],
                    $faculty['subjects_by_semester']['1st'],
                    $faculty['subjects_by_semester']['2nd'],
                    implode('; ', $subjectDetails)
                ];
            }
            
            return $this->generateExcelReport($headers, $data, $filename);
        }
        
        // Default to JSON if format not supported
        return response()->json([
            'success' => true,
            'data' => $facultyLoads,
            'message' => 'Faculty loads report generated successfully'
        ]);
    }

    /**
     * Export student list in various formats
     */
    private function exportStudentList($students, $format, $filters)
    {
        $filename = 'student_list_' . date('Y-m-d_H-i-s');
        
        if ($format === 'excel') {
            // Generate proper Excel-formatted CSV with better compatibility
            return $this->generateExcelFormattedCSV($students, $filename);
        }

        if ($format === 'pdf') {
            return $this->generateStudentListPDF($students, $filters, $filename);
        }

        return response()->json([
            'success' => true,
            'message' => 'Export format not yet implemented',
            'format' => $format
        ]);
    }

    /**
     * Export grades list in various formats
     */
    private function exportGradesList($grades, $format, $filters)
    {
        $filename = 'grades_report_' . date('Y-m-d_H-i-s');
        
        if ($format === 'excel') {
            $headers = [
                'Content-Type' => 'application/vnd.ms-excel',
                'Content-Disposition' => "attachment; filename=\"{$filename}.xlsx\"",
            ];

            $callback = function() use ($grades) {
                $file = fopen('php://output', 'w');
                fputcsv($file, ['Student Name', 'LRN', 'Subject', 'Faculty', 'Semester', 'Q1', 'Q2', 'Semester Grade', 'Remarks', 'Status']);
                
                foreach ($grades as $grade) {
                    fputcsv($file, [
                        $grade['student_name'],
                        $grade['student_lrn'],
                        $grade['subject_name'] . ' (' . $grade['subject_code'] . ')',
                        $grade['faculty_name'],
                        $grade['semester'],
                        $grade['first_quarter'],
                        $grade['second_quarter'],
                        $grade['semester_grade'],
                        $grade['remarks'],
                        $grade['status']
                    ]);
                }
                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        }

        if ($format === 'pdf') {
            return $this->generateGradesPDF($grades, $filters, $filename);
        }

        return response()->json([
            'success' => true,
            'message' => 'Export format not yet implemented',
            'format' => $format
        ]);
    }

    /**
     * Generate PDF for grades report
     */
    private function generateGradesPDF($grades, $filters, $filename)
    {
        try {
            // Get school information
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $schoolYear = $activeSchoolYear ? $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end : 'N/A';
            
            // Create HTML content for PDF
            $html = $this->buildGradesPDFHTML($grades, $filters, $schoolYear);
            
            // Use simple HTML response that can be printed to PDF by browser
            return response($html, 200, [
                'Content-Type' => 'text/html',
                'Content-Disposition' => "inline; filename=\"{$filename}.html\"",
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error generating grades PDF', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return error response
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build HTML content for grades PDF
     */
    private function buildGradesPDFHTML($grades, $filters, $schoolYear)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Grades Report</title>
            <style>
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                    @page { size: A4 landscape; margin: 0.5in; }
                }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11px; 
                    margin: 20px;
                    line-height: 1.4;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 20px; 
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                }
                .header h1 { 
                    color: #333; 
                    margin: 0; 
                    font-size: 18px;
                }
                .header h2 { 
                    color: #666; 
                    margin: 5px 0; 
                    font-size: 14px;
                }
                .info { 
                    margin-bottom: 15px; 
                    background-color: #f8f9fa;
                    padding: 10px;
                    border-radius: 5px;
                }
                .info p { margin: 3px 0; }
                .print-button {
                    background-color: #007bff;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-bottom: 20px;
                    font-size: 14px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px; 
                    font-size: 10px;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 6px; 
                    text-align: left; 
                    vertical-align: top;
                }
                th { 
                    background-color: #f5f5f5; 
                    font-weight: bold; 
                    font-size: 9px;
                    text-transform: uppercase;
                }
                .text-center { text-align: center; }
                .grade-excellent { background-color: #d4edda; }
                .grade-good { background-color: #fff3cd; }
                .grade-needs-improvement { background-color: #f8d7da; }
                .footer { 
                    margin-top: 20px; 
                    text-align: center; 
                    font-size: 9px; 
                    color: #666; 
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
            </style>
            <script>
                function printReport() {
                    window.print();
                }
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 1000);
                }
            </script>
        </head>
        <body>
            <button onclick="printReport()" class="print-button no-print">🖨️ Print Report</button>
            
            <div class="header">
                <h1>ONSTS - Grades Report</h1>
                <h2>School Year: ' . $schoolYear . '</h2>
                <p>Generated on: ' . date('F j, Y \a\t g:i A') . '</p>
            </div>
            
            <div class="info">
                <p><strong>Report Filters:</strong></p>';
                
        if (!empty($filters['section_id'])) {
            $html .= '<p>Section ID: ' . $filters['section_id'] . '</p>';
        }
        if (!empty($filters['strand_id'])) {
            $html .= '<p>Strand ID: ' . $filters['strand_id'] . '</p>';
        }
        if (!empty($filters['semester'])) {
            $html .= '<p>Semester: ' . $filters['semester'] . '</p>';
        }
        
        $html .= '
                <p>Total Records: ' . count($grades) . '</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>LRN</th>
                        <th>Subject</th>
                        <th>Faculty</th>
                        <th>Semester</th>
                        <th class="text-center">Q1</th>
                        <th class="text-center">Q2</th>
                        <th class="text-center">Final Grade</th>
                        <th>Remarks</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>';
                
        foreach ($grades as $grade) {
            $gradeClass = '';
            $finalGrade = $grade['semester_grade'];
            if ($finalGrade >= 90) {
                $gradeClass = 'grade-excellent';
            } elseif ($finalGrade >= 80) {
                $gradeClass = 'grade-good';
            } elseif ($finalGrade < 75 && $finalGrade > 0) {
                $gradeClass = 'grade-needs-improvement';
            }
            
            $html .= '
                    <tr class="' . $gradeClass . '">
                        <td>' . htmlspecialchars($grade['student_name']) . '</td>
                        <td>' . htmlspecialchars($grade['student_lrn']) . '</td>
                        <td>' . htmlspecialchars($grade['subject_name'] . ' (' . $grade['subject_code'] . ')') . '</td>
                        <td>' . htmlspecialchars($grade['faculty_name']) . '</td>
                        <td class="text-center">' . htmlspecialchars($grade['semester']) . '</td>
                        <td class="text-center">' . ($grade['first_quarter'] ?: '-') . '</td>
                        <td class="text-center">' . ($grade['second_quarter'] ?: '-') . '</td>
                        <td class="text-center">' . ($grade['semester_grade'] ?: '-') . '</td>
                        <td>' . htmlspecialchars($grade['remarks'] ?: '-') . '</td>
                        <td>' . htmlspecialchars($grade['status']) . '</td>
                    </tr>';
        }
        
        $html .= '
                </tbody>
            </table>
            
            <div class="footer">
                <p>This report was generated automatically by the ONSTS system.</p>
                <p>For questions or concerns, please contact the registrar\'s office.</p>
            </div>
        </body>
        </html>';
        
        return $html;
    }

    /**
     * Generate simple PDF fallback
     */
    private function generateSimpleGradesPDF($grades, $filters, $filename)
    {
        // Simple HTML response that browsers can print to PDF
        $html = $this->buildGradesPDFHTML($grades, $filters, 'Current School Year');
        
        return response($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Disposition' => "inline; filename=\"{$filename}.html\"",
        ]);
    }

    /**
     * Display the registrar settings page.
     */
    public function settingsPage()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return redirect('/login')->with('error', 'Access denied');
        }

        // Get current school year
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        // Get enrollment statistics
        $enrollmentStats = [];
        if ($currentSchoolYear) {
            $enrollmentStats = [
                'total' => Enrollment::where('school_year_id', $currentSchoolYear->id)->count(),
                'pending' => Enrollment::where('school_year_id', $currentSchoolYear->id)
                    ->whereIn('status', ['pending_approval', 'pending'])->count(),
                'approved' => Enrollment::where('school_year_id', $currentSchoolYear->id)
                    ->whereIn('status', ['enrolled', 'approved'])->count(),
                'rejected' => Enrollment::where('school_year_id', $currentSchoolYear->id)
                    ->where('status', 'rejected')->count(),
            ];
        }
        
        // Get enrollment settings (for backward compatibility)
        $enrollmentSettings = [
            'is_enrollment_open' => $currentSchoolYear ? $currentSchoolYear->is_enrollment_open : false,
            'enrollment_start' => $currentSchoolYear ? $currentSchoolYear->enrollment_start : null,
            'enrollment_end' => $currentSchoolYear ? $currentSchoolYear->enrollment_end : null,
            'enrollment_start_date' => $currentSchoolYear ? $currentSchoolYear->enrollment_start_date : null,
            'enrollment_end_date' => $currentSchoolYear ? $currentSchoolYear->enrollment_end_date : null,
            'current_school_year' => $currentSchoolYear ? [
                'id' => $currentSchoolYear->id,
                'year_start' => $currentSchoolYear->year_start,
                'year_end' => $currentSchoolYear->year_end,
                'semester' => $currentSchoolYear->semester
            ] : null
        ];

        return Inertia::render('Registrar/Settings', [
            'auth' => [
                'user' => $user
            ],
            'enrollmentSettings' => $enrollmentSettings,
            'currentSchoolYear' => $currentSchoolYear,
            'enrollmentStats' => $enrollmentStats
        ]);
    }

    /**
     * Toggle enrollment status.
     */
    public function toggleEnrollment(Request $request)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        if (!$currentSchoolYear) {
            return response()->json(['error' => 'No active school year found'], 404);
        }

        $request->validate([
            'is_enrollment_open' => 'required|boolean'
        ]);

        $updateData = [
            'is_enrollment_open' => $request->is_enrollment_open
        ];

        // If opening enrollment and no enrollment dates are set, set default dates
        if ($request->is_enrollment_open && (!$currentSchoolYear->enrollment_start_date || !$currentSchoolYear->enrollment_end_date)) {
            $updateData['enrollment_start_date'] = now();
            $updateData['enrollment_end_date'] = now()->addDays(30);
            // Sync both old and new fields
            $updateData['enrollment_start'] = now();
            $updateData['enrollment_end'] = now()->addDays(30);
        }

        $currentSchoolYear->update($updateData);

        return response()->json([
            'success' => true,
            'message' => $request->is_enrollment_open ? 'Enrollment opened successfully' : 'Enrollment closed successfully',
            'settings' => [
                'is_enrollment_open' => $currentSchoolYear->fresh()->is_enrollment_open,
                'enrollment_start' => $currentSchoolYear->fresh()->enrollment_start,
                'enrollment_end' => $currentSchoolYear->fresh()->enrollment_end,
                'enrollment_start_date' => $currentSchoolYear->fresh()->enrollment_start_date,
                'enrollment_end_date' => $currentSchoolYear->fresh()->enrollment_end_date
            ]
        ]);
    }

    /**
     * Show enrollment settings page
     */
    public function enrollmentSettings()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return redirect('/login')->with('error', 'Access denied.');
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        // Get enrollment statistics
        $enrollmentStats = [];
        if ($currentSchoolYear) {
            $enrollmentStats = $currentSchoolYear->getEnrollmentStats();
        }

        return Inertia::render('Registrar/EnrollmentSettings', [
            'currentSchoolYear' => $currentSchoolYear,
            'enrollmentStats' => $enrollmentStats,
            'auth' => ['user' => $user]
        ]);
    }

    /**
     * Update enrollment settings
     */
    public function updateEnrollmentSettings(Request $request, $schoolYearId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $request->validate([
            'is_enrollment_open' => 'required|boolean',
            'enrollment_start_date' => 'nullable|date',
            'enrollment_end_date' => 'nullable|date|after:enrollment_start_date',
            'allow_new_students' => 'boolean',
            'allow_continuing_students' => 'boolean',
            'allow_transferees' => 'boolean'
        ]);

        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        try {
            $updateData = [
                'is_enrollment_open' => $request->is_enrollment_open,
                'enrollment_start_date' => $request->enrollment_start_date,
                'enrollment_end_date' => $request->enrollment_end_date,
                // Sync both old and new fields to prevent confusion
                'enrollment_start' => $request->enrollment_start_date,
                'enrollment_end' => $request->enrollment_end_date
            ];

            $schoolYear->update($updateData);

            Log::info('Enrollment settings updated', [
                'school_year_id' => $schoolYearId,
                'updated_by' => $user->id,
                'settings' => $updateData
            ]);

            // Refresh the school year data to get the updated values
            $schoolYear->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Enrollment settings updated successfully.',
                'settings' => [
                    'is_enrollment_open' => $schoolYear->is_enrollment_open,
                    'enrollment_start_date' => $schoolYear->enrollment_start_date,
                    'enrollment_end_date' => $schoolYear->enrollment_end_date,
                    'enrollment_start' => $schoolYear->enrollment_start,
                    'enrollment_end' => $schoolYear->enrollment_end
                ],
                'school_year' => $schoolYear
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update enrollment settings', [
                'school_year_id' => $schoolYearId,
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'error' => 'Failed to update enrollment settings.',
                'details' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get COR preview for an enrollment (Registrar version)
     */
    public function getCORPreview($enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            // Get enrollment details
            $enrollment = DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('strands', 'enrollments.strand_id', '=', 'strands.id')
                ->where('enrollments.id', $enrollmentId)
                ->select([
                    'enrollments.*',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'users.student_type',
                    'student_personal_info.grade_level',
                    'student_personal_info.student_status',
                    'strands.name as strand_name',
                    'strands.code as strand_code'
                ])
                ->first();

            if (!$enrollment) {
                return response()->json(['error' => 'Enrollment not found'], 404);
            }

            // Get current school year
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$currentSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            // Get student's COR if it exists
            $cor = DB::table('certificates_of_registration')
                ->where('student_id', $enrollment->student_id)
                ->where('school_year_id', $currentSchoolYear->id)
                ->where('status', 'active')
                ->first();

            // Get student's schedule from class_details
            $schedule = $this->getStudentScheduleFromEnrollment($enrollment->id, $currentSchoolYear->id);
            
            // Debug logging
            Log::info('COR Preview Debug', [
                'enrollment_id' => $enrollment->id,
                'school_year_id' => $currentSchoolYear->id,
                'schedule_count' => count($schedule),
                'schedule_data' => $schedule
            ]);

            // Get assigned section
            $assignedSection = null;
            if ($cor) {
                $classDetail = DB::table('class_details')
                    ->join('class', 'class_details.class_id', '=', 'class.id')
                    ->join('sections', 'class.section_id', '=', 'sections.id')
                    ->where('class_details.enrollment_id', $enrollment->id)
                    ->select('sections.section_name as section_name')
                    ->first();
                
                if ($classDetail) {
                    $assignedSection = $classDetail->section_name;
                }
            }

            // Prepare student data
            $studentData = [
                'firstname' => $enrollment->firstname,
                'lastname' => $enrollment->lastname,
                'email' => $enrollment->email,
                'student_id' => $enrollment->student_id ?? 'N/A',
                'student_type' => $enrollment->student_type,
                'grade_level' => $enrollment->grade_level ?? 'Grade 11',
                'strand_name' => $enrollment->strand_name,
                'section_name' => $assignedSection
            ];

            return response()->json([
                'success' => true,
                'cor' => $cor,
                'schedule' => $schedule,
                'student' => $studentData,
                'schoolYear' => $currentSchoolYear,
                'enrollment' => $enrollment
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to load COR data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle COR printing settings
     */
    public function updateCORPrintingSettings(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $enabled = $request->boolean('enabled');
            
            // Store the setting in a configuration table or cache
            // For now, we'll use a simple cache approach
            cache(['cor_printing_enabled' => $enabled], now()->addDays(30));
            
            Log::info('COR printing settings updated', [
                'enabled' => $enabled,
                'updated_by' => $user->id,
                'updated_by_name' => $user->firstname . ' ' . $user->lastname
            ]);

            return response()->json([
                'success' => true,
                'message' => 'COR printing settings updated successfully',
                'enabled' => $enabled
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update COR printing settings', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'error' => 'Failed to update COR printing settings',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get student schedule from enrollment (helper method)
     */
    private function getStudentScheduleFromEnrollment($enrollmentId, $schoolYearId)
    {
        // Get class details for the enrollment
        $classDetails = DB::table('class_details')
            ->join('class', 'class_details.class_id', '=', 'class.id')
            ->join('subjects', 'class.subject_id', '=', 'subjects.id')
            ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
            ->where('class_details.enrollment_id', $enrollmentId)
            ->where('class_details.is_enrolled', true)
            ->where('class.school_year_id', $schoolYearId)
            ->select([
                'class.id as class_id',
                'subjects.code as subject_code',
                'subjects.name as subject_name',
                'class.day_of_week',
                'class.start_time',
                'class.end_time',
                'faculty.firstname as faculty_firstname',
                'faculty.lastname as faculty_lastname'
            ])
            ->get();
            
        // Debug logging for schedule fetching
        Log::info('Schedule Query Debug', [
            'enrollment_id' => $enrollmentId,
            'school_year_id' => $schoolYearId,
            'class_details_count' => $classDetails->count(),
            'raw_class_details' => $classDetails->toArray()
        ]);

        // Convert to flat array for COR display
        $schedule = [];
        
        foreach ($classDetails as $class) {
            $schedule[] = [
                'class_id' => $class->class_id,
                'subject_code' => $class->subject_code,
                'subject_name' => $class->subject_name,
                'start_time' => $class->start_time,
                'end_time' => $class->end_time,
                'faculty_name' => $class->faculty_firstname . ' ' . $class->faculty_lastname,
                'day_of_week' => $class->day_of_week,
                'room' => 'TBA' // Room information not available in class table
            ];
        }

        return $schedule;
    }

    /**
     * Display transferee evaluations for registrar approval
     */
    public function transfereeApprovals()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return redirect()->route('login');
        }

        // Get current school year
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Registrar/Registrar_TransfereeApprovals', [
                'user' => $user,
                'evaluations' => [],
                'stats' => [],
                'error' => 'No active school year found.'
            ]);
        }

        // Get transferee evaluations that need registrar approval
        $evaluations = Enrollment::where('school_year_id', $currentSchoolYear->id)
            ->where('enrollment_type', 'transferee')
            ->where('status', 'evaluated')
            ->with([
                'studentPersonalInfo.user',
                'strand',
                'coordinator'
            ])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($enrollment) {
                $studentInfo = $enrollment->studentPersonalInfo;
                $user = $studentInfo->user ?? null;
                $coordinator = $enrollment->coordinator;
                
                // Get credited subjects for this student
                $creditedSubjects = TransfereeCreditedSubject::where('student_id', $user->id ?? 0)->get();
                
                // Get previous school info through student personal info
                $previousSchool = null;
                if ($studentInfo && $studentInfo->id) {
                    $previousSchool = TransfereePreviousSchool::where('student_personal_info_id', $studentInfo->id)->first();
                }
                
                return [
                    'id' => $enrollment->id,
                    'student_name' => $user ? ($user->firstname . ' ' . $user->lastname) : 'Unknown Student',
                    'student_email' => $user->email ?? 'No Email',
                    'student_lrn' => $studentInfo->lrn ?? 'No LRN',
                    'intended_grade_level' => $enrollment->intended_grade_level,
                    'recommended_strand' => $enrollment->strand->name ?? 'No Strand',
                    'previous_school' => $previousSchool->last_school ?? ($studentInfo->previous_school ?? 'Not specified'),
                    'coordinator_name' => $coordinator ? ($coordinator->firstname . ' ' . $coordinator->lastname) : 'Unknown',
                    'evaluation_date' => $enrollment->updated_at,
                    'credited_subjects_count' => $creditedSubjects->count()
                ];
            });

        // Calculate stats
        $stats = [
            'total_evaluations' => $evaluations->count(),
            'pending_approval' => $evaluations->count(),
            'total_credited_subjects' => $evaluations->sum('credited_subjects_count')
        ];

        return Inertia::render('Registrar/Registrar_TransfereeApprovals', [
            'user' => $user,
            'evaluations' => $evaluations,
            'stats' => $stats,
            'currentSchoolYear' => $currentSchoolYear
        ]);
    }

    /**
     * Approve a transferee evaluation
     */
    public function approveTransfereeEvaluation(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        try {
            $enrollment = Enrollment::with(['studentPersonalInfo.user'])
                ->findOrFail($enrollmentId);

            if ($enrollment->enrollment_type !== 'transferee' || $enrollment->status !== 'evaluated') {
                return response()->json([
                    'error' => 'Invalid evaluation',
                    'message' => 'This enrollment is not a transferee evaluation or has already been processed.'
                ], 422);
            }

            // Update enrollment status to approved by registrar
            $enrollment->update([
                'status' => 'approved_by_registrar',
                'registrar_id' => $user->id,
                'registrar_approval_date' => now(),
                'registrar_notes' => $request->notes ?? null
            ]);

            // Get credited subjects count for logging
            $creditedSubjectsCount = TransfereeCreditedSubject::where('student_id', $enrollment->studentPersonalInfo->user_id)->count();
            
            Log::info('Transferee evaluation approved by registrar', [
                'enrollment_id' => $enrollment->id,
                'student_name' => $enrollment->studentPersonalInfo->user->firstname . ' ' . $enrollment->studentPersonalInfo->user->lastname,
                'registrar_id' => $user->id,
                'registrar_name' => $user->firstname . ' ' . $user->lastname,
                'credited_subjects' => $creditedSubjectsCount
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Transferee evaluation approved successfully. The coordinator can now proceed with enrollment.',
                'enrollment' => [
                    'id' => $enrollment->id,
                    'status' => $enrollment->status,
                    'student_name' => $enrollment->studentPersonalInfo->user->firstname . ' ' . $enrollment->studentPersonalInfo->user->lastname
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to approve transferee evaluation', [
                'enrollment_id' => $enrollmentId,
                'registrar_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to approve evaluation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a transferee evaluation
     */
    public function rejectTransfereeEvaluation(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:500'
        ]);

        try {
            $enrollment = Enrollment::with(['studentPersonalInfo.user'])
                ->findOrFail($enrollmentId);

            if ($enrollment->enrollment_type !== 'transferee' || $enrollment->status !== 'evaluated') {
                return response()->json([
                    'error' => 'Invalid evaluation',
                    'message' => 'This enrollment is not a transferee evaluation or has already been processed.'
                ], 422);
            }

            // Update enrollment status back to pending evaluation with rejection reason
            $enrollment->update([
                'status' => 'pending_evaluation',
                'registrar_rejection_reason' => $request->rejection_reason,
                'registrar_rejection_date' => now(),
                'registrar_id' => $user->id
            ]);

            Log::info('Transferee evaluation rejected by registrar', [
                'enrollment_id' => $enrollment->id,
                'student_name' => $enrollment->studentPersonalInfo->user->firstname . ' ' . $enrollment->studentPersonalInfo->user->lastname,
                'registrar_id' => $user->id,
                'rejection_reason' => $request->rejection_reason
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Transferee evaluation rejected. The coordinator will need to re-evaluate.',
                'enrollment' => [
                    'id' => $enrollment->id,
                    'status' => $enrollment->status,
                    'student_name' => $enrollment->studentPersonalInfo->user->firstname . ' ' . $enrollment->studentPersonalInfo->user->lastname
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to reject transferee evaluation', [
                'enrollment_id' => $enrollmentId,
                'registrar_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to reject evaluation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display enrolled students page for COR printing
     */
    public function enrolledStudentsPage()
    {
        try {
            $user = Auth::user();
            
            if ($user->role !== 'registrar') {
                return redirect()->route('login')->with('error', 'Unauthorized access');
            }

            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return Inertia::render('Registrar/EnrolledStudents', [
                    'enrolledStudents' => [],
                    'sections' => [],
                    'strands' => [],
                    'schoolYear' => null,
                    'message' => 'No active school year found'
                ]);
            }

            // Get all enrolled students with their details
            $enrolledStudents = DB::table('enrollments')
                ->join('student_personal_info', 'enrollments.student_personal_info_id', '=', 'student_personal_info.id')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', 'enrollments.strand_id', '=', 'strands.id')
                ->where('enrollments.school_year_id', $activeSchoolYear->id)
                ->where('enrollments.status', 'enrolled')
                ->where('users.role', 'student')
                ->select([
                    'users.id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'users.id as student_id',
                    'enrollments.id as enrollment_id',
                    'enrollments.intended_grade_level as grade_level',
                    'enrollments.created_at as enrollment_date',
                    'enrollments.enrollment_type',
                    'sections.id as section_id',
                    'sections.section_name',
                    'sections.year_level as section_grade',
                    'strands.id as strand_id',
                    'strands.name as strand_name',
                    'strands.code as strand_code',
                    'student_personal_info.lrn'
                ])
                ->orderBy('users.lastname')
                ->orderBy('users.firstname')
                ->get();

            // Get all sections for filtering
            $sections = Section::with('strand')
                ->where('school_year_id', $activeSchoolYear->id)
                ->orderBy('section_name')
                ->get();

            // Get all strands for filtering
            $strands = Strand::orderBy('name')->get();

            // Log debug information
            Log::info('Enrolled Students Page Data', [
                'enrolled_students_count' => $enrolledStudents->count(),
                'sections_count' => $sections->count(),
                'strands_count' => $strands->count(),
                'active_school_year' => $activeSchoolYear->id,
                'sample_student' => $enrolledStudents->first()
            ]);

            return Inertia::render('Registrar/EnrolledStudents', [
                'enrolledStudents' => $enrolledStudents,
                'sections' => $sections,
                'strands' => $strands,
                'schoolYear' => $activeSchoolYear,
                'debug' => [
                    'total_enrolled' => $enrolledStudents->count(),
                    'query_executed' => true,
                    'school_year_id' => $activeSchoolYear->id
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to load enrolled students page', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return Inertia::render('Registrar/EnrolledStudents', [
                'enrolledStudents' => [],
                'sections' => [],
                'strands' => [],
                'schoolYear' => null,
                'error' => 'Failed to load enrolled students data'
            ]);
        }
    }

    public function getEnrollmentAnalytics(Request $request)
    {
        try {
            $schoolYearId = $request->school_year_id ?: SchoolYear::where('is_active', true)->first()?->id;
            
            if (!$schoolYearId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found',
                    'trends' => [],
                    'demographics' => []
                ]);
            }

            // Get enrollment trends
            $thisWeek = DB::table('enrollments')
                ->where('school_year_id', $schoolYearId)
                ->where('created_at', '>=', now()->startOfWeek())
                ->count();

            $thisMonth = DB::table('enrollments')
                ->where('school_year_id', $schoolYearId)
                ->where('created_at', '>=', now()->startOfMonth())
                ->count();

            // Calculate average processing time
            $avgProcessingDays = DB::table('enrollments')
                ->where('school_year_id', $schoolYearId)
                ->where('status', 'enrolled')
                ->whereNotNull('updated_at')
                ->selectRaw('AVG(DATEDIFF(updated_at, created_at)) as avg_days')
                ->value('avg_days') ?? 0;

            // Get enrollment by strand for demographics
            $strandEnrollments = DB::table('enrollments as e')
                ->join('strands as s', 'e.strand_id', '=', 's.id')
                ->where('e.school_year_id', $schoolYearId)
                ->groupBy('s.id', 's.name', 's.code')
                ->select('s.name', 's.code', DB::raw('COUNT(*) as count'))
                ->get();

            // Get enrollment by status
            $statusBreakdown = DB::table('enrollments')
                ->where('school_year_id', $schoolYearId)
                ->groupBy('status')
                ->select('status', DB::raw('COUNT(*) as count'))
                ->get();

            Log::info('Enrollment analytics generated', [
                'school_year_id' => $schoolYearId,
                'this_week' => $thisWeek,
                'this_month' => $thisMonth,
                'avg_processing_days' => round($avgProcessingDays, 1),
                'strand_enrollments' => $strandEnrollments->count(),
                'status_breakdown' => $statusBreakdown->count()
            ]);

            return response()->json([
                'success' => true,
                'trends' => [
                    'this_week' => $thisWeek,
                    'this_month' => $thisMonth,
                    'avg_processing_days' => round($avgProcessingDays, 1)
                ],
                'demographics' => [
                    'by_strand' => $strandEnrollments,
                    'by_status' => $statusBreakdown
                ],
                'school_year_id' => $schoolYearId
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating enrollment analytics', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate analytics',
                'trends' => [
                    'this_week' => 0,
                    'this_month' => 0,
                    'avg_processing_days' => 0
                ],
                'demographics' => [
                    'by_strand' => [],
                    'by_status' => []
                ]
            ]);
        }
    }

    /**
     * Generate PDF for student list report
     */
    private function generateStudentListPDF($students, $filters, $filename)
    {
        try {
            // Get school information
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $schoolYear = $activeSchoolYear ? $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end : 'N/A';
            
            // Create HTML content for PDF
            $html = $this->buildStudentListPDFHTML($students, $filters, $schoolYear);
            
            // Use simple HTML response that can be printed to PDF by browser
            return response($html, 200, [
                'Content-Type' => 'text/html',
                'Content-Disposition' => "inline; filename=\"{$filename}.html\"",
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error generating student list PDF', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return error response
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Build HTML content for student list PDF
     */
    private function buildStudentListPDFHTML($students, $filters, $schoolYear)
    {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Enrolled Students Report</title>
            <style>
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                    @page { size: A4 landscape; margin: 0.5in; }
                }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11px; 
                    margin: 20px;
                    line-height: 1.4;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 20px; 
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                }
                .header h1 { 
                    color: #333; 
                    margin: 0; 
                    font-size: 18px;
                }
                .header h2 { 
                    color: #666; 
                    margin: 5px 0; 
                    font-size: 14px;
                }
                .info { 
                    margin-bottom: 15px; 
                    background-color: #f8f9fa;
                    padding: 10px;
                    border-radius: 5px;
                }
                .info p { margin: 3px 0; }
                .print-button {
                    background-color: #007bff;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-bottom: 20px;
                    font-size: 14px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px; 
                    font-size: 10px;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left; 
                    vertical-align: top;
                }
                th { 
                    background-color: #f5f5f5; 
                    font-weight: bold; 
                    font-size: 9px;
                    text-transform: uppercase;
                }
                .text-center { text-align: center; }
                .status-enrolled { background-color: #d4edda; }
                .status-pending { background-color: #fff3cd; }
                .status-approved { background-color: #d1ecf1; }
                .footer { 
                    margin-top: 20px; 
                    text-align: center; 
                    font-size: 9px; 
                    color: #666; 
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
            </style>
            <script>
                function printReport() {
                    window.print();
                }
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 1000);
                }
            </script>
        </head>
        <body>
            <button onclick="printReport()" class="print-button no-print">🖨️ Print Report</button>
            
            <div class="header">
                <h1>ONSTS - Enrolled Students Report</h1>
                <h2>School Year: ' . $schoolYear . '</h2>
                <p>Generated on: ' . date('F j, Y \a\t g:i A') . '</p>
            </div>
            
            <div class="info">
                <p><strong>Report Filters:</strong></p>';
                
        if (!empty($filters['section_id'])) {
            $html .= '<p>Section ID: ' . $filters['section_id'] . '</p>';
        }
        if (!empty($filters['strand_id'])) {
            $html .= '<p>Strand ID: ' . $filters['strand_id'] . '</p>';
        }
        if (!empty($filters['semester'])) {
            $html .= '<p>Semester: ' . $filters['semester'] . '</p>';
        }
        
        $html .= '
                <p>Total Records: ' . count($students) . '</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Section</th>
                        <th>Grade Level</th>
                        <th>Classes</th>
                        <th>Subjects</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>';
                
        foreach ($students as $student) {
            $statusClass = '';
            $status = $student->enrollment_status ?: $student->student_status ?: 'N/A';
            if ($status === 'enrolled' || $status === 'approved') {
                $statusClass = 'status-enrolled';
            } elseif ($status === 'pending') {
                $statusClass = 'status-pending';
            }
            
            // Format proper name using firstname and lastname
            $firstName = trim($student->firstname ?: '');
            $lastName = trim($student->lastname ?: '');
            $fullName = trim($firstName . ' ' . $lastName) ?: trim($student->username ?: 'N/A');
            
            $html .= '
                    <tr class="' . $statusClass . '">
                        <td>' . htmlspecialchars($fullName) . '</td>
                        <td>' . htmlspecialchars($student->email ?: 'N/A') . '</td>
                        <td>' . htmlspecialchars($student->section_name ?: 'N/A') . '</td>
                        <td class="text-center">' . htmlspecialchars($student->grade_level ?: 'N/A') . '</td>
                        <td class="text-center">' . ($student->total_classes ?: '0') . '</td>
                        <td>' . htmlspecialchars($student->subjects_enrolled ?: 'No subjects') . '</td>
                        <td class="text-center">' . htmlspecialchars($status) . '</td>
                    </tr>';
        }
        
        $html .= '
                </tbody>
            </table>
            
            <div class="footer">
                <p>This report was generated automatically by the ONSTS system.</p>
                <p>For questions or concerns, please contact the registrar\'s office.</p>
            </div>
        </body>
        </html>';
        
        return $html;
    }

    /**
     * Generate Excel-formatted CSV with proper layout
     */
    private function generateExcelFormattedCSV($students, $filename)
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
            'Cache-Control' => 'no-cache, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ];

        $callback = function() use ($students) {
            $file = fopen('php://output', 'w');
            
            // Set UTF-8 BOM for proper Excel encoding
            fwrite($file, "\xEF\xBB\xBF");
            
            // Create header row with clear column names
            fputcsv($file, [
                'Full Name',
                'Email Address', 
                'Section',
                'Grade Level',
                'Enrollment Status'
            ]);
            
            // Add data rows with proper formatting
            foreach ($students as $student) {
                // Format proper name using firstname and lastname
                $firstName = trim($student->firstname ?: '');
                $lastName = trim($student->lastname ?: '');
                $fullName = trim($firstName . ' ' . $lastName) ?: trim($student->username ?: 'N/A');
                
                // Clean and format other fields
                $email = trim($student->email ?: 'N/A');
                $section = trim($student->section_name ?: 'N/A');
                $gradeLevel = trim($student->grade_level ?: 'N/A');
                $status = trim($student->enrollment_status ?: $student->student_status ?: 'N/A');
                
                // Write row with proper text formatting
                fputcsv($file, [
                    $fullName,
                    $email,
                    $section,
                    $gradeLevel,
                    $status
                ]);
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
