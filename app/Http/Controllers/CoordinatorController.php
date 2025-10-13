<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Student;
use App\Models\StudentPersonalInfo;
use App\Models\Section;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Semester;
use App\Models\SchoolYear;

class CoordinatorController extends Controller
{
    public function __construct()
    {
        // Middleware is now handled in routes or via Route::middleware()
    }

    /**
     * Display pending enrollments for coordinator review (Page render)
     * Following HCI Principle 4: Consistency and Standards - Separate student types for better organization
     * Following HCI Principle 6: Recognition rather than recall - Clear categorization reduces cognitive load
     */
    public function enrollmentPage()
    {
        try {
            Log::info('=== ENROLLMENT PAGE ACCESSED ===', [
                'timestamp' => now(),
                'user_id' => Auth::id()
            ]);
            
            // Check authentication - should be handled by middleware now
            $user = Auth::user();
            Log::info('=== USER AUTHENTICATION CHECK ===', [
                'user_authenticated' => $user ? true : false,
                'user_id' => $user ? $user->id : null,
                'user_role' => $user ? $user->role : null
            ]);
            
            if (!$user) {
                Log::warning('User not authenticated, redirecting to login');
                return redirect()->route('login')->with('error', 'Please log in to access this page.');
            }
            
            // Get the active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            
            if (!$activeSchoolYear) {
                return Inertia::render('Faculty/Faculty_Enrollment', [
                    'newStudents' => [],
                    'transfereeStudents' => [],
                    'continuingStudents' => [],
                    'rejectedStudents' => [],
                    'activeSchoolYear' => null,
                    'allowFacultyCorPrint' => true
                ]);
            }

            // Helper to process a student (attach preferences and address)
            $processStudent = function ($student) {
                // Get student_personal_info.id for strand preferences lookup
                $studentPersonalInfo = DB::table('student_personal_info')
                    ->where('user_id', $student->user_id)
                    ->first();
                
                $preferences = collect();
                if ($studentPersonalInfo) {
                    try {
                        // Try different possible column names for student reference
                        if (Schema::hasColumn('student_strand_preferences', 'student_personal_info_id')) {
                            $preferences = \App\Models\StudentStrandPreference::with('strand')
                                ->where('student_personal_info_id', $studentPersonalInfo->id)
                                ->orderBy('preference_order')
                                ->get();
                        } elseif (Schema::hasColumn('student_strand_preferences', 'user_id')) {
                            $preferences = \App\Models\StudentStrandPreference::with('strand')
                                ->where('user_id', $student->user_id)
                                ->orderBy('preference_order')
                                ->get();
                        } elseif (Schema::hasColumn('student_strand_preferences', 'student_id')) {
                            $preferences = \App\Models\StudentStrandPreference::with('strand')
                                ->where('student_id', $studentPersonalInfo->id)
                                ->orderBy('preference_order')
                                ->get();
                        }
                    } catch (\Exception $e) {
                        Log::warning('Error fetching strand preferences: ' . $e->getMessage());
                        $preferences = collect();
                    }
                }

                $codes = $preferences->map(fn($p) => $p->strand?->code)->filter()->values();
                $names = $preferences->map(fn($p) => $p->strand?->name)->filter()->values();
                $student->strand_preferences = $codes->isNotEmpty() ? $codes->toArray() : ($names->isNotEmpty() ? $names->toArray() : ['No preferences specified']);
                $student->address = $student->address ?: 'No address provided';
                
                // Add transferee data if applicable (check both fields)
                $isTransferee = ($student->user && $student->user->student_type === 'transferee') || 
                               ($student->student_status === 'Transferee');
                               
                if ($isTransferee) {
                    // Ensure user is marked as transferee in users table
                    if ($student->user && $student->user->student_type !== 'transferee') {
                        $student->user->update(['student_type' => 'transferee']);
                        $student->user->refresh();
                    }
                    
                    $student->previous_schools = $student->user->transfereePreviousSchools ?? collect();
                    $student->credited_subjects = $student->user->transfereeCreditedSubjects ?? collect();
                    
                    // Get credited subject IDs for filtering
                    $student->credited_subject_ids = $student->credited_subjects->pluck('subject_id')->toArray();
                }
                
                // Ensure student_status is available in frontend
                $student->student_status = $student->student_status;
                
                return $student;
            };

            // Get all students who have submitted enrollment applications
            // Query enrollments table directly since that's where the actual enrollment records are
            $enrollments = DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->where('enrollments.school_year_id', $activeSchoolYear->id)
                ->where('users.role', 'student')
                ->whereIn('enrollments.status', ['pending', 'approved', 'rejected', 'enrolled']) // Include all relevant statuses
                ->select([
                    'users.id as user_id',
                    'users.firstname',
                    'users.lastname', 
                    'users.email',
                    'users.student_type',
                    'student_personal_info.grade_level',
                    'student_personal_info.student_status',
                    'student_personal_info.address',
                    'enrollments.status as enrollment_status',
                    'enrollments.id as enrollment_id',
                    'enrollments.created_at as enrollment_date',
                    'enrollments.grade_level as enrollment_grade_level',
                    'enrollments.intended_grade_level'
                ])
                ->orderBy('enrollments.created_at', 'desc')
                ->get();
                
            Log::info('=== RAW ENROLLMENT QUERY RESULTS ===', [
                'total_found' => $enrollments->count(),
                'enrollments' => $enrollments->toArray(),
                'active_school_year_id' => $activeSchoolYear->id,
                'query_conditions' => [
                    'school_year_id' => $activeSchoolYear->id,
                    'user_role' => 'student',
                    'statuses' => ['pending', 'approved', 'rejected', 'enrolled']
                ]
            ]);
            
            // Separate by student type following HCI principles
            $newStudents = collect();
            $transfereeStudents = collect();
            $rejectedStudents = collect();
            $continuingStudents = collect();

            foreach ($enrollments as $studentData) {
                // Create a student-like object from student personal info data
                $student = (object)[
                    'id' => $studentData->user_id,
                    'user_id' => $studentData->user_id,
                    'enrollment_id' => $studentData->enrollment_id,
                    'enrollment_status' => $studentData->enrollment_status,
                    'enrollment_date' => $studentData->enrollment_date,
                    'user' => (object)[
                        'id' => $studentData->user_id,
                        'firstname' => $studentData->firstname,
                        'lastname' => $studentData->lastname,
                        'email' => $studentData->email,
                        'student_type' => $studentData->student_type
                    ],
                    'student_status' => $studentData->student_status,
                    'grade_level' => $studentData->grade_level ?: $studentData->enrollment_grade_level,
                    'intended_grade_level' => $studentData->intended_grade_level,
                    'address' => $studentData->address ?: 'No address provided'
                ];
                
                // Get enrollment status from the enrollment record
                $status = $studentData->enrollment_status;
                $processed = $processStudent($student);
                
                // Get student type from student data
                $studentType = $studentData->student_type ?? 
                              $studentData->student_status ?? 
                              'new';
                
                Log::info('Processing student for enrollment page', [
                    'student_id' => $studentData->user_id,
                    'firstname' => $studentData->firstname,
                    'lastname' => $studentData->lastname,
                    'original_student_type' => $studentData->student_type,
                    'student_status' => $studentData->student_status,
                    'determined_type' => $studentType,
                    'enrollment_status' => $status
                ]);
                
                // Normalize the student type values - INCLUDE continuing students for pre-enrollment management
                if (strtolower($studentType) === 'transferee') {
                    $studentType = 'transferee';
                } elseif (strtolower($studentType) === 'continuing') {
                    $studentType = 'continuing'; // Keep continuing students for pre-enrollment management
                } else {
                    $studentType = 'new';
                }
                
                // Categorize students based on enrollment status
                if ($status === 'rejected') {
                    $rejectedStudents->push($processed);
                } else {
                    // Include pending, approved, enrolled, or students without enrollment records
                    // Separate by student type for better organization (HCI Principle 4: Consistency)
                    switch ($studentType) {
                        case 'new':
                            $newStudents->push($processed);
                            break;
                        case 'transferee':
                            $transfereeStudents->push($processed);
                            break;
                        case 'continuing':
                            $continuingStudents->push($processed); // Separate continuing students
                            break;
                        default:
                            $newStudents->push($processed); // Default to new if type is unclear
                    }
                }
            }

            // Add logging to debug what students are found
            Log::info('Enrollment page data', [
                'total_enrollments' => $enrollments->count(),
                'new_students' => $newStudents->count(),
                'transferee_students' => $transfereeStudents->count(),
                'continuing_students' => $continuingStudents->count(),
                'rejected_students' => $rejectedStudents->count(),
                'active_school_year' => $activeSchoolYear->id ?? 'none'
            ]);

            // Get available strands and sections for enrollment management
            $strands = \App\Models\Strand::all();
            $sections = \App\Models\Section::with('strand')->get();
            
            // Group sections by strand for easier filtering
            $sectionsByStrand = $sections->groupBy('strand_id')->map(function ($strandSections) {
                return $strandSections->map(function ($section) {
                    return [
                        'id' => $section->id,
                        'section_name' => $section->section_name,
                        'year_level' => $section->year_level,
                        'strand_id' => $section->strand_id
                    ];
                });
            });

            return Inertia::render('Faculty/Faculty_Enrollment', [
                'newStudents' => $newStudents,
                'transfereeStudents' => $transfereeStudents,
                'continuingStudents' => $continuingStudents,
                'rejectedStudents' => $rejectedStudents,
                'activeSchoolYear' => $activeSchoolYear,
                'allowFacultyCorPrint' => (bool)($activeSchoolYear->allow_faculty_cor_print ?? true),
                'strands' => $strands,
                'sections' => $sections,
                'sectionsByStrand' => $sectionsByStrand,
                'auth' => [
                    'user' => Auth::user()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in enrollmentPage: ' . $e->getMessage());
            return Inertia::render('Faculty/Faculty_Enrollment', [
                'newStudents' => [],
                'transfereeStudents' => [],
                'continuingStudents' => [],
                'rejectedStudents' => [],
                'activeSchoolYear' => null,
                'allowFacultyCorPrint' => true,
                'auth' => [
                    'user' => Auth::user()
                ]
            ]);
        }
    }

    /**
     * Get Grade 11 students eligible for progression to Grade 12
     */
    public function getGrade11StudentsForProgression()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found',
                    'students' => []
                ]);
            }

            // Get Grade 11 students who are enrolled and eligible for progression
            $grade11Students = DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->join('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', 'enrollments.strand_id', '=', 'strands.id')
                ->where('student_personal_info.grade_level', '11')
                ->where('enrollments.school_year_id', $activeSchoolYear->id)
                ->where('enrollments.status', 'enrolled')
                ->where('users.role', 'student')
                ->select([
                    'student_personal_info.id as personal_info_id',
                    'users.id as user_id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'student_personal_info.grade_level',
                    'student_personal_info.lrn',
                    'strands.name as strand_name',
                    'strands.code as strand_code',
                    'sections.section_name',
                    'enrollments.status as enrollment_status'
                ])
                ->get();

            return response()->json([
                'success' => true,
                'students' => $grade11Students,
                'active_school_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                'allow_progression' => $activeSchoolYear->allow_grade_progression ?? false
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching Grade 11 students for progression: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Grade 11 students: ' . $e->getMessage(),
                'students' => []
            ], 500);
        }
    }

    /**
     * Get enrollment data via API for coordinator review
     */
    public function getEnrollmentData()
    {
        // Get the active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Enrollment', [
                'pendingStudents' => [],
                'rejectedStudents' => [],
                'activeSchoolYear' => null,
                'message' => 'No active school year found. Please contact the registrar.'
            ]);
        }

        // Derive groups from enrollments (active SY)
        $studentsAll = Student::with(['user', 'strand', 'section', 'strandPreferences.strand'])->get();
        $pendingStudents = collect();
        $approvedStudents = collect();
        $rejectedStudents = collect();

        foreach ($studentsAll as $student) {
            $latest = DB::table('enrollments')
                ->where('student_id', $student->user_id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->orderByDesc('id')
                ->first();

            Log::info('Student data:', [
                'id' => $student->id,
                'address' => $student->address,
                'strand_preferences_count' => optional($student->strandPreferences)->count(),
            ]);

            $student->address = $student->address ?: 'No address provided';
            $status = $latest->status ?? 'pending';
            if ($status === 'approved') {
                $approvedStudents->push($student);
            } elseif ($status === 'rejected') {
                $rejectedStudents->push($student);
            } else {
                $pendingStudents->push($student);
            }
        }

        return Inertia::render('Faculty/Faculty_Enrollment', [
            'pendingStudents' => $pendingStudents,
            'rejectedStudents' => $rejectedStudents,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    /**
     * Show enrolled students page
     */
    public function studentsPage()
    {
        // Get the active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Students', [
                'enrolledStudents' => collect([]),
                'allowFacultyCorPrint' => true,
                'auth' => [
                    'user' => Auth::user()
                ]
            ]);
        }

        // Debug: Check what data exists
        $allEnrollments = DB::table('enrollments')
            ->where('school_year_id', $activeSchoolYear->id)
            ->get();
        
        Log::info('Faculty Students Debug', [
            'active_school_year_id' => $activeSchoolYear->id,
            'total_enrollments' => $allEnrollments->count(),
            'enrollment_statuses' => $allEnrollments->pluck('status')->unique()->values()->toArray(),
            'enrolled_count' => $allEnrollments->where('status', 'enrolled')->count(),
            'approved_count' => $allEnrollments->where('status', 'approved')->count(),
        ]);

        // Get enrolled students for the active school year only via enrollments
        // Include both 'enrolled' and 'approved' status students
        $enrolledUserIds = DB::table('enrollments')
            ->where('school_year_id', $activeSchoolYear->id)
            ->whereIn('status', ['enrolled', 'approved'])
            ->pluck('student_id');

        $enrolledStudents = Student::with(['user', 'strand', 'section', 'schoolYear'])
            ->whereIn('user_id', $enrolledUserIds)
            ->get();

        Log::info('Faculty Students Data', [
            'enrolled_user_ids_count' => $enrolledUserIds->count(),
            'enrolled_user_ids' => $enrolledUserIds->toArray(),
            'found_students_count' => $enrolledStudents->count(),
            'student_sample' => $enrolledStudents->take(2)->map(function($s) {
                return [
                    'id' => $s->id,
                    'user_id' => $s->user_id,
                    'user_name' => $s->user ? $s->user->firstname . ' ' . $s->user->lastname : 'No User',
                    'strand' => $s->strand ? $s->strand->name : 'No Strand',
                    'section' => $s->section ? $s->section->section_name : 'No Section'
                ];
            })->toArray()
        ]);

        return Inertia::render('Faculty/Faculty_Students', [
            'enrolledStudents' => $enrolledStudents->map(function($student) {
                return [
                    'id' => $student->id,
                    'user' => $student->user,
                    'strand' => $student->strand,
                    'section' => $student->section,
                    'schoolYear' => $student->schoolYear,
                    'grade_level' => $student->grade_level,
                    'enrollment_status' => $student->enrollment_status,
                    'status' => $student->enrollment_status, // Add status field for modal
                    'personalInfo' => [
                        'grade_level' => $student->grade_level
                    ]
                ];
            }),
            'allowFacultyCorPrint' => (bool)($activeSchoolYear->allow_faculty_cor_print ?? true),
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    /**
     * Get student enrollment details for modal view
     */
    public function getStudentDetails($id)
    {
        try {
            // The ID passed is the user_id, not student table ID
            $user = \App\Models\User::where('id', $id)
                ->where('role', 'student')
                ->firstOrFail();

            // Get student_personal_info for this user
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $user->id)
                ->first();
                
            // Get enrollment info
            $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
            $enrollment = null;
            if ($activeSchoolYear) {
                $enrollment = DB::table('enrollments')
                    ->where('student_id', $user->id)
                    ->where('school_year_id', $activeSchoolYear->id)
                    ->first();
            }
            
            $preferences = collect();
            if ($studentPersonalInfo) {
                try {
                    // Try different possible column names for student reference
                    if (Schema::hasColumn('student_strand_preferences', 'student_personal_info_id')) {
                        $preferences = \App\Models\StudentStrandPreference::with('strand')
                            ->where('student_personal_info_id', $studentPersonalInfo->id)
                            ->orderBy('preference_order')
                            ->get();
                    } elseif (Schema::hasColumn('student_strand_preferences', 'user_id')) {
                        $preferences = \App\Models\StudentStrandPreference::with('strand')
                            ->where('user_id', $user->id)
                            ->orderBy('preference_order')
                            ->get();
                    } elseif (Schema::hasColumn('student_strand_preferences', 'student_id')) {
                        $preferences = \App\Models\StudentStrandPreference::with('strand')
                            ->where('student_id', $studentPersonalInfo->id)
                            ->orderBy('preference_order')
                            ->get();
                    }
                } catch (\Exception $e) {
                    Log::warning('Error fetching strand preferences in getStudentDetails: ' . $e->getMessage());
                    $preferences = collect();
                }
            }

            $codes = $preferences->map(fn($p) => $p->strand?->code)->filter()->values();
            $names = $preferences->map(fn($p) => $p->strand?->name)->filter()->values();
            
            // Build response data structure
            $studentData = [
                'id' => $user->id,
                'user_id' => $user->id,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'email' => $user->email,
                'student_type' => $user->student_type,
                'grade_level' => $studentPersonalInfo->grade_level ?? 'Not specified',
                'student_status' => $studentPersonalInfo->student_status ?? 'Not specified',
                'address' => $studentPersonalInfo->address ?? 'No address provided',
                'enrollment_status' => $enrollment->status ?? 'No enrollment',
                'enrollment_id' => $enrollment->id ?? null,
                'strand_preferences' => $codes->isNotEmpty() ? $codes->toArray() : 
                                     ($names->isNotEmpty() ? $names->toArray() : ['No preferences specified']),
                'psa_birth_certificate' => $studentPersonalInfo->psa_birth_certificate ?? null,
                'report_card' => $studentPersonalInfo->report_card ?? null,
                'image' => $studentPersonalInfo->image ?? null,
            ];

            // Clean up document paths - remove any duplicate enrollment_documents prefix
            if ($studentData['psa_birth_certificate']) {
                $studentData['psa_birth_certificate'] = str_replace('enrollment_documents/', '', $studentData['psa_birth_certificate']);
            }
            if ($studentData['report_card']) {
                $studentData['report_card'] = str_replace('enrollment_documents/', '', $studentData['report_card']);
            }
            if ($studentData['image']) {
                $studentData['image'] = str_replace('enrollment_documents/', '', $studentData['image']);
            }

            return response()->json($studentData);
        } catch (\Exception $e) {
            Log::error('Error fetching student details: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to fetch student details'], 500);
        }
    }

    /**
     * Display coordinator profile page
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        
        // Get coordinator user data (coordinators are users with coordinator role)
        $coordinator = $user->role === 'coordinator' || $user->is_coordinator ? $user : null;
        
        return Inertia::render('Faculty/Faculty_Profile', [
            'coordinator' => $coordinator
        ]);
    }

    /**
     * Approve student enrollment and assign strand/section
     */
    public function approveEnrollment(Request $request, $id)
    {
        $validated = $request->validate([
            'assigned_strand' => 'required|in:STEM,HUMSS,ABM,GAS,TVL',
            'section_id' => 'required|exists:sections,id',
            'coordinator_notes' => 'nullable|string'
        ]);

        $student = Student::findOrFail($id);
        $strand = Strand::where('code', $validated['assigned_strand'])->first();
        
        if (!$strand) {
            return response()->json(['error' => 'Invalid strand selected'], 400);
        }
        
        // Update student's assignments (no status write on personal info)
        $student->update([
            'strand_id' => $strand->id,
            'section_id' => $validated['section_id'],
            'coordinator_notes' => $validated['coordinator_notes'] ?? null,
            'reviewed_at' => now(),
            'reviewed_by' => Auth::id()
        ]);

        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if ($activeSchoolYear) {
            try {
                // First, update the enrollment record ONCE (outside the loop)
                $existing = DB::table('enrollments')
                    ->where('student_id', $student->user_id)
                    ->where('school_year_id', $activeSchoolYear->id)
                    ->orderByDesc('id')
                    ->first();

                if ($existing) {
                    DB::table('enrollments')->where('id', $existing->id)->update([
                        'status' => 'enrolled',
                        'strand_id' => $strand->id,
                        'assigned_section_id' => $validated['section_id'],
                        'coordinator_id' => Auth::id(),
                        // prefer reviewed_at if exists, else date_enrolled
                        (Schema::hasColumn('enrollments', 'reviewed_at') ? 'reviewed_at' : (Schema::hasColumn('enrollments', 'date_enrolled') ? 'date_enrolled' : 'updated_at')) => now(),
                        'updated_at' => now(),
                    ]);
                    $enrollmentId = $existing->id;
                    Log::info('Updated existing enrollment', ['enrollment_id' => $enrollmentId, 'student_id' => $student->user_id]);
                } else {
                    $insert = [
                        'student_id' => $student->user_id,
                        'school_year_id' => $activeSchoolYear->id,
                        'strand_id' => $strand->id,
                        'assigned_section_id' => $validated['section_id'],
                        'status' => 'enrolled',
                        'coordinator_id' => Auth::id(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    if (Schema::hasColumn('enrollments', 'submitted_at')) $insert['submitted_at'] = now();
                    if (Schema::hasColumn('enrollments', 'reviewed_at')) $insert['reviewed_at'] = now();
                    if (!Schema::hasColumn('enrollments', 'submitted_at') && Schema::hasColumn('enrollments', 'date_enrolled')) $insert['date_enrolled'] = now();
                    $enrollmentId = DB::table('enrollments')->insertGetId($insert);
                    Log::info('Created new enrollment', ['enrollment_id' => $enrollmentId, 'student_id' => $student->user_id]);
                }

                // Get actual class schedules for the assigned section and strand
                $sectionSchedules = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->join('users', 'class.faculty_id', '=', 'users.id')
                    ->where('class.section_id', $validated['section_id'])
                    ->where('class.school_year_id', $activeSchoolYear->id)
                    ->where('subjects.strand_id', $strand->id)
                    ->select([
                        'class.*',
                        'subjects.code as subject_code',
                        'subjects.name as subject_name',
                        'users.firstname',
                        'users.lastname'
                    ])
                    ->get();

            // Then, create class records for each actual schedule
            foreach ($sectionSchedules as $schedule) {
                $classRecord = DB::table('class')->insertGetId([
                    'subject_id' => $schedule->subject_id,
                    'faculty_id' => $schedule->faculty_id,
                    'school_year_id' => $schedule->school_year_id,
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'duration' => $schedule->duration ?? 90,
                    'semester' => $schedule->semester,
                    'room' => $schedule->room ?? 'TBA',
                    'is_active' => true,
                    // COR-specific fields
                    'student_id' => $student->id,
                    'subject_code' => $schedule->subject_code,
                    'subject_name' => $schedule->subject_name,
                    'strand_name' => $strand->name,
                    'registration_number' => 'REG' . str_pad($student->id, 6, '0', STR_PAD_LEFT),
                    'date_enrolled' => now()->toDateString(),
                    'instructor_name' => $schedule->firstname . ' ' . $schedule->lastname,
                    'student_name' => $student->user->firstname . ' ' . $student->user->lastname,
                    'student_lrn' => $student->lrn ?? 'N/A',
                    'grade_level' => $student->grade_level ?? 'Grade 11',
                    'enrollment_status' => 'approved',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                Log::info('Class record created', ['class_id' => $classRecord, 'subject_id' => $schedule->subject_id]);

                // Add student to class_details table with proper enrollment reference
                DB::table('class_details')->updateOrInsert(
                    [
                        'class_id' => $classRecord,
                        'enrollment_id' => $enrollmentId
                    ],
                    [
                        'section_id' => $validated['section_id'],
                        'is_enrolled' => true,
                        'enrolled_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                );
            }
            
            } catch (\Exception $e) {
                Log::error('Error finalizing enrollment (with assignment): ' . $e->getMessage());
                Log::error('Request data: ' . json_encode($request->all()));
                Log::error('Student ID: ' . $id);
                return response()->json(['error' => 'Failed to finalize enrollment: ' . $e->getMessage()], 500);
            }
        }

        // Note: Notification system removed as requested

        // Send approval notification email
        $this->sendEnrollmentNotification($student, 'approved');

        return response()->json([
            'message' => 'Student enrollment approved successfully!',
            'student' => $student->load(['strand', 'section', 'user'])
        ]);
    }

    /**
     * Reject student enrollment
     */
    public function rejectEnrollment(Request $request, $id)
    {
        $validated = $request->validate([
            'coordinator_notes' => 'required|string'
        ]);

        $student = Student::findOrFail($id);

        // Update enrollments table status to rejected for active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        if ($activeSchoolYear) {
            $existing = DB::table('enrollments')
                ->where('student_id', $student->user_id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->orderByDesc('id')
                ->first();

            if ($existing) {
                DB::table('enrollments')->where('id', $existing->id)->update([
                    'status' => 'rejected',
                    'coordinator_id' => Auth::id(),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('enrollments')->insert([
                    'student_id' => $student->user_id,
                    'school_year_id' => $activeSchoolYear->id,
                    'status' => 'rejected',
                    'coordinator_id' => Auth::id(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Send rejection notification email to student
        $this->sendEnrollmentNotification($student, 'rejected');

        return redirect()->back()->with('success', 'Student enrollment rejected and notification sent.');
    }

    /**
     * Get subjects for enrollment confirmation
     */
    public function getSubjectsForEnrollment(Request $request)
    {
        $strandParam = $request->query('strand');
        $schoolYearId = $request->query('school_year_id', 1);

        // Try to find strand by ID first (if numeric), then by code
        if (is_numeric($strandParam)) {
            $strand = Strand::find($strandParam);
        } else {
            $strand = Strand::where('code', $strandParam)->first();
        }
        
        if (!$strand) {
            // Return debug info if strand not found
            return response()->json([
                'error' => 'Strand not found',
                'strand_param' => $strandParam,
                'available_strands' => Strand::pluck('code', 'id')->toArray()
            ]);
        }

        // Get current active school year if not provided
        if (!$schoolYearId) {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json([
                    'error' => 'No active school year found',
                    'subjects' => [],
                    'message' => 'REGISTRAR DID NOT ACTIVATE THE SCHOOL YEAR YET. Please contact the registrar to activate a school year first.'
                ]);
            }
            $schoolYearId = $activeSchoolYear->id;
        }

        // Get subjects with faculty information for the strand and active semester only
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $subjects = Subject::with(['faculty'])
            ->where('strand_id', $strand->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('semester', $activeSchoolYear->semester)
            ->get();

        // Debug: Check what's in the database
        $allSubjectsForStrand = Subject::where('strand_id', $strand->id)->get();
        $subjectsWithSchoolYear = Subject::where('strand_id', $strand->id)->where('school_year_id', $schoolYearId)->get();

        $formattedSubjects = $subjects->map(function ($subject) {
            return [
                'id' => $subject->id,
                'code' => $subject->code,
                'name' => $subject->name,
                'semester' => $subject->semester,
                'day_of_week' => $subject->day_of_week,
                'start_time' => $subject->start_time,
                'end_time' => $subject->end_time,
                'room' => $subject->room,
                'faculty_name' => $subject->faculty && $subject->faculty->user 
                    ? $subject->faculty->user->firstname . ' ' . $subject->faculty->user->lastname
                    : 'TBA'
            ];
        });

        // Return debug info along with subjects
        return response()->json([
            'subjects' => $formattedSubjects,
            'debug' => [
                'strand_param' => $strandParam,
                'strand_id' => $strand->id,
                'strand_code' => $strand->code,
                'strand_name' => $strand->name,
                'school_year_id' => $schoolYearId,
                'subjects_count' => $subjects->count(),
                'pivot_subjects_count' => $strand->subjects()->where('subjects.school_year_id', $schoolYearId)->count(),
                'direct_subjects_count' => Subject::where('strand_id', $strand->id)->where('school_year_id', $schoolYearId)->count(),
                'all_subjects_for_strand' => Subject::where('strand_id', $strand->id)->pluck('name', 'code')->toArray(),
                'all_subjects_count' => $allSubjectsForStrand->count(),
                'subjects_with_school_year_count' => $subjectsWithSchoolYear->count(),
                'active_school_year_id' => $schoolYearId
            ]
        ]);
    }

    /**
     * Finalize enrollment with subject selection
     */
    public function finalizeEnrollment(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'subjects' => 'nullable|array',
                'subjects.*' => 'exists:subjects,id'
            ]);

            $student = Student::findOrFail($id);

            // Get the active school year with semester - don't create if none exists
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$currentSchoolYear) {
                return redirect()->back()->with('error', 'REGISTRAR DID NOT ACTIVATE THE SCHOOL YEAR YET. Please contact the registrar to activate a school year first.');
            }

            // Check if enrollment already exists for this student and school year
            $existingEnrollment = Enrollment::where('student_id', $student->user_id)
                ->where('school_year_id', $student->school_year_id)
                ->first();

            if ($existingEnrollment) {
                // Update existing enrollment
                $existingEnrollment->update([
                    'strand_id' => $student->strand_id,
                    'status' => 'approved',
                    'coordinator_id' => Auth::user()->faculty->id
                ]);
                $enrollment = $existingEnrollment;
            } else {
                // Create enrollment record - simple structure with just IDs
                $enrollment = Enrollment::create([
                    'student_id' => $student->user_id,
                    'strand_id' => $student->strand_id,
                    'school_year_id' => $currentSchoolYear->id,
                    'status' => 'approved',
                    'coordinator_id' => Auth::user()->faculty->id
                ]);
            }

            // Clear existing subject assignments and add new ones (only if provided)
            if (!empty($validated['subjects']) && method_exists($enrollment, 'subjects')) {
                $enrollment->subjects()->detach(); // Remove existing subjects
                foreach ($validated['subjects'] as $subjectId) {
                    $enrollment->subjects()->attach($subjectId);
                }
            }

            // Store COR data in class table for each selected subject (only if provided)
            foreach (($validated['subjects'] ?? []) as $subjectId) {
                $subject = Subject::find($subjectId);
                
                if ($subject) {
                    Log::info('Processing subject for enrollment', [
                        'subject_id' => $subjectId,
                        'student_id' => $student->id,
                        'enrollment_id' => $enrollment->id
                    ]);

                    // Create class record with COR data
                    $classRecord = DB::table('class')->insertGetId([
                        'subject_id' => $subjectId,
                        'faculty_id' => $subject->faculty_id,
                        'school_year_id' => $subject->school_year_id,
                        'day_of_week' => $subject->day_of_week ?: 'Monday',
                        'start_time' => $subject->start_time ?: '08:00:00',
                        'end_time' => $subject->end_time ?: '09:30:00',
                        'room' => $subject->room ?: 'TBA',
                        'semester' => $currentSchoolYear->semester ?? '1st Semester',
                        'school_year' => ($currentSchoolYear->year_start ?? '2024') . '-' . ($currentSchoolYear->year_end ?? '2025'),
                        'is_active' => true,
                        // COR specific data
                        'student_id' => $student->id,
                        'enrollment_id' => $enrollment->id,
                        'subject_code' => $subject->code ?? 'N/A',
                        'subject_name' => $subject->name ?? 'Unknown Subject',
                        'strand_name' => $student->strand->name ?? 'Not Assigned',
                        'registration_number' => 'REG' . str_pad($enrollment->id, 6, '0', STR_PAD_LEFT),
                        'date_enrolled' => now()->toDateString(),
                        'instructor_name' => $subject->faculty && $subject->faculty->user 
                            ? $subject->faculty->user->firstname . ' ' . $subject->faculty->user->lastname 
                            : 'TBA',
                        'student_name' => $student->user->firstname . ' ' . $student->user->lastname,
                        'student_lrn' => $student->lrn ?? 'N/A',
                        'grade_level' => $student->grade_level ?? 'Grade 11',
                        'enrollment_status' => 'approved',
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    Log::info('Class record created', ['class_id' => $classRecord]);

                    // Add student to class_details table (list of officially enrolled students)
                    DB::table('class_details')->updateOrInsert(
                        [
                            'class_id' => $classRecord,
                            'student_id' => $student->id
                        ],
                        [
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );

                    Log::info('Class details record created/updated');
                }
            }

            // Update enrollments table status to enrolled
            $latest = DB::table('enrollments')
                ->where('student_id', $student->user_id)
                ->where('school_year_id', $currentSchoolYear->id)
                ->orderByDesc('id')
                ->first();
            if ($latest) {
                DB::table('enrollments')->where('id', $latest->id)->update([
                    'status' => 'enrolled',
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('enrollments')->insert([
                    'student_id' => $student->user_id,
                    'school_year_id' => $currentSchoolYear->id,
                    'status' => 'enrolled',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Send notification email to student
            $this->sendEnrollmentNotification($student, 'approved', $enrollment);

            return redirect()->back()->with('success', 'Student enrolled successfully!');
            
        } catch (\Exception $e) {
            Log::error('Enrollment finalization error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return redirect()->back()->with('error', 'Failed to finalize enrollment: ' . $e->getMessage());
        }
    }

    /**
     * Get sections and strands data for enrollment management
     */
    public function getSectionsAndStrands()
    {
        try {
            $strands = Strand::select('id', 'name', 'code')->get();
            $sections = Section::with('strand:id,code')->select('id', 'section_name as name', 'strand_id')->get()->map(function ($section) {
                return [
                    'id' => $section->id,
                    'name' => $section->name,
                    'strand_code' => $section->strand->code ?? null
                ];
            });

            return response()->json([
                'strands' => $strands,
                'sections' => $sections
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching sections and strands: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch data'], 500);
        }
    }

    /**
     * Get subjects for a specific strand
     */
    public function getSubjectsByStrand($strandCode)
    {
        try {
            $strand = Strand::where('code', $strandCode)->first();
            if (!$strand) {
                return response()->json(['error' => 'Strand not found'], 404);
            }

            $subjects = Subject::where('strand_id', $strand->id)
                ->select('id', 'name', 'code', 'strand_id')
                ->get()
                ->map(function ($subject) use ($strandCode) {
                    return [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                        'strand_code' => $strandCode
                    ];
                });

            return response()->json([
                'subjects' => $subjects
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching subjects for strand: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch subjects'], 500);
        }
    }

    /**
     * Finalize enrollment with strand and section assignment (for COR)
     */
    public function finalizeEnrollmentWithAssignment(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'strand' => 'required|string',
                'section_id' => 'required|integer|exists:sections,id',
                'subjects' => 'nullable|array',
                'subjects.*' => 'exists:subjects,id',
            ]);

            // Resolve strand by code or id
            $strand = is_numeric($validated['strand'])
                ? Strand::find($validated['strand'])
                : Strand::where('code', $validated['strand'])->first();

            if (!$strand) {
                return redirect()->back()->with('error', 'Invalid strand selected.');
            }

            // Get the student user instead of Student model
            $user = User::where('id', $id)->where('role', 'student')->firstOrFail();
            
            // Ensure student personal info exists (without strand/section assignment)
            $personalInfo = DB::table('student_personal_info')->where('user_id', $id)->first();
            if (!$personalInfo) {
                // Create personal info if missing
                DB::table('student_personal_info')->insert([
                    'user_id' => $id,
                    'grade_level' => 'Grade 11',
                    'student_status' => $user->student_type === 'transferee' ? 'Transferee' : 'New Student',
                    'address' => 'To be provided',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Active School Year
            $activeSY = SchoolYear::where('is_active', true)->first();
            if (!$activeSY) {
                return redirect()->back()->with('error', 'REGISTRAR DID NOT ACTIVATE THE SCHOOL YEAR YET. Please contact the registrar to activate a school year first.');
            }

            // Upsert enrollment (FK uses users.id, not student_personal_info.id)
            $enrollmentKey = [
                'student_id' => $user->id,  // ✅ Use user_id instead of student.id
                'school_year_id' => $activeSY->id,
            ];
            $enrollmentData = [
                'status' => 'enrolled',
                'coordinator_id' => Auth::id(),
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('enrollments', 'strand_id')) {
                $enrollmentData['strand_id'] = $strand->id;
            }
            if (Schema::hasColumn('enrollments', 'assigned_section_id')) {
                $enrollmentData['assigned_section_id'] = $validated['section_id'];
            }
            if (Schema::hasColumn('enrollments', 'date_enrolled')) {
                $enrollmentData['date_enrolled'] = now();
            }
            DB::table('enrollments')->updateOrInsert(
                $enrollmentKey,
                array_merge(['created_at' => now()], $enrollmentData)
            );
            $enrollmentId = DB::table('enrollments')
                ->where($enrollmentKey)
                ->orderByDesc('id')
                ->value('id');

            // Automatically assign ALL subjects for the complete academic year (1st & 2nd semester)
            // Get all subjects from registrar-created class schedules for this section and strand
            $allClassSchedules = DB::table('class_schedules')
                ->join('subjects', 'class_schedules.subject_id', '=', 'subjects.id')
                ->join('users as faculty', 'class_schedules.faculty_id', '=', 'faculty.id')
                ->where('class_schedules.school_year_id', $activeSY->id)
                ->where('class_schedules.section_id', $validated['section_id'])
                ->where('class_schedules.is_active', true)
                ->select(
                    'class_schedules.*',
                    'subjects.name as subject_name',
                    'subjects.code as subject_code',
                    'subjects.strand_id',
                    'faculty.firstname',
                    'faculty.lastname'
                )
                ->get();

            Log::info('Auto-enrolling student in complete academic year schedule', [
                'student_id' => $user->id,
                'section_id' => $validated['section_id'],
                'strand_id' => $strand->id,
                'total_schedules_found' => $allClassSchedules->count(),
                'school_year_id' => $activeSY->id
            ]);

            foreach ($allClassSchedules as $schedule) {
                // Create class record for each subject in the complete academic year
                $classId = DB::table('class')->insertGetId([
                    'section_id' => $validated['section_id'],
                    'subject_id' => $schedule->subject_id,
                    'faculty_id' => $schedule->faculty_id,
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'room' => $schedule->room,
                    'semester' => $schedule->semester,
                    'school_year' => ($activeSY->year_start ?? '2024') . '-' . ($activeSY->year_end ?? '2025'),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Create class_details record to link student to this class
                DB::table('class_details')->updateOrInsert(
                    [
                        'class_id' => $classId,
                        'student_id' => $user->id,
                        'enrollment_id' => $enrollmentId
                    ],
                    [
                        'is_enrolled' => true,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                );

                Log::info('Created class assignment for student', [
                    'class_id' => $classId,
                    'student_id' => $user->id,
                    'subject' => $schedule->subject_name,
                    'semester' => $schedule->semester,
                    'faculty' => $schedule->firstname . ' ' . $schedule->lastname
                ]);
            }

            // Complete academic year enrollment completed - student now has all 1st & 2nd semester subjects

            // Finally mark enrollment as enrolled
            DB::table('enrollments')->where('id', $enrollmentId)->update([
                'status' => 'enrolled',
                ...(Schema::hasColumn('enrollments', 'date_enrolled') ? ['date_enrolled' => now()] : []),
                'updated_at' => now(),
            ]);

            // Create class_details records for all classes in the student's section and strand
            $this->createClassDetailsForEnrolledStudent($enrollmentId, $validated['section_id'], $strand->id, $activeSY->id);

            // Get section info for success message
            $section = \App\Models\Section::find($validated['section_id']);
            
            return redirect()->back()->with('success', 
                "Student {$user->firstname} {$user->lastname} has been successfully enrolled in {$strand->name} - {$section->section_name}!"
            );
            
        } catch (\Throwable $e) {
            Log::error('Error finalizing enrollment (with assignment): ' . $e->getMessage());
            Log::error('Request data: ' . json_encode($request->all()));
            Log::error('Student ID: ' . $id);
            
            return redirect()->back()->with('error', 'Failed to finalize enrollment: ' . $e->getMessage());
        }
    }

    /**
     * Handle transferee subject crediting during enrollment
     */
    public function creditTransfereeSubjects(Request $request, $studentId)
    {
        try {
            $validated = $request->validate([
                'credits' => 'required|array',
                'credits.*.subject_id' => 'required|exists:subjects,id',
                'credits.*.grade' => 'required|numeric|min:75|max:100',
                'credits.*.semester' => 'required|in:1st Semester,2nd Semester',
                'credits.*.school_year' => 'required|string',
                'credits.*.remarks' => 'nullable|string|max:255'
            ]);

            $student = User::where('id', $studentId)->where('role', 'student')->firstOrFail();
            
            // Clear existing credits for this student
            \App\Models\TransfereeCreditedSubject::where('student_id', $studentId)->delete();
            
            // Add new credits
            foreach ($validated['credits'] as $credit) {
                \App\Models\TransfereeCreditedSubject::create([
                    'student_id' => $studentId,
                    'subject_id' => $credit['subject_id'],
                    'grade' => $credit['grade'],
                    'semester' => $credit['semester'],
                    'school_year' => $credit['school_year'],
                    'remarks' => $credit['remarks'] ?? null
                ]);
            }

            Log::info('Transferee credits saved', [
                'student_id' => $studentId,
                'credits_count' => count($validated['credits'])
            ]);

            return redirect()->back()->with('success', 
                "Successfully credited " . count($validated['credits']) . " subjects for transferee student."
            );

        } catch (\Exception $e) {
            Log::error('Error crediting transferee subjects: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to credit subjects: ' . $e->getMessage());
        }
    }

    /**
     * Get transferee credited subjects for a student
     */
    public function getTransfereeCreditedSubjects($studentId)
    {
        try {
            $credits = \App\Models\TransfereeCreditedSubject::with('subject')
                ->where('student_id', $studentId)
                ->orderBy('semester')
                ->orderBy('subject_id')
                ->get();

            return response()->json([
                'success' => true,
                'credits' => $credits
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get credited subjects: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate and view COR for enrolled student
     */
    public function viewStudentCOR($studentId)
    {
        try {
            $student = User::where('id', $studentId)->where('role', 'student')->firstOrFail();
            
            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return redirect()->back()->with('error', 'No active school year found.');
            }

            // Get enrollment info
            $enrollment = DB::table('enrollments')
                ->where('student_id', $studentId)
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('status', 'enrolled')
                ->first();

            if (!$enrollment) {
                return redirect()->back()->with('error', 'Student is not enrolled for the current school year.');
            }

            // Get student personal info
            $personalInfo = DB::table('student_personal_info')
                ->where('user_id', $studentId)
                ->first();

            // Get student's class schedule
            $schedule = DB::table('class')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
                ->leftJoin('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'subjects.strand_id', '=', 'strands.id')
                ->where('class.student_id', $studentId)
                ->where('class.school_year_id', $activeSchoolYear->id)
                ->select([
                    'class.*',
                    'subjects.name as subject_name',
                    'subjects.code as subject_code',
                    'subjects.units',
                    'faculty.firstname as faculty_firstname',
                    'faculty.lastname as faculty_lastname',
                    'sections.section_name',
                    'strands.name as strand_name',
                    'strands.code as strand_code'
                ])
                ->orderBy('class.semester')
                ->orderBy('class.day_of_week')
                ->orderBy('class.start_time')
                ->get();

            // Get transferee credited subjects if applicable
            $creditedSubjects = [];
            if ($student->student_type === 'transferee') {
                $creditedSubjects = \App\Models\TransfereeCreditedSubject::with('subject')
                    ->where('student_id', $studentId)
                    ->get();
            }

            // Get section and strand info
            $section = null;
            $strand = null;
            if ($enrollment->assigned_section_id) {
                $section = \App\Models\Section::find($enrollment->assigned_section_id);
            }
            if ($enrollment->strand_id) {
                $strand = \App\Models\Strand::find($enrollment->strand_id);
            }

            return Inertia::render('Faculty/StudentCOR', [
                'student' => [
                    'id' => $student->id,
                    'firstname' => $student->firstname,
                    'lastname' => $student->lastname,
                    'middlename' => $student->middlename,
                    'email' => $student->email,
                    'student_type' => $student->student_type,
                    'lrn' => $personalInfo->lrn ?? 'N/A',
                    'grade_level' => $personalInfo->grade_level ?? 'N/A',
                    'address' => $personalInfo->address ?? 'N/A'
                ],
                'enrollment' => $enrollment,
                'schedule' => $schedule,
                'creditedSubjects' => $creditedSubjects,
                'section' => $section,
                'strand' => $strand,
                'schoolYear' => $activeSchoolYear,
                'allowPrint' => (bool)($activeSchoolYear->allow_faculty_cor_print ?? true),
                'auth' => [
                    'user' => Auth::user()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error viewing student COR: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to load student COR: ' . $e->getMessage());
        }
    }

    /**
     * Preview COR for pending student before enrollment
     */
    public function previewStudentCOR(Request $request, $studentId)
    {
        try {
            $validated = $request->validate([
                'strand_id' => 'required|exists:strands,id',
                'section_id' => 'required|exists:sections,id'
            ]);

            $student = User::where('id', $studentId)->where('role', 'student')->firstOrFail();
            
            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found.'
                ], 400);
            }

            // Get student personal info
            $personalInfo = DB::table('student_personal_info')
                ->where('user_id', $studentId)
                ->first();

            // Get strand and section info
            $strand = \App\Models\Strand::find($validated['strand_id']);
            $section = \App\Models\Section::find($validated['section_id']);

            // Get class schedules for the selected section and strand
            $schedules = DB::table('class_schedules')
                ->join('subjects', 'class_schedules.subject_id', '=', 'subjects.id')
                ->join('users as faculty', 'class_schedules.faculty_id', '=', 'faculty.id')
                ->where('class_schedules.school_year_id', $activeSchoolYear->id)
                ->where('class_schedules.section_id', $validated['section_id'])
                ->where('subjects.strand_id', $validated['strand_id'])
                ->where('class_schedules.is_active', true)
                ->select([
                    'class_schedules.*',
                    'subjects.name as subject_name',
                    'subjects.code as subject_code',
                    'subjects.units',
                    'faculty.firstname as faculty_firstname',
                    'faculty.lastname as faculty_lastname'
                ])
                ->orderBy('class_schedules.semester')
                ->orderBy('class_schedules.day_of_week')
                ->orderBy('class_schedules.start_time')
                ->get();

            // Get transferee credited subjects if applicable
            $creditedSubjects = [];
            if ($student->student_type === 'transferee') {
                $creditedSubjects = \App\Models\TransfereeCreditedSubject::with('subject')
                    ->where('student_id', $studentId)
                    ->get();
            }

            return response()->json([
                'success' => true,
                'preview_data' => [
                    'student' => [
                        'id' => $student->id,
                        'firstname' => $student->firstname,
                        'lastname' => $student->lastname,
                        'middlename' => $student->middlename,
                        'email' => $student->email,
                        'student_type' => $student->student_type,
                        'lrn' => $personalInfo->lrn ?? 'N/A',
                        'grade_level' => $personalInfo->grade_level ?? 'N/A',
                        'address' => $personalInfo->address ?? 'N/A'
                    ],
                    'strand' => $strand,
                    'section' => $section,
                    'schedule' => $schedules,
                    'creditedSubjects' => $creditedSubjects,
                    'schoolYear' => $activeSchoolYear,
                    'enrollment_status' => 'preview' // Special status for preview
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error previewing student COR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate COR preview: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get subjects for crediting (transferee students)
     */
    public function getSubjectsForCrediting($strandCode)
    {
        try {
            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found',
                    'subjects' => []
                ]);
            }

            // Find strand by code
            $strand = \App\Models\Strand::where('code', $strandCode)->first();
            if (!$strand) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid strand code',
                    'subjects' => []
                ]);
            }

            // Get all subjects for this strand (both semesters)
            $subjects = Subject::where(function($query) use ($strand) {
                $query->where('strand_id', $strand->id)
                      ->orWhereNull('strand_id'); // Include core subjects
            })
            ->select(['id', 'subject_code', 'subject_name', 'units', 'semester'])
            ->orderBy('semester')
            ->orderBy('subject_code')
            ->get();

            return response()->json([
                'success' => true,
                'subjects' => $subjects,
                'strand' => $strand
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching subjects for crediting: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subjects',
                'subjects' => []
            ]);
        }
    }

    /**
     * Get subjects for a specific strand and active semester
     */
    public function getSubjectsForStrand($strandCode)
    {
        try {
            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found',
                    'subjects' => []
                ]);
            }

            // Get active semester
            $activeSemester = $activeSchoolYear->current_semester;

            // Find strand by code
            $strand = Strand::where('code', $strandCode)->first();
            if (!$strand) {
                return response()->json([
                    'success' => false,
                    'message' => 'Strand not found',
                    'subjects' => []
                ]);
            }

            // Get subjects for the strand and active semester
            $subjects = Subject::where('strand_id', $strand->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->with(['faculty'])
                ->get();

            return response()->json([
                'success' => true,
                'subjects' => $subjects->map(function($subject) {
                    return [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                        'semester' => $subject->semester,
                        'faculty' => $subject->faculty ? 
                            $subject->faculty->firstname . ' ' . $subject->faculty->lastname : 
                            'No Faculty Assigned'
                    ];
                })
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching subjects for strand: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subjects',
                'subjects' => []
            ], 500);
        }
    }

    /**
     * Send enrollment notification email to student
     */
    private function sendEnrollmentNotification($student, $status, $enrollment = null)
    {
        try {
            $user = $student->user;
            if (!$user || !$user->email) {
                Log::warning('Cannot send notification - student has no email: ' . $student->id);
                return;
            }

            $data = [
                'student_name' => $student->firstname . ' ' . $student->lastname,
                'status' => $status,
                'strand' => $student->strand ? $student->strand->name : 'N/A',
                'school_year' => $student->schoolYear ? $student->schoolYear->year : '2024-2025',
                'subjects' => $enrollment && $enrollment->subjects ? $enrollment->subjects->pluck('name')->toArray() : []
            ];

            Mail::send('emails.enrollment_notification', $data, function ($message) use ($user, $status) {
                $message->to($user->email)
                    ->subject('Enrollment ' . ucfirst($status) . ' - ONSTS');
            });

            Log::info('Enrollment notification sent to: ' . $user->email);
        } catch (\Exception $e) {
            Log::error('Failed to send enrollment notification: ' . $e->getMessage());
        }
    }

    /**
     * Reject a student's enrollment
     */
    public function rejectStudent(Request $request, $studentId)
    {
        try {
            $student = Student::findOrFail($studentId);
            
            // Update enrollment status to rejected
            $student->update([
                'enrollment_status' => 'rejected'
            ]);
            
            Log::info('Student enrollment rejected', [
                'student_id' => $studentId,
                'coordinator_id' => $request->user()->id
            ]);
            
            return redirect()->back()->with('success', 'Student enrollment has been rejected.');
            
        } catch (\Exception $e) {
            Log::error('Error rejecting student enrollment', [
                'student_id' => $studentId,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to reject student enrollment.');
        }
    }

    /**
     * Finalize a student's enrollment with section and strand assignment
     */
    public function finalizeStudent(Request $request, $studentId)
    {
        try {
            $validated = $request->validate([
                'strand' => 'required|string',
                'section_id' => 'required|exists:sections,id',
                'subjects' => 'nullable|array' // Optional subjects array (will auto-assign if empty)
            ]);
            
            // Get the student user
            $user = User::where('id', $studentId)->where('role', 'student')->firstOrFail();
            $activeSchoolYear = SchoolYear::where('is_active', true)->firstOrFail();
            $section = Section::with('strand')->findOrFail($validated['section_id']);
            
            // Find strand by name or code
            $strand = null;
            if (is_numeric($validated['strand'])) {
                $strand = \App\Models\Strand::find($validated['strand']);
            } else {
                $strand = \App\Models\Strand::where('code', $validated['strand'])
                    ->orWhere('name', $validated['strand'])
                    ->first();
            }
            
            if (!$strand) {
                return response()->json(['error' => 'Invalid strand specified'], 400);
            }
            
            // Update or create enrollment record
            $enrollment = Enrollment::updateOrCreate(
                [
                    'student_id' => $studentId,
                    'school_year_id' => $activeSchoolYear->id
                ],
                [
                    'assigned_section_id' => $validated['section_id'],
                    'strand_id' => $strand->id,
                    'status' => 'enrolled',
                    'grade_level' => 'Grade 11', // Default for new enrollments
                    'intended_grade_level' => 'Grade 11',
                    'enrollment_method' => 'manual',
                    'cor_generated' => false,
                    'submitted_at' => now(),
                    'reviewed_at' => now()
                ]
            );
            
            // Update student personal info if exists
            $personalInfo = DB::table('student_personal_info')->where('user_id', $studentId)->first();
            if ($personalInfo) {
                DB::table('student_personal_info')
                    ->where('user_id', $studentId)
                    ->update([
                        'assigned_section_id' => $validated['section_id'],
                        'strand_id' => $strand->id,
                        'updated_at' => now()
                    ]);
            } else {
                // Create personal info if missing
                DB::table('student_personal_info')->insert([
                    'user_id' => $studentId,
                    'grade_level' => 'Grade 11',
                    'student_status' => $user->student_type === 'transferee' ? 'Transferee' : 'New Student',
                    'assigned_section_id' => $validated['section_id'],
                    'strand_id' => $strand->id,
                    'address' => 'To be provided',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
            
            // Auto-assign all class schedules for the section
            $this->createClassDetailsForEnrolledStudent($enrollment->id, $validated['section_id'], $strand->id, $activeSchoolYear->id);
            
            Log::info('Student enrollment finalized successfully', [
                'student_id' => $studentId,
                'student_name' => $user->firstname . ' ' . $user->lastname,
                'section_id' => $validated['section_id'],
                'section_name' => $section->section_name,
                'strand_id' => $strand->id,
                'strand_name' => $strand->name,
                'enrollment_id' => $enrollment->id,
                'coordinator_id' => $request->user()->id
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Student enrollment finalized successfully!',
                'data' => [
                    'student' => $user->only(['id', 'firstname', 'lastname', 'email']),
                    'section' => [
                        'id' => $section->id,
                        'section_name' => $section->section_name,
                        'name' => $section->section_name // Add name field for compatibility
                    ],
                    'strand' => [
                        'id' => $strand->id,
                        'name' => $strand->name,
                        'code' => $strand->code
                    ],
                    'enrollment_id' => $enrollment->id
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error finalizing student enrollment', [
                'student_id' => $studentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to finalize student enrollment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create class_details records for an enrolled student
     */
    private function createClassDetailsForEnrolledStudent($enrollmentId, $sectionId, $strandId, $schoolYearId)
    {
        try {
            // Get all class schedules for the student's section (both core and strand-specific subjects)
            $classSchedules = DB::table('class')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->where('class.section_id', $sectionId)
                ->where('class.school_year_id', $schoolYearId)
                ->where(function($query) use ($strandId) {
                    // Include both core subjects (strand_id = NULL) and strand-specific subjects
                    $query->whereNull('subjects.strand_id')
                          ->orWhere('subjects.strand_id', $strandId);
                })
                ->where('class.is_active', true)
                ->select('class.id as class_id')
                ->get();

            Log::info('Creating class_details for enrolled student', [
                'enrollment_id' => $enrollmentId,
                'section_id' => $sectionId,
                'strand_id' => $strandId,
                'school_year_id' => $schoolYearId,
                'found_classes' => $classSchedules->count()
            ]);

            // Get student_id from enrollment
            $enrollment = DB::table('enrollments')->where('id', $enrollmentId)->first();
            $studentId = $enrollment->student_id;

            // Create class_details record for each class
            foreach ($classSchedules as $class) {
                DB::table('class_details')->updateOrInsert(
                    [
                        'class_id' => $class->class_id,
                        'enrollment_id' => $enrollmentId,
                        'student_id' => $studentId
                    ],
                    [
                        'section_id' => $sectionId,
                        'is_enrolled' => true,
                        'enrolled_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                );
            }

            Log::info('Successfully created class_details records', [
                'enrollment_id' => $enrollmentId,
                'records_created' => $classSchedules->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error creating class_details for enrolled student: ' . $e->getMessage(), [
                'enrollment_id' => $enrollmentId,
                'section_id' => $sectionId,
                'strand_id' => $strandId,
                'school_year_id' => $schoolYearId
            ]);
        }
    }

    /**
     * Fix existing enrollments with NULL assigned_section_id
     */
    public function fixEnrollmentSections()
    {
        try {
            // Get enrollments with NULL assigned_section_id but have status 'enrolled'
            $brokenEnrollments = DB::table('enrollments')
                ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                ->where('enrollments.status', 'enrolled')
                ->whereNull('enrollments.assigned_section_id')
                ->select([
                    'enrollments.id as enrollment_id',
                    'enrollments.strand_id',
                    'student_personal_info.id as student_id',
                    'student_personal_info.section_id as student_section_id'
                ])
                ->get();

            Log::info('Found enrollments with NULL assigned_section_id', [
                'count' => $brokenEnrollments->count(),
                'enrollments' => $brokenEnrollments->toArray()
            ]);

            $fixedCount = 0;
            foreach ($brokenEnrollments as $enrollment) {
                // Use the section from student_personal_info if available
                $sectionId = $enrollment->student_section_id;
                
                // If no section in student_personal_info, assign default section based on strand
                if (!$sectionId && $enrollment->strand_id) {
                    $defaultSection = DB::table('sections')
                        ->where('strand_id', $enrollment->strand_id)
                        ->first();
                    $sectionId = $defaultSection ? $defaultSection->id : null;
                }

                if ($sectionId) {
                    DB::table('enrollments')
                        ->where('id', $enrollment->enrollment_id)
                        ->update([
                            'assigned_section_id' => $sectionId,
                            'updated_at' => now()
                        ]);
                    
                    $fixedCount++;
                    Log::info('Fixed enrollment section assignment', [
                        'enrollment_id' => $enrollment->enrollment_id,
                        'assigned_section_id' => $sectionId
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Fixed {$fixedCount} enrollment section assignments",
                'fixed_count' => $fixedCount,
                'total_found' => $brokenEnrollments->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fixing enrollment sections: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fix enrollment sections: ' . $e->getMessage()
            ], 500);
        }
    }
}
