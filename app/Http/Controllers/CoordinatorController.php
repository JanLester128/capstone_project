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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Models\Student;
use App\Models\StudentPersonalInfo;
use App\Models\Section;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Semester;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\Schema;

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
            // Get the active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return Inertia::render('Faculty/Faculty_Enrollment', [
                    'newStudents' => [],
                    'continuingStudents' => [],
                    'transfereeStudents' => [],
                    'rejectedStudents' => [],
                    'activeSchoolYear' => null,
                    'allowFacultyCorPrint' => true
                ]);
            }

            // Helper to process a student (attach preferences and address)
            $processStudent = function ($student) {
                $preferences = \App\Models\StudentStrandPreference::with('strand')
                    ->where('student_id', $student->user_id) // use users.id for strand preferences
                    ->orderBy('preference_order')
                    ->get();

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

            // Build lists by deriving status from enrollments AND student type (active school year)
            $studentsAll = Student::with(['user', 'strand', 'section'])->get();
            
            // Separate by student type following HCI principles
            $newStudents = collect();
            $continuingStudents = collect();
            $transfereeStudents = collect();
            $rejectedStudents = collect();

            foreach ($studentsAll as $student) {
                $latest = DB::table('enrollments')
                    ->where('student_id', $student->id) // enrollments.student_id references student_personal_info.id
                    ->where('school_year_id', $activeSchoolYear->id)
                    ->orderByDesc('id')
                    ->first();
                
                // Skip students who haven't submitted any enrollment application
                if (!$latest) {
                    continue; // Don't show students without enrollment records
                }
                
                $status = $latest->status;
                $processed = $processStudent($student);
                
                // Get student type from student record (check both fields for compatibility)
                $studentType = $student->user->student_type ?? 
                              $student->student_status ?? 
                              'new';
                
                // Debug logging to help identify the issue
                Log::info('Student Type Debug', [
                    'student_id' => $student->id,
                    'student_name' => $student->user->firstname . ' ' . $student->user->lastname,
                    'user_student_type' => $student->user->student_type ?? 'null',
                    'student_status' => $student->student_status ?? 'null',
                    'resolved_type' => $studentType,
                    'final_category' => $studentType === 'transferee' ? 'transfereeStudents' : 
                                       ($studentType === 'continuing' ? 'continuingStudents' : 'newStudents')
                ]);
                
                // Normalize the student type values
                if (strtolower($studentType) === 'transferee') {
                    $studentType = 'transferee';
                } elseif (strtolower($studentType) === 'continuing') {
                    $studentType = 'continuing';
                } else {
                    $studentType = 'new';
                }
                
                // Only include students who have submitted enrollment applications
                if ($status === 'rejected') {
                    $rejectedStudents->push($processed);
                } elseif ($status === 'pending' || $status === 'approved') {
                    // Separate by student type for better organization (HCI Principle 4: Consistency)
                    switch ($studentType) {
                        case 'new':
                            $newStudents->push($processed);
                            break;
                        case 'continuing':
                            $continuingStudents->push($processed);
                            break;
                        case 'transferee':
                            $transfereeStudents->push($processed);
                            break;
                        default:
                            $newStudents->push($processed); // Default to new if type is unclear
                    }
                }
                // Skip students with 'enrolled' status - they belong in Student Assignment
            }

            return Inertia::render('Faculty/Faculty_Enrollment', [
                'newStudents' => $newStudents,
                'continuingStudents' => $continuingStudents,
                'transfereeStudents' => $transfereeStudents,
                'rejectedStudents' => $rejectedStudents,
                'activeSchoolYear' => $activeSchoolYear,
                'allowFacultyCorPrint' => (bool)($activeSchoolYear->allow_faculty_cor_print ?? true),
                'auth' => [
                    'user' => Auth::user()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in enrollmentPage: ' . $e->getMessage());
            return Inertia::render('Faculty/Faculty_Enrollment', [
                'newStudents' => [],
                'continuingStudents' => [],
                'transfereeStudents' => [],
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
            $student = Student::with(['user', 'strand', 'section', 'schoolYear'])
                ->findOrFail($id);

            // Use student_strand_preferences table (student_id stores users.id)
            $preferences = \App\Models\StudentStrandPreference::with('strand')
                ->where('student_id', $student->id)
                ->orderBy('preference_order')
                ->get();

            $codes = $preferences->map(fn($p) => $p->strand?->code)->filter()->values();
            $names = $preferences->map(fn($p) => $p->strand?->name)->filter()->values();
            if ($codes->isNotEmpty()) {
                $student->strand_preferences = $codes->toArray();
            } elseif ($names->isNotEmpty()) {
                $student->strand_preferences = $names->toArray();
            } else {
                $student->strand_preferences = ['No preferences specified'];
            }

            // Clean up document paths - remove any duplicate enrollment_documents prefix
            if ($student->psa_birth_certificate) {
                $student->psa_birth_certificate = str_replace('enrollment_documents/', '', $student->psa_birth_certificate);
            }
            if ($student->report_card) {
                $student->report_card = str_replace('enrollment_documents/', '', $student->report_card);
            }
            if ($student->image) {
                $student->image = str_replace('enrollment_documents/', '', $student->image);
            }
            
            // Ensure address is included (it's already in the student model)
            $student->address = $student->address ?: 'No address provided';

            return response()->json($student);
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

            // Create class records for each actual schedule
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

                Log::info('Class record created', ['class_id' => $classRecord]);

                // Create enrollment record in enrollments table if it doesn't exist
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
                }

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
            $existingEnrollment = Enrollment::where('student_id', $student->id)
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
                    'student_id' => $student->id,
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

            $student = Student::findOrFail($id);

            // Assign strand & section to the student
            $student->update([
                'strand_id' => $strand->id,
                'section_id' => $validated['section_id'],
                'reviewed_at' => now(),
                'reviewed_by' => Auth::id(),
            ]);

            // Active School Year
            $activeSY = SchoolYear::where('is_active', true)->first();
            if (!$activeSY) {
                return redirect()->back()->with('error', 'REGISTRAR DID NOT ACTIVATE THE SCHOOL YEAR YET. Please contact the registrar to activate a school year first.');
            }

            // Upsert enrollment (FK uses student_personal_info.id)
            $enrollmentKey = [
                'student_id' => $student->id,
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

            // If subjects were provided, attach and create COR class records
            if (!empty($validated['subjects'])) {
                foreach ($validated['subjects'] as $subjectId) {
                    $subject = Subject::find($subjectId);
                    if (!$subject) { continue; }

                    // Create class record (COR)
                    DB::table('class')->insert([
                        'section_id' => $student->section_id,
                        'subject_id' => $subject->id,
                        'faculty_id' => $subject->faculty_id,
                        'day_of_week' => $subject->day_of_week ?: 'Monday',
                        'start_time' => $subject->start_time ?: '08:00:00',
                        'end_time' => $subject->end_time ?: '09:30:00',
                        'room' => $subject->room ?: 'TBA',
                        'semester' => $activeSY->semester ?? '1st Semester',
                        'school_year' => ($activeSY->year_start ?? '2024') . '-' . ($activeSY->year_end ?? '2025'),
                        'is_active' => true,
                        // COR details
                        'student_id' => $student->id,
                        'enrollment_id' => $enrollmentId,
                        'subject_code' => $subject->code ?? 'N/A',
                        'subject_name' => $subject->name ?? 'Unknown Subject',
                        'strand_name' => $strand->name ?? 'N/A',
                        'registration_number' => 'REG' . str_pad($enrollmentId, 6, '0', STR_PAD_LEFT),
                        'date_enrolled' => now()->toDateString(),
                        'instructor_name' => ($subject->faculty && $subject->faculty->user)
                            ? ($subject->faculty->user->firstname . ' ' . $subject->faculty->user->lastname)
                            : 'TBA',
                        'student_name' => $student->user->firstname . ' ' . $student->user->lastname,
                        'student_lrn' => $student->lrn ?? 'N/A',
                        'grade_level' => $student->grade_level ?? 'Grade 11',
                        'enrollment_status' => 'approved',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Finally mark enrollment as enrolled
            DB::table('enrollments')->where('id', $enrollmentId)->update([
                'status' => 'enrolled',
                ...(Schema::hasColumn('enrollments', 'date_enrolled') ? ['date_enrolled' => now()] : []),
                'updated_at' => now(),
            ]);

            // Create class_details records for all classes in the student's section and strand
            $this->createClassDetailsForEnrolledStudent($enrollmentId, $student->section_id, $strand->id, $activeSY->id);

            return redirect()->back()->with('success', 'Student enrolled successfully!');
            
        } catch (\Throwable $e) {
            Log::error('Error finalizing enrollment (with assignment): ' . $e->getMessage());
            Log::error('Request data: ' . json_encode($request->all()));
            Log::error('Student ID: ' . $id);
            
            return redirect()->back()->with('error', 'Failed to finalize enrollment: ' . $e->getMessage());
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
     * Finalize a student's enrollment with section assignment
     */
    public function finalizeStudent(Request $request, $studentId)
    {
        try {
            $validated = $request->validate([
                'strand' => 'required|string',
                'section_id' => 'required|exists:sections,id',
                'student_type' => 'nullable|string',
                'credited_subjects' => 'nullable|array',
                'credited_subjects.*.subject_id' => 'required_with:credited_subjects|exists:subjects,id',
                'credited_subjects.*.grade' => 'required_with:credited_subjects|numeric|min:75|max:100',
                'credited_subjects.*.semester_completed' => 'nullable|string',
                'credited_subjects.*.is_credited' => 'nullable|boolean'
            ]);
            
            $student = Student::findOrFail($studentId);
            $section = Section::findOrFail($validated['section_id']);
            
            // Update student with section assignment and enrolled status
            $student->update([
                'enrollment_status' => 'enrolled',
                'section_id' => $validated['section_id'],
                'assigned_strand_id' => $section->strand_id
            ]);
            
            // Create enrollment record
            $enrollment = Enrollment::create([
                'student_id' => $studentId,
                'school_year_id' => SchoolYear::where('is_active', true)->first()->id,
                'section_id' => $validated['section_id'],
                'strand_id' => $section->strand_id,
                'status' => 'enrolled',
                'enrollment_date' => now()
            ]);
            
            // Create class_details records for all classes in the student's section and strand
            $this->createClassDetailsForEnrolledStudent($enrollment->id, $validated['section_id'], $section->strand_id, SchoolYear::where('is_active', true)->first()->id);
            
            // Handle transferee credited subjects if provided
            if (!empty($validated['credited_subjects'])) {
                foreach ($validated['credited_subjects'] as $creditedSubject) {
                    \App\Models\TransfereeCreditedSubject::create([
                        'student_id' => $student->user_id, // Use user_id as student_id
                        'subject_id' => $creditedSubject['subject_id'],
                        'grade' => $creditedSubject['grade'],
                        'semester' => $creditedSubject['semester_completed'] ?? '1st Semester',
                        'school_year' => SchoolYear::where('is_active', true)->first()->year_start . '-' . SchoolYear::where('is_active', true)->first()->year_end,
                        'remarks' => 'Credited during enrollment'
                    ]);
                }
                
                Log::info('Transferee credits saved', [
                    'student_id' => $studentId,
                    'credited_subjects_count' => count($validated['credited_subjects']),
                    'credited_subjects' => $validated['credited_subjects']
                ]);
            }
            
            Log::info('Student enrollment finalized', [
                'student_id' => $studentId,
                'section_id' => $validated['section_id'],
                'coordinator_id' => $request->user()->id,
                'credited_subjects_count' => count($validated['credited_subjects'] ?? [])
            ]);
            
            return redirect()->back()->with('success', 'Student enrollment has been finalized successfully.');
            
        } catch (\Exception $e) {
            Log::error('Error finalizing student enrollment', [
                'student_id' => $studentId,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to finalize student enrollment.');
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

            // Create class_details record for each class
            foreach ($classSchedules as $class) {
                DB::table('class_details')->updateOrInsert(
                    [
                        'class_id' => $class->class_id,
                        'enrollment_id' => $enrollmentId
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
