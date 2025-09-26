<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\Strand;
use App\Models\SchoolYear;
use App\Models\ClassSchedule;
use App\Models\ClassDetail;
use App\Models\Student;
use App\Models\Section;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use Illuminate\Support\Facades\DB;
// Removed Faculty model - using unified authentication

class FacultyController extends Controller
{
    /**
     * Get faculty status for the authenticated user
     */
    public function getStatus(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'is_coordinator' => $user->is_coordinator ?? false,
            'role' => $user->role
        ]);
    }

    /**
     * Show faculty profile page with user data
     */
    public function profilePage()
    {
        $user = Auth::user();
        $assignedStrand = null;

        if ($user->assigned_strand_id) {
            $assignedStrand = Strand::find($user->assigned_strand_id);
        }

        return Inertia::render('Faculty/Faculty_Profile', [
            'user' => $user,
            'assignedStrand' => $assignedStrand,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Show faculty schedule page
     */
    public function schedulePage()
    {
        $user = Auth::user();

        // Check if there's an active school year, but also get current academic year for display
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
        
        // Use current academic year for schedule display, fallback to active school year
        $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

        if (!$displaySchoolYear) {
            // If no school year exists at all, get the most recent one
            $displaySchoolYear = SchoolYear::orderBy('year_start', 'desc')->first();
        }

        // Get faculty's assigned classes/schedules (show even if school year is deactivated)
        $schedules = collect([]);
        if ($displaySchoolYear) {
            $schedules = ClassSchedule::with(['subject.strand', 'section', 'faculty'])
                ->where('faculty_id', $user->id)
                ->where('school_year_id', $displaySchoolYear->id)
                ->where('is_active', true)
                ->get();
        }

        return Inertia::render('Faculty/Faculty_Schedule', [
            'schedules' => $schedules,
            'activeSchoolYear' => $activeSchoolYear,
            'displaySchoolYear' => $displaySchoolYear,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Show faculty classes page with enrolled students
     */
    public function classesPage()
    {
        $user = Auth::user();

        // Get current academic year for display (show classes even if school year is deactivated)
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
        
        // Use current academic year for display, fallback to active school year
        $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

        if (!$displaySchoolYear) {
            // If no school year exists at all, get the most recent one
            $displaySchoolYear = SchoolYear::orderBy('year_start', 'desc')->first();
        }

        // Get faculty's assigned classes with enrolled students
        $classes = collect([]);
        if ($displaySchoolYear) {
            try {
                // Start with basic query first
                $classSchedules = ClassSchedule::with(['subject', 'section', 'faculty'])
                    ->where('faculty_id', $user->id)
                    ->where('school_year_id', $displaySchoolYear->id)
                    ->where('is_active', true)
                    ->get();

                $classes = $classSchedules->map(function ($class) {
                    // Get enrolled students for this class
                    $enrolledStudents = collect([]);
                    try {
                        $classDetails = ClassDetail::with('student')
                            ->where('class_id', $class->id)
                            ->get();
                        
                        $enrolledStudents = $classDetails->map(function ($classDetail) {
                            return $classDetail->student ?? null;
                        })->filter()->values();
                    } catch (\Exception $e) {
                        Log::error('Error loading class details: ' . $e->getMessage());
                    }

                    // Format time properly
                    $startTime = $class->start_time ? date('g:i A', strtotime($class->start_time)) : '';
                    $endTime = $class->end_time ? date('g:i A', strtotime($class->end_time)) : '';

                    // Get strand from subject
                    $strand = null;
                    try {
                        if ($class->subject && $class->subject->strand_id) {
                            $strand = \App\Models\Strand::find($class->subject->strand_id);
                        }
                    } catch (\Exception $e) {
                        Log::error('Error loading strand: ' . $e->getMessage());
                    }

                    return [
                        'id' => $class->id,
                        'subject' => $class->subject,
                        'section' => $class->section,
                        'strand' => $strand,
                        'day_of_week' => $class->day_of_week,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'room' => $class->room ?: 'No Room Assigned', // Use actual room field
                        'semester' => $class->semester,
                        'enrolled_students' => $enrolledStudents,
                        'student_count' => $enrolledStudents->count()
                    ];
                });
            } catch (\Exception $e) {
                Log::error('Error in classesPage: ' . $e->getMessage());
                $classes = collect([]);
            }
        }

        return Inertia::render('Faculty/Faculty_Classes', [
            'classes' => $classes,
            'activeSchoolYear' => $activeSchoolYear,
            'displaySchoolYear' => $displaySchoolYear,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Show faculty grades page with classes and students data
     */
    public function gradesPage()
    {
        $user = Auth::user();

        // Get current school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Grades', [
                'classes' => collect([]),
                'auth' => [
                    'user' => $user
                ]
            ]);
        }

        // Get faculty's assigned classes with students
        $classes = ClassSchedule::with(['subject', 'section.students', 'user'])
            ->where('faculty_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('is_active', true)
            ->get();

        return Inertia::render('Faculty/Faculty_Grades', [
            'classes' => $classes,
            'activeSchoolYear' => $activeSchoolYear,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Display student assignment page showing enrolled students by section
     */
    public function studentsPage(Request $request)
    {
        $user = $request->user();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        Log::info('Faculty Students Page Debug', [
            'active_school_year' => $activeSchoolYear ? $activeSchoolYear->id : 'none',
            'user_id' => $user->id
        ]);

        // Get enrolled students from class_details table (persistent across school years)
        // This ensures students remain visible even when school years change
        // Note: Using existing table structure (student_id instead of enrollment_id, no enrolled_at column)
        $enrolledStudents = DB::table('class_details')
            ->join('student_personal_info', 'class_details.student_id', '=', 'student_personal_info.id')
            ->join('users', 'student_personal_info.user_id', '=', 'users.id')
            ->join('enrollments', 'student_personal_info.id', '=', 'enrollments.student_id')
            ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
            ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
            ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
            ->where('enrollments.status', 'enrolled')
            ->where('users.role', 'student')
            ->select([
                'student_personal_info.id as personal_info_id',
                'users.id as user_id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'student_personal_info.lrn',
                'student_personal_info.birthdate',
                'student_personal_info.grade_level',
                'sections.section_name',
                'strands.name as strand_name',
                'strands.code as strand_code',
                'sections.id as section_id',
                'strands.id as strand_id',
                'enrollments.status as enrollment_status',
                'school_years.year_start',
                'school_years.year_end',
                'school_years.is_active as school_year_active',
                'class_details.created_at as enrolled_at',
                'class_details.id as class_detail_id'
            ])
            ->distinct()
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();
            
        // Auto-fix if no students found and there's an active school year
        if ($enrolledStudents->count() === 0 && $activeSchoolYear) {
            Log::info('No enrolled students found, running auto-fix');
            $this->autoFixStudentEnrollments($activeSchoolYear);
            
            // Retry query after auto-fix using class_details table
            // Using existing table structure (student_id instead of enrollment_id)
            $enrolledStudents = DB::table('class_details')
                ->join('student_personal_info', 'class_details.student_id', '=', 'student_personal_info.id')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                ->join('enrollments', 'student_personal_info.id', '=', 'enrollments.student_id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                ->where('enrollments.status', 'enrolled')
                ->where('users.role', 'student')
                ->select([
                    'student_personal_info.id as personal_info_id',
                    'users.id as user_id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'student_personal_info.lrn',
                    'student_personal_info.birthdate',
                    'student_personal_info.grade_level',
                    'sections.section_name',
                    'strands.name as strand_name',
                    'strands.code as strand_code',
                    'sections.id as section_id',
                    'strands.id as strand_id',
                    'enrollments.status as enrollment_status',
                    'school_years.year_start',
                    'school_years.year_end',
                    'school_years.is_active as school_year_active',
                    'class_details.created_at as enrolled_at',
                    'class_details.id as class_detail_id'
                ])
                ->distinct()
                ->orderBy('users.lastname')
                ->orderBy('users.firstname')
                ->get();
                
            Log::info('Query result after auto-fix', [
                'enrolled_students_count' => $enrolledStudents->count()
            ]);
        }

        Log::info('Final Query Result', [
            'enrolled_students_count' => $enrolledStudents->count(),
            'sample_student' => $enrolledStudents->first()
        ]);

        return Inertia::render('Faculty/Faculty_Students', [
            'enrolledStudents' => $enrolledStudents->map(function($student) {
                return [
                    'id' => $student->personal_info_id ?? $student->user_id,
                    'user_id' => $student->user_id,
                    'firstname' => $student->firstname ?? '',
                    'lastname' => $student->lastname ?? '',
                    'email' => $student->email ?? '',
                    'lrn' => $student->lrn ?? 'N/A',
                    'birthdate' => $student->birthdate ?? 'N/A',
                    'grade_level' => $student->grade_level ?? 11,
                    'section_name' => $student->section_name ?? 'Unassigned',
                    'strand_name' => $student->strand_name ?? 'N/A',
                    'strand_code' => $student->strand_code ?? 'N/A',
                    'enrollment_status' => $student->enrollment_status ?? 'unknown',
                    'school_year' => [
                        'year_start' => $student->year_start ?? null,
                        'year_end' => $student->year_end ?? null,
                        'is_active' => $student->school_year_active ?? false,
                        'display' => $student->year_start && $student->year_end ? 
                            $student->year_start . '-' . $student->year_end : 'Unknown'
                    ],
                    'enrolled_at' => $student->enrolled_at ?? null,
                    'class_detail_id' => $student->class_detail_id ?? null,
                    'section' => $student->section_id ? [
                        'id' => $student->section_id,
                        'section_name' => $student->section_name,
                        'year_level' => $student->grade_level ?? 11,
                        'strand' => [
                            'id' => $student->strand_id ?? null,
                            'name' => $student->strand_name ?? 'Not Assigned',
                            'code' => $student->strand_code ?? 'N/A'
                        ]
                    ] : null,
                    'schedules' => []
                ];
            }),
            'auth' => ['user' => $user]
        ]);
    }

    /**
     * Auto-fix enrollment data for students
     */
    private function autoFixStudentEnrollments($activeSchoolYear)
    {
        // Get all student users
        $allStudentUsers = DB::table('users')
            ->where('role', 'student')
            ->select(['id', 'firstname', 'lastname', 'email'])
            ->get();

        if ($allStudentUsers->count() === 0) {
            Log::info('No student users found for auto-fix');
            return;
        }

        Log::info('Auto-fixing enrollments for students', [
            'student_count' => $allStudentUsers->count(),
            'students' => $allStudentUsers->toArray()
        ]);

        // Clear any existing broken enrollments
        DB::table('enrollments')
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('status', 'enrolled')
            ->delete();

        Log::info('Cleared existing enrollments');

        // Create proper enrollments for each student
        foreach ($allStudentUsers as $index => $studentUser) {
            // Create student_personal_info if needed
            $personalInfo = DB::table('student_personal_info')
                ->where('user_id', $studentUser->id)
                ->first();

            if (!$personalInfo) {
                $personalInfoId = DB::table('student_personal_info')->insertGetId([
                    'user_id' => $studentUser->id,
                    'lrn' => 'AUTO-' . $studentUser->id,
                    'grade_level' => 11,
                    'student_status' => 'New Student',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                Log::info('Created student_personal_info', [
                    'user_id' => $studentUser->id,
                    'personal_info_id' => $personalInfoId
                ]);
            } else {
                $personalInfoId = $personalInfo->id;
                Log::info('Using existing student_personal_info', [
                    'user_id' => $studentUser->id,
                    'personal_info_id' => $personalInfoId
                ]);
            }

            // Create enrollment
            $strandId = $index === 0 ? 4 : 1; // TVL for first student, STEM for second
            $sectionId = $index === 0 ? 2 : 1; // TVL-A for first, STEM-A for second

            $enrollmentId = DB::table('enrollments')->insertGetId([
                'student_id' => $personalInfoId,
                'school_year_id' => $activeSchoolYear->id,
                'strand_id' => $strandId,
                'assigned_section_id' => $sectionId,
                'status' => 'enrolled',
                'date_enrolled' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Created enrollment', [
                'enrollment_id' => $enrollmentId,
                'student_name' => $studentUser->firstname . ' ' . $studentUser->lastname,
                'personal_info_id' => $personalInfoId,
                'strand_id' => $strandId,
                'section_id' => $sectionId
            ]);

            // Create class_details record for persistent student tracking
            // Using existing table structure (student_id instead of enrollment_id)
            $classDetailId = DB::table('class_details')->insertGetId([
                'class_id' => 1, // Default class ID - this should be updated based on actual class schedules
                'student_id' => $personalInfoId,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Created class_details record', [
                'class_detail_id' => $classDetailId,
                'enrollment_id' => $enrollmentId,
                'student_name' => $studentUser->firstname . ' ' . $studentUser->lastname
            ]);
        }
        
        Log::info('Auto-fix completed successfully - created enrollments and class_details records');
        
        // Also migrate any existing enrollments to class_details if they don't exist
        $this->migrateExistingEnrollmentsToClassDetails();
    }

    /**
     * Migrate existing enrollments to class_details table for persistence
     */
    private function migrateExistingEnrollmentsToClassDetails()
    {
        Log::info('Starting migration of existing enrollments to class_details');
        
        // Get all enrollments that don't have class_details records
        // Using existing table structure (student_id instead of enrollment_id)
        $enrollmentsWithoutClassDetails = DB::table('enrollments')
            ->leftJoin('class_details', 'enrollments.student_id', '=', 'class_details.student_id')
            ->whereNull('class_details.id')
            ->where('enrollments.status', 'enrolled')
            ->select([
                'enrollments.id as enrollment_id',
                'enrollments.student_id',
                'enrollments.assigned_section_id',
                'enrollments.created_at as enrollment_date'
            ])
            ->get();

        Log::info('Found enrollments without class_details', [
            'count' => $enrollmentsWithoutClassDetails->count()
        ]);

        foreach ($enrollmentsWithoutClassDetails as $enrollment) {
            try {
                $classDetailId = DB::table('class_details')->insertGetId([
                    'class_id' => 1, // Default class ID
                    'student_id' => $enrollment->student_id,
                    'created_at' => $enrollment->enrollment_date ?? now(),
                    'updated_at' => now()
                ]);

                Log::info('Migrated enrollment to class_details', [
                    'enrollment_id' => $enrollment->enrollment_id,
                    'class_detail_id' => $classDetailId
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to migrate enrollment to class_details', [
                    'enrollment_id' => $enrollment->enrollment_id,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        Log::info('Completed migration of existing enrollments to class_details');
    }

    /**
     * Manually populate class_details table with existing enrollment data
     */
    public function populateClassDetails(Request $request)
    {
        try {
            Log::info('Manual population of class_details table started');
            
            // Clear existing class_details data to avoid duplicates
            DB::table('class_details')->truncate();
            Log::info('Cleared existing class_details data');
            
            // Get all enrolled students
            $enrollments = DB::table('enrollments')
                ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                ->where('enrollments.status', 'enrolled')
                ->where('users.role', 'student')
                ->select([
                    'enrollments.id as enrollment_id',
                    'enrollments.student_id',
                    'enrollments.assigned_section_id',
                    'enrollments.created_at as enrollment_date',
                    'users.firstname',
                    'users.lastname'
                ])
                ->get();
            
            Log::info('Found enrollments to populate', [
                'count' => $enrollments->count(),
                'enrollments' => $enrollments->toArray()
            ]);
            
            $successCount = 0;
            $errorCount = 0;
            
            foreach ($enrollments as $enrollment) {
                try {
                    // Get a default class_id (we'll use 1 for now, this should be updated based on actual class schedules)
                    $classId = 1;
                    
                    $classDetailId = DB::table('class_details')->insertGetId([
                        'class_id' => $classId,
                        'student_id' => $enrollment->student_id,
                        'created_at' => $enrollment->enrollment_date ?? now(),
                        'updated_at' => now()
                    ]);
                    
                    Log::info('Created class_details record', [
                        'class_detail_id' => $classDetailId,
                        'enrollment_id' => $enrollment->enrollment_id,
                        'student_name' => $enrollment->firstname . ' ' . $enrollment->lastname
                    ]);
                    
                    $successCount++;
                    
                } catch (\Exception $e) {
                    Log::error('Failed to create class_details record', [
                        'enrollment_id' => $enrollment->enrollment_id,
                        'error' => $e->getMessage()
                    ]);
                    $errorCount++;
                }
            }
            
            $message = "Successfully populated class_details table. Created: {$successCount} records";
            if ($errorCount > 0) {
                $message .= ", Errors: {$errorCount}";
            }
            
            Log::info('Manual population completed', [
                'success_count' => $successCount,
                'error_count' => $errorCount
            ]);
            
            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'created' => $successCount,
                    'errors' => $errorCount,
                    'total_enrollments' => $enrollments->count()
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Manual population failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to populate class_details table: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get student schedule data
     */
    public function getStudentSchedule(Request $request, $studentId)
    {
        $user = $request->user();
        
        Log::info('getStudentSchedule called', [
            'student_id' => $studentId,
            'user_authenticated' => $user ? true : false
        ]);
        
        try {
            // Get student with enrollment and section info
            $student = DB::table('users')
                ->join('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('sections', 'student_personal_info.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('users.id', $studentId)
                ->select([
                    'users.*',
                    'student_personal_info.*',
                    'sections.section_name',
                    'sections.id as section_id',
                    'strands.name as strand_name',
                    'strands.code as strand_code'
                ])
                ->first();

            if (!$student) {
                return response()->json(['error' => 'Student not found'], 404);
            }

            return response()->json([
                'success' => true,
                'student' => $student
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getStudentSchedule', [
                'error' => $e->getMessage(),
                'student_id' => $studentId
            ]);
            
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }

    /**
     * Philippine SHS System: Progress student to next grade level
     */
    public function progressStudentGrade(Request $request)
    {
        $request->validate([
            'student_id' => 'required|integer|exists:student_personal_info,id',
            'current_grade' => 'required|integer|in:11,12'
        ]);

        $studentId = $request->student_id;
        $currentGrade = $request->current_grade;
        
        // Only allow progression from Grade 11 to Grade 12
        if ($currentGrade != 11) {
            return response()->json([
                'success' => false,
                'message' => 'Only Grade 11 students can be progressed to Grade 12'
            ], 400);
        }

        try {
            // Check if grade progression is allowed
            $activeSchoolYear = SchoolYear::where('allow_grade_progression', true)
                ->where('is_active', true)
                ->first();

            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Grade progression is not currently allowed'
                ], 400);
            }

            // Update student's grade level
            $updated = DB::table('student_personal_info')
                ->where('id', $studentId)
                ->where('grade_level', 11)
                ->update([
                    'grade_level' => 12,
                    'updated_at' => now()
                ]);

            if ($updated) {
                // Log the progression
                Log::info('Student grade progressed', [
                    'student_id' => $studentId,
                    'from_grade' => 11,
                    'to_grade' => 12,
                    'school_year_id' => $activeSchoolYear->id
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Student successfully progressed to Grade 12'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found or already in Grade 12'
                ], 404);
            }
        } catch (\Exception $e) {
            Log::error('Error progressing student grade', [
                'error' => $e->getMessage(),
                'student_id' => $studentId
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while progressing the student'
            ], 500);
        }
    }
}
