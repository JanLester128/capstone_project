<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\Strand;
use App\Models\SchoolYear;
use App\Models\ClassSchedule;
use App\Models\Subject;
use App\Models\User;
use App\Models\Grade;
use App\Models\Student;
use App\Models\EnrollmentSubject;
use App\Models\ClassDetail;
use App\Models\Enrollment;
use App\Models\Section;
// use App\Exports\ClassRecordExport;   
use Maatwebsite\Excel\Facades\Excel;
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

                $classes = $classSchedules->map(function ($class) use ($displaySchoolYear) {
                    // Get enrolled students for this class
                    $enrolledStudents = collect([]);
                    try {
                        // Get students from class_details table using enrollment_id
                        $enrolledStudents = DB::table('class_details')
                            ->join('enrollments', 'class_details.enrollment_id', '=', 'enrollments.id')
                            ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                            ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                            ->where('class_details.class_id', $class->id)
                            ->where('class_details.is_enrolled', true)
                            ->where('users.role', 'student')
                            ->select([
                                'users.id',
                                'users.firstname',
                                'users.lastname',
                                'users.email',
                                'student_personal_info.lrn',
                                'student_personal_info.grade_level'
                            ])
                            ->get();

                        Log::info('Classes page - Students found for class', [
                            'class_id' => $class->id,
                            'subject_name' => $class->subject->name ?? 'Unknown',
                            'student_count' => $enrolledStudents->count()
                        ]);
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

    public function viewClassStudents($classId)
    {
        $user = Auth::user();
        
        // Get the class and verify it belongs to this faculty
        $class = ClassSchedule::with(['subject.strand', 'section', 'faculty'])
            ->where('id', $classId)
            ->where('faculty_id', $user->id)
            ->firstOrFail();

        // Get school year info
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
        $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

        // Get enrolled students for this class
        $students = collect([]);
        try {
            // Get students from class_details table using enrollment_id
            $students = DB::table('class_details')
                ->join('enrollments', 'class_details.enrollment_id', '=', 'enrollments.id')
                ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                ->where('class_details.class_id', $classId)
                ->where('class_details.is_enrolled', true)
                ->where('users.role', 'student')
                ->select([
                    'users.id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'users.role',
                    'student_personal_info.lrn',
                    'student_personal_info.grade_level',
                    'student_personal_info.id as personal_info_id'
                ])
                ->get();
                
            Log::info('Found ' . $students->count() . ' students in class ' . $classId);
        } catch (\Exception $e) {
            Log::error('Error loading class students: ' . $e->getMessage());
        }

        // Get existing grades for all students in this class with proper student mapping
        // Faculty can see all grades (including pending approval), but students only see approved
        $rawGrades = Grade::where('class_id', $classId)
            ->where('subject_id', $class->subject_id)
            ->where('school_year_id', $displaySchoolYear->id)
            ->get();
            
        // Grades loaded successfully
        
        $grades = $rawGrades->map(function ($grade) {
            // Map grade.student_id (student_personal_info.id) to user_id for frontend
            $originalStudentId = $grade->student_id;
            $studentInfo = Student::find($grade->student_id);
            
            if ($studentInfo) {
                $grade->student_id = $studentInfo->user_id; // Convert to user_id for frontend
            }
            return $grade;
        });

        return Inertia::render('Faculty/Faculty_ClassStudents', [
            'class' => $class,
            'students' => $students,
            'grades' => $grades,
            'activeSchoolYear' => $activeSchoolYear,
            'displaySchoolYear' => $displaySchoolYear,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    public function viewStudentProfile($studentId)
    {
        $user = Auth::user();
        
        // Get the student and verify they exist
        $student = User::where('id', $studentId)
            ->where('role', 'student')
            ->firstOrFail();

        // Get school year info
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
        $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

        // Get student's enrollment details (need to use student_personal_info.id, not user.id)
        $studentPersonalInfo = DB::table('student_personal_info')
            ->where('user_id', $studentId)
            ->first();

        $enrollment = null;
        $studentSection = null;
        
        if ($studentPersonalInfo) {
            $enrollment = Enrollment::with('schoolYear')
                ->where('student_id', $studentPersonalInfo->id)
                ->where('school_year_id', $displaySchoolYear->id)
                ->first();
                
            // Get student's section from enrollment
            if ($enrollment && $enrollment->assigned_section_id) {
                $studentSection = Section::find($enrollment->assigned_section_id);
            }
        }

        // Simplified profile - no need to fetch class schedules
        Log::info('Student Profile - Basic info only', [
            'student_id' => $studentId,
            'student_name' => ($student->firstname ?? '') . ' ' . ($student->lastname ?? ''),
            'enrollment_found' => $enrollment ? true : false,
            'section_assigned' => $studentSection ? $studentSection->section_name : 'None'
        ]);

        return Inertia::render('Faculty/Faculty_StudentProfile', [
            'student' => $student,
            'enrollment' => $enrollment,
            'studentSection' => $studentSection,
            'activeSchoolYear' => $activeSchoolYear,
            'displaySchoolYear' => $displaySchoolYear,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    public function inputStudentGrades($classId, $studentId)
    {
        $user = Auth::user();
        
        // Get the class and verify it belongs to this faculty
        $class = ClassSchedule::with(['subject.strand', 'section', 'faculty'])
            ->where('id', $classId)
            ->where('faculty_id', $user->id)
            ->firstOrFail();

        // Get the student
        $student = User::where('id', $studentId)
            ->where('role', 'student')
            ->firstOrFail();

        // Get school year info
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
        $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

        // Get existing grades for this student in this subject for BOTH semesters
        $existingGrades = Grade::where('student_id', $studentId)
            ->where('subject_id', $class->subject_id)
            ->where('class_id', $classId)
            ->where('school_year_id', $displaySchoolYear->id)
            ->get();

        // Format existing grades by semester
        $formattedGrades = $existingGrades->mapWithKeys(function ($grade) {
            return [$grade->semester => [
                'first_quarter' => $grade->first_quarter,   // Q1 (1st sem) or Q3 (2nd sem)
                'second_quarter' => $grade->second_quarter, // Q2 (1st sem) or Q4 (2nd sem)
                'semester_grade' => $grade->semester_grade,
                'semester' => $grade->semester,
                'status' => $grade->status,
                'remarks' => $grade->remarks,
                'quarter_details' => $grade->getQuarterDetails() // Helper method for display
            ]];
        });

        return Inertia::render('Faculty/Faculty_InputGrades', [
            'class' => $class,
            'student' => $student,
            'existingGrades' => $formattedGrades,
            'activeSchoolYear' => $activeSchoolYear,
            'displaySchoolYear' => $displaySchoolYear,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Save student grades for Philippine SHS quarterly system
     */
    public function saveStudentGrades(Request $request, $classId, $studentId)
    {
        // Log immediately when method is called
        Log::info('🔥 SAVE GRADES METHOD CALLED', [
            'class_id' => $classId,
            'student_id' => $studentId,
            'timestamp' => now()->toDateTimeString(),
            'method' => 'saveStudentGrades',
            'request_data' => $request->all()
        ]);
        
        try {
            $user = Auth::user();
            
            // Validate the request - NEW STRUCTURE
            $validated = $request->validate([
                'semester' => 'required|in:1st,2nd',           // CRITICAL: Semester selection
                'first_quarter' => 'nullable|numeric|min:0|max:100',   // Q1 or Q3
                'second_quarter' => 'nullable|numeric|min:0|max:100',  // Q2 or Q4
                'remarks' => 'nullable|string|max:1000'
            ]);

            // Get the class and verify faculty ownership
            $class = ClassSchedule::with(['subject', 'section'])
                ->where('id', $classId)
                ->where('faculty_id', $user->id)
                ->firstOrFail();

            // Verify student exists
            $student = User::where('id', $studentId)
                ->where('role', 'student')
                ->firstOrFail();

            // Get school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
            $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

            if (!$displaySchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found'
                ], 400);
            }

            // Calculate semester grade from the 2 quarters
            $quarters = array_filter([
                $validated['first_quarter'],
                $validated['second_quarter']
            ]);
            
            $semesterGrade = count($quarters) > 0 ? round(array_sum($quarters) / count($quarters), 2) : null;

            // Prepare grade data
            $gradeData = [
                'student_id' => $studentId,                    // Uses users.id directly
                'subject_id' => $class->subject_id,
                'faculty_id' => $user->id,
                'class_id' => $classId,
                'school_year_id' => $displaySchoolYear->id,
                'semester' => $validated['semester'],          // CRITICAL: Semester
                'first_quarter' => $validated['first_quarter'],
                'second_quarter' => $validated['second_quarter'],
                'semester_grade' => $semesterGrade,
                'status' => count($quarters) >= 2 ? 'completed' : 'ongoing',
                'remarks' => $validated['remarks']
            ];

            // Create or update grade record using the new helper method
            $grade = Grade::createOrUpdateGrade($gradeData);

            Log::info('🟢 Grade saved successfully - NEW STRUCTURE', [
                'grade_id' => $grade->id,
                'semester' => $validated['semester'],
                'quarters_entered' => count($quarters),
                'semester_grade' => $semesterGrade
            ]);

            // For Inertia requests, redirect back to refresh the page with updated data
            if (request()->header('X-Inertia')) {
                return redirect()->route('faculty.classes.students', ['classId' => $classId])
                    ->with('success', 'Grades saved successfully');
            }
            
            // Determine quarter labels for response
            $quarterLabels = $validated['semester'] === '1st' 
                ? ['Q1', 'Q2'] 
                : ['Q3', 'Q4'];

            return response()->json([
                'success' => true,
                'message' => "Grades saved successfully for {$validated['semester']} Semester",
                'data' => [
                    'semester' => $validated['semester'],
                    'quarter_labels' => $quarterLabels,
                    'quarters_saved' => count($quarters),
                    'semester_grade' => $semesterGrade,
                    'status' => $grade->status
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error saving grades: ' . $e->getMessage(), [
                'class_id' => $classId,
                'student_id' => $studentId,
                'user_id' => $user->id ?? null,
                'error_line' => $e->getLine(),
                'error_file' => $e->getFile()
            ]);

            // For Inertia requests, redirect back with error
            if (request()->header('X-Inertia')) {
                return back()->withErrors(['message' => 'Failed to save grades: ' . $e->getMessage()]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to save grades. Please try again.'
            ], 500);
        }
    }

    /**
     * Export student list template (no grades, just student info)
     */
    public function exportStudentList($classId)
    {
        // Log immediately when method is called
        Log::info('🔥 EXPORT METHOD CALLED - START', [
            'class_id' => $classId,
            'timestamp' => now()->toDateTimeString(),
            'method' => 'exportStudentList',
            'request_url' => request()->fullUrl(),
            'request_method' => request()->method()
        ]);
        
        // Simple test response first
        if (true) { // Always return test response for now
            Log::info('🔥 RETURNING TEST RESPONSE');
            $testContent = "Test Export Working!\n";
            $testContent .= "Class ID: {$classId}\n";
            $testContent .= "Timestamp: " . now()->toDateTimeString() . "\n";
            
            return response($testContent, 200, [
                'Content-Type' => 'text/plain',
                'Content-Disposition' => 'attachment; filename="test_export.txt"'
            ]);
        }

        try {
            $user = Auth::user();
            
            if (!$user) {
                Log::error('🟢 No authenticated user found');
                return response('Unauthorized - Please log in', 401);
            }
            
            Log::info('🟢 User authenticated successfully', [
                'user_id' => $user->id,
                'user_role' => $user->role
            ]);

            // Get the class and verify it belongs to this faculty
            $class = ClassSchedule::with(['subject.strand', 'section', 'faculty'])
                ->where('id', $classId)
                ->where('faculty_id', $user->id)
                ->firstOrFail();

            // Get school year info
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
            $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

            // Get enrolled students (same logic as viewClassStudents)
            $students = collect([]);
            
            // Get from ClassDetail first
            $classDetails = ClassDetail::with('student')
                ->where('class_id', $classId)
                ->whereHas('student', function($query) {
                    $query->where('role', 'student');
                })
                ->get();
            
            $students = $classDetails->map(function ($classDetail) {
                return $classDetail->student ?? null;
            })->filter()->values();

            // Fallback to enrollment_subjects if no direct assignments
            if ($students->isEmpty()) {
                $enrollmentSubjects = DB::table('enrollment_subjects')
                    ->join('enrollments', 'enrollment_subjects.enrollment_id', '=', 'enrollments.id')
                    ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                    ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                    ->where('enrollment_subjects.subject_id', $class->subject_id)
                    ->where('enrollments.school_year_id', $displaySchoolYear->id)
                    ->whereIn('enrollments.status', ['approved', 'enrolled'])
                    ->where('users.role', 'student')
                    ->select([
                        'users.id',
                        'users.firstname',
                        'users.lastname',
                        'users.email'
                    ])
                    ->get();
                
                $students = $enrollmentSubjects->map(function ($enrollmentSubject) {
                    return (object) [
                        'id' => $enrollmentSubject->id,
                        'firstname' => $enrollmentSubject->firstname,
                        'lastname' => $enrollmentSubject->lastname,
                        'email' => $enrollmentSubject->email
                    ];
                });
            }

            // Fallback to section-based students if still empty
            if ($students->isEmpty()) {
                $sectionStudents = User::join('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                    ->join('enrollments', 'student_personal_info.id', '=', 'enrollments.student_id')
                    ->where('users.role', 'student')
                    ->where('enrollments.section_id', $class->section_id)
                    ->where('enrollments.school_year_id', $displaySchoolYear->id)
                    ->whereIn('enrollments.status', ['approved', 'enrolled'])
                    ->select('users.*')
                    ->get();
                
                $students = $sectionStudents;
            }

            Log::info('🟢 Students retrieved for export', [
                'class_id' => $classId,
                'students_count' => $students->count(),
                'class_subject' => $class->subject->name ?? 'Unknown',
                'class_section' => $class->section->section_name ?? 'Unknown'
            ]);

            // Create CSV content with actual student data
            $csvContent = "Student List - {$class->subject->name}\n";
            $csvContent .= "Section: {$class->section->section_name}\n";
            $csvContent .= "Faculty: {$class->faculty->firstname} {$class->faculty->lastname}\n";
            $csvContent .= "School Year: {$displaySchoolYear->year_start}-{$displaySchoolYear->year_end}\n";
            $csvContent .= "Generated: " . now()->format('Y-m-d H:i:s') . "\n\n";
            
            $csvContent .= "No,Student Name,Email,Student ID,Contact\n";
            
            foreach ($students as $index => $student) {
                $csvContent .= ($index + 1) . ",\"{$student->lastname}, {$student->firstname}\",{$student->email},,\n";
            }
            
            $csvContent .= "\n";
            $csvContent .= "Instructions:\n";
            $csvContent .= "1. This is a student list template for offline reference\n";
            $csvContent .= "2. Use the online system for grade input and management\n";
            $csvContent .= "3. Total Students: " . $students->count() . "\n";
            
            $filename = "student_list_class_{$classId}_" . date('Y-m-d_H-i-s') . ".csv";
            
            Log::info('🟢 Sending CSV response', [
                'filename' => $filename,
                'content_length' => strlen($csvContent)
            ]);

            return response($csvContent, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
                'X-Content-Type-Options' => 'nosniff'
            ]);

        } catch (\Exception $e) {
            Log::error('🟢 Export error occurred', [
                'error' => $e->getMessage(),
                'class_id' => $classId,
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);

            return response('Export failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Export class record to Excel (DepEd SHS format)
     */
    public function exportClassRecord(Request $request, $classId)
    {
        try {
            $user = Auth::user();
            $semester = $request->get('semester', '1st');
            
            Log::info('Export request received', [
                'class_id' => $classId,
                'semester' => $semester,
                'user_id' => $user->id
            ]);
            
            // Get the class and verify faculty ownership
            $class = ClassSchedule::with(['subject.strand', 'section', 'faculty'])
                ->where('id', $classId)
                ->where('faculty_id', $user->id)
                ->firstOrFail();

            // Get school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
            $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

            // Get enrolled students (using corrected database structure)
            $enrollments = DB::table('enrollments')
                ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                ->where('enrollments.school_year_id', $displaySchoolYear->id)
                ->whereIn('enrollments.status', ['approved', 'enrolled'])
                ->where('users.role', 'student')
                ->select([
                    'users.id',
                    'users.firstname',
                    'users.lastname',
                    'users.email'
                ])
                ->orderBy('users.lastname')
                ->orderBy('users.firstname')
                ->get();

            $students = $enrollments->map(function ($enrollment) {
                return (object) [
                    'id' => $enrollment->id,
                    'firstname' => $enrollment->firstname,
                    'lastname' => $enrollment->lastname,
                    'email' => $enrollment->email
                ];
            });

            // Generate filename
            $subjectName = preg_replace('/[^A-Za-z0-9\-_]/', '_', $class->subject->name);
            $sectionName = $class->section ? preg_replace('/[^A-Za-z0-9\-_]/', '_', $class->section->section_name) : 'NoSection';
            $filename = "ClassRecord_{$subjectName}_{$sectionName}_{$semester}Sem_{$displaySchoolYear->year_start}-{$displaySchoolYear->year_end}.xlsx";

            Log::info('Exporting class record', [
                'class_id' => $classId,
                'subject' => $class->subject->name,
                'semester' => $semester,
                'students_count' => $students->count(),
                'filename' => $filename
            ]);

            // For now, let's use a simple CSV export that definitely works
            Log::info('Creating CSV export as fallback...');
            
            $csvContent = "No,Student Name,1st Quarter,2nd Quarter,3rd Quarter,4th Quarter,Semester Grade,Remarks\n";
            $csvContent .= ",,Enter grades 0-100,Enter grades 0-100,Enter grades 0-100,Enter grades 0-100,Auto-calculated,Optional remarks\n";
            
            foreach ($students as $index => $student) {
                $csvContent .= ($index + 1) . ",\"{$student->lastname}, {$student->firstname}\",,,,,,\n";
            }
            
            // Add empty rows for additional students
            for ($i = count($students); $i < 50; $i++) {
                $csvContent .= ($i + 1) . ",\"\",,,,,,\n";
            }
            
            $csvContent .= "\n";
            $csvContent .= "Instructions:,1. Enter grades in columns C-F (0-100),,,,,\n";
            $csvContent .= ",2. Semester grade will be calculated manually,,,,,\n";
            $csvContent .= ",3. Save and upload this file back to the system,,,,,\n";
            $csvContent .= ",4. Passing grade: 75 and above,,,,,\n";
            $csvContent .= "\n";
            $csvContent .= "Class: {$class->subject->name},Semester: {$semester},School Year: {$displaySchoolYear->year_start}-{$displaySchoolYear->year_end},,,,\n";
            
            $csvFilename = str_replace('.xlsx', '.csv', $filename);
            
            return response($csvContent, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $csvFilename . '"',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);

        } catch (\Exception $e) {
            Log::error('Error exporting class record: ' . $e->getMessage(), [
                'class_id' => $classId,
                'user_id' => $user->id ?? null
            ]);

            return back()->with('error', 'Failed to export class record. Please try again.');
        }
    }

    /**
     * Import grades from Excel file
     */
    public function importClassGrades(Request $request, $classId)
    {
        try {
            $user = Auth::user();
            
            $request->validate([
                'excel_file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
                'semester' => 'required|in:1st,2nd'
            ]);

            // Get the class and verify faculty ownership
            $class = ClassSchedule::with(['subject', 'section'])
                ->where('id', $classId)
                ->where('faculty_id', $user->id)
                ->firstOrFail();

            // Get school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $currentAcademicYear = SchoolYear::where('is_current_academic_year', true)->first();
            $displaySchoolYear = $currentAcademicYear ?? $activeSchoolYear;

            // Process the Excel file
            $file = $request->file('excel_file');
            $data = Excel::toArray([], $file)[0]; // Get first sheet

            $importedCount = 0;
            $errors = [];

            // Start from row 12 (after headers) - adjust based on your template
            for ($i = 11; $i < count($data); $i++) {
                $row = $data[$i];
                
                // Skip empty rows
                if (empty($row[1])) continue; // Student name column
                
                $studentName = trim($row[1]);
                if (empty($studentName)) continue;

                // Parse student name (assuming "Lastname, Firstname" format)
                $nameParts = explode(',', $studentName);
                if (count($nameParts) !== 2) continue;
                
                $lastname = trim($nameParts[0]);
                $firstname = trim($nameParts[1]);

                // Find student by name
                $student = User::where('role', 'student')
                    ->where('firstname', 'LIKE', "%{$firstname}%")
                    ->where('lastname', 'LIKE', "%{$lastname}%")
                    ->first();

                if (!$student) {
                    $errors[] = "Student not found: {$studentName}";
                    continue;
                }

                // Extract grades from columns
                $firstQuarter = !empty($row[2]) ? (float)$row[2] : null;
                $secondQuarter = !empty($row[3]) ? (float)$row[3] : null;
                $thirdQuarter = !empty($row[4]) ? (float)$row[4] : null;
                $fourthQuarter = !empty($row[5]) ? (float)$row[5] : null;
                $remarks = !empty($row[7]) ? trim($row[7]) : null;

                // Skip if no grades entered
                if (!$firstQuarter && !$secondQuarter && !$thirdQuarter && !$fourthQuarter) {
                    continue;
                }

                // Calculate semester grade
                $quarters = collect([$firstQuarter, $secondQuarter, $thirdQuarter, $fourthQuarter])
                    ->filter(function($grade) { return $grade !== null && $grade > 0; });
                
                $semesterGrade = $quarters->count() > 0 ? $quarters->avg() : null;

                // Determine status
                $status = $quarters->count() === 4 ? 'completed' : 'ongoing';

                // Save or update grade record
                Grade::updateOrCreate([
                    'student_id' => $student->id,
                    'subject_id' => $class->subject_id,
                    'class_id' => $classId,
                    'semester' => $request->semester,
                    'school_year_id' => $displaySchoolYear->id
                ], [
                    'faculty_id' => $user->id,
                    'first_quarter' => $firstQuarter,
                    'second_quarter' => $secondQuarter,
                    'third_quarter' => $thirdQuarter,
                    'fourth_quarter' => $fourthQuarter,
                    'semester_grade' => $semesterGrade,
                    'status' => $status,
                    'remarks' => $remarks
                ]);

                $importedCount++;
            }

            Log::info('Grades imported successfully', [
                'class_id' => $classId,
                'semester' => $request->semester,
                'imported_count' => $importedCount,
                'errors_count' => count($errors)
            ]);

            $message = "Successfully imported grades for {$importedCount} students.";
            if (!empty($errors)) {
                $message .= " Errors: " . implode(', ', array_slice($errors, 0, 3));
                if (count($errors) > 3) {
                    $message .= " and " . (count($errors) - 3) . " more.";
                }
            }

            return back()->with('success', $message);

        } catch (\Exception $e) {
            Log::error('Error importing grades: ' . $e->getMessage(), [
                'class_id' => $classId,
                'user_id' => $user->id ?? null
            ]);

            return back()->with('error', 'Failed to import grades. Please check the file format and try again.');
        }
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
                'sections' => collect([]),
                'auth' => [
                    'user' => $user
                ]
            ]);
        }

        // Get sections where this faculty teaches, organized by section
        $sections = DB::table('class')
            ->join('sections', 'class.section_id', '=', 'sections.id')
            ->join('subjects', 'class.subject_id', '=', 'subjects.id')
            ->join('strands', 'subjects.strand_id', '=', 'strands.id')
            ->where('class.faculty_id', $user->id)
            ->where('class.school_year_id', $activeSchoolYear->id)
            ->where('class.is_active', true)
            ->select([
                'sections.id',
                'sections.section_name',
                'strands.name as strand_name',
                'strands.code as strand_code'
            ])
            ->distinct()
            ->get()
            ->map(function ($section) use ($user, $activeSchoolYear) {
                // Get subjects taught by this faculty in this section
                $subjects = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->where('class.faculty_id', $user->id)
                    ->where('class.section_id', $section->id)
                    ->where('class.school_year_id', $activeSchoolYear->id)
                    ->where('class.is_active', true)
                    ->select([
                        'subjects.id',
                        'subjects.name',
                        'subjects.semester'
                    ])
                    ->get();

                // Get student count for this section
                $studentCount = DB::table('class_details')
                    ->join('enrollments', 'class_details.enrollment_id', '=', 'enrollments.id')
                    ->join('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                    ->where('sections.id', $section->id)
                    ->where('class_details.is_enrolled', true)
                    ->distinct('enrollments.student_id')
                    ->count();

                return [
                    'id' => $section->id,
                    'section_name' => $section->section_name,
                    'strand_name' => $section->strand_name,
                    'strand_code' => $section->strand_code,
                    'student_count' => $studentCount,
                    'subjects' => $subjects
                ];
            });

        return Inertia::render('Faculty/Faculty_Grades', [
            'sections' => $sections,
            'activeSchoolYear' => $activeSchoolYear,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Get students and grades for a specific section and subject
     */
    public function getSectionSubjectGrades($sectionId, $subjectId, Request $request)
    {
        $user = Auth::user();

        // Verify this faculty teaches this subject in this section
        $classExists = DB::table('class')
            ->where('faculty_id', $user->id)
            ->where('section_id', $sectionId)
            ->where('subject_id', $subjectId)
            ->where('is_active', true)
            ->exists();

        if (!$classExists) {
            return response()->json(['error' => 'Unauthorized access to this class'], 403);
        }

        // Get students in this section
        $students = DB::table('class_details')
            ->join('enrollments', 'class_details.enrollment_id', '=', 'enrollments.id')
            ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
            ->join('users', 'student_personal_info.user_id', '=', 'users.id')
            ->where('enrollments.assigned_section_id', $sectionId)
            ->where('class_details.is_enrolled', true)
            ->where('users.role', 'student')
            ->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'student_personal_info.id as student_info_id',
                'student_personal_info.lrn',
                'student_personal_info.grade_level'
            ])
            ->distinct()
            ->get();

        // Get existing grades for these students
        $grades = Grade::where('subject_id', $subjectId)
            ->whereIn('student_id', $students->pluck('student_info_id'))
            ->get();

        return Inertia::render('Faculty/Faculty_Grades', [
            'students' => $students,
            'grades' => $grades,
            'section_id' => $sectionId,
            'subject_id' => $subjectId
        ]);
    }

    /**
     * Save grades for a student
     */
    public function saveGrades(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'student_id' => 'required|exists:users,id',
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'required|exists:sections,id',
            'semester' => 'required|in:1st,2nd',               // NEW: Semester required
            'first_quarter' => 'nullable|numeric|min:0|max:100',
            'second_quarter' => 'nullable|numeric|min:0|max:100',
            'remarks' => 'nullable|string|max:1000'
        ]);

        // Verify faculty teaches this subject in this section
        $classExists = ClassSchedule::where('faculty_id', $user->id)
            ->where('section_id', $validated['section_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('is_active', true)
            ->first();

        if (!$classExists) {
            return response()->json(['error' => 'Unauthorized access to this class'], 403);
        }

        // Calculate semester grade
        $quarters = array_filter([
            $validated['first_quarter'],
            $validated['second_quarter']
        ]);

        $semesterGrade = count($quarters) > 0 ? round(array_sum($quarters) / count($quarters), 2) : null;

        // Get current school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Create or update grade record
        $gradeData = [
            'student_id' => $validated['student_id'],
            'subject_id' => $validated['subject_id'],
            'faculty_id' => $user->id,
            'class_id' => $classExists->id,
            'school_year_id' => $activeSchoolYear->id,
            'semester' => $validated['semester'],              // NEW: Semester
            'first_quarter' => $validated['first_quarter'],
            'second_quarter' => $validated['second_quarter'],
            'semester_grade' => $semesterGrade,
            'status' => count($quarters) >= 2 ? 'completed' : 'ongoing',
            'remarks' => $validated['remarks']
        ];

        $grade = Grade::createOrUpdateGrade($gradeData);

        return response()->json([
            'success' => true,
            'message' => 'Grades saved successfully',
            'data' => [
                'semester' => $validated['semester'],
                'semester_grade' => $semesterGrade,
                'status' => $grade->status
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

        // Get all enrolled students for the active school year only
        // This ensures data is filtered by the currently active school year
        $enrolledStudents = DB::table('enrollments')
            ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
            ->join('users', 'student_personal_info.user_id', '=', 'users.id')
            ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
            ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
            ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
            ->where('enrollments.status', 'enrolled')
            ->where('users.role', 'student')
            ->when($activeSchoolYear, function ($query) use ($activeSchoolYear) {
                return $query->where('enrollments.school_year_id', $activeSchoolYear->id);
            })
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
                'enrollments.created_at as enrolled_at'
            ])
            ->distinct()
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();
            
        // Auto-fix if no students found and there's an active school year
        // DISABLED: This was causing issues by automatically deleting and recreating enrollments
        // Only enable this manually when needed for data migration
        if (false && $enrolledStudents->count() === 0 && $activeSchoolYear) {
            Log::info('No enrolled students found, running auto-fix');
            $this->autoFixStudentEnrollments($activeSchoolYear);
            
            // Retry query after auto-fix using class_details table
            // Using correct table structure (enrollment_id)
            $enrolledStudents = DB::table('class_details')
                ->join('enrollments', 'class_details.enrollment_id', '=', 'enrollments.id')
                ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
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
            'all_students' => $enrolledStudents->map(function($student) {
                return [
                    'user_id' => $student->user_id,
                    'name' => $student->firstname . ' ' . $student->lastname,
                    'email' => $student->email,
                    'section' => $student->section_name,
                    'has_class_details' => true // Since we're showing enrolled students, they have class details
                ];
            })->toArray()
        ]);

        // Format students for frontend
        $formattedStudents = $enrolledStudents->map(function($student) use ($activeSchoolYear) {
            // Get class schedules for the student's section
            $schedules = [];
            if ($student->section_id && $activeSchoolYear) {
                $sectionSchedules = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->leftJoin('users', 'class.faculty_id', '=', 'users.id')
                    ->where('class.section_id', $student->section_id)
                    ->where('class.school_year_id', $activeSchoolYear->id)
                    ->where('class.is_active', true)
                    ->select([
                        'class.*',
                        'subjects.name as subject_name',
                        'subjects.code as subject_code',
                        'users.firstname as faculty_firstname',
                        'users.lastname as faculty_lastname'
                    ])
                    ->get();

                $schedules = $sectionSchedules->map(function($schedule) {
                    return [
                        'id' => $schedule->id,
                        'subject_name' => $schedule->subject_name,
                        'subject_code' => $schedule->subject_code,
                        'day_of_week' => $schedule->day_of_week,
                        'start_time' => $schedule->start_time,
                        'end_time' => $schedule->end_time,
                        'room' => $schedule->room,
                        'faculty_firstname' => $schedule->faculty_firstname,
                        'faculty_lastname' => $schedule->faculty_lastname,
                        'semester' => $schedule->semester
                    ];
                })->toArray();
            }

            return [
                'id' => $student->user_id,
                'personal_info_id' => $student->personal_info_id,
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
                'schedules' => $schedules
            ];
        });

        return Inertia::render('Faculty/Faculty_Students', [
            'enrolledStudents' => $formattedStudents,
            'allowFacultyCorPrint' => (bool)($activeSchoolYear->allow_faculty_cor_print ?? true),
            'activeSchoolYear' => $activeSchoolYear,
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
            // Using correct table structure (enrollment_id)
            $classDetailId = DB::table('class_details')->insertGetId([
                'class_id' => 1, // Default class ID - this should be updated based on actual class schedules
                'enrollment_id' => $enrollmentId,
                'student_id' => $personalInfoId, // Add the missing student_id field
                'section_id' => $sectionId,
                'is_enrolled' => true,
                'enrolled_at' => now(),
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
        // Using correct table structure (enrollment_id)
        $enrollmentsWithoutClassDetails = DB::table('enrollments')
            ->leftJoin('class_details', 'enrollments.id', '=', 'class_details.enrollment_id')
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
                    'enrollment_id' => $enrollment->enrollment_id,
                    'section_id' => $enrollment->assigned_section_id,
                    'is_enrolled' => true,
                    'enrolled_at' => $enrollment->enrollment_date ?? now(),
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

    /**
     * Get all Grade 11 students eligible for progression to Grade 12
     */
    public function getGrade11Students()
    {
        try {
            // Get current active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found',
                    'students' => []
                ]);
            }

            // Get Grade 11 students enrolled in the active school year
            $grade11Students = DB::table('enrollments')
                ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('student_personal_info.grade_level', '11')
                ->where('enrollments.school_year_id', $activeSchoolYear->id)
                ->where('enrollments.status', 'enrolled')
                ->select([
                    'student_personal_info.id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'student_personal_info.grade_level',
                    'strands.name as strand_name',
                    'sections.section_name',
                    'student_personal_info.lrn',
                    'enrollments.status as student_status'
                ])
                ->get();

            return response()->json([
                'success' => true,
                'students' => $grade11Students,
                'active_school_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching Grade 11 students: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Grade 11 students: ' . $e->getMessage(),
                'students' => []
            ], 500);
        }
    }

    /**
     * Progress a Grade 11 student to Grade 12
     */
    public function progressToGrade12(Request $request)
    {
        $request->validate([
            'student_id' => 'required|integer|exists:users,id',
            'school_year_id' => 'required|integer|exists:school_years,id'
        ]);

        try {
            DB::beginTransaction();

            $studentId = $request->student_id;
            $schoolYearId = $request->school_year_id;

            // Check if student exists and has Grade 11 enrollment
            $grade11Enrollment = Enrollment::where('user_id', $studentId)
                ->where('grade_level', '11')
                ->where('school_year_id', $schoolYearId)
                ->where('status', 'enrolled')
                ->first();

            if (!$grade11Enrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found or not enrolled in Grade 11'
                ]);
            }

            // Check if student already has Grade 12 enrollment
            $existingGrade12 = Enrollment::where('user_id', $studentId)
                ->where('grade_level', '12')
                ->where('school_year_id', $schoolYearId)
                ->first();

            if ($existingGrade12) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student is already enrolled in Grade 12'
                ]);
            }

            // Get the student's current section and strand
            $currentSection = Section::find($grade11Enrollment->section_id);
            
            // Find corresponding Grade 12 section (same strand)
            $grade12Section = Section::where('strand_id', $currentSection->strand_id)
                ->where('grade_level', '12')
                ->first();

            // If no Grade 12 section exists, create one
            if (!$grade12Section) {
                $strand = \App\Models\Strand::find($currentSection->strand_id);
                $grade12Section = new Section();
                $grade12Section->name = $strand->code . '-12A'; // e.g., STEM-12A, HUMSS-12A
                $grade12Section->strand_id = $currentSection->strand_id;
                $grade12Section->grade_level = '12';
                $grade12Section->capacity = 40; // Default capacity
                $grade12Section->save();
                
                Log::info("Created new Grade 12 section: {$grade12Section->name} for strand: {$strand->name}");
            }

            // Create new Grade 12 enrollment
            $grade12Enrollment = new Enrollment();
            $grade12Enrollment->user_id = $studentId;
            $grade12Enrollment->school_year_id = $schoolYearId;
            $grade12Enrollment->section_id = $grade12Section->id;
            $grade12Enrollment->grade_level = '12';
            $grade12Enrollment->status = 'enrolled';
            $grade12Enrollment->student_status = 'continuing';
            $grade12Enrollment->lrn = $grade11Enrollment->lrn;
            $grade12Enrollment->enrollment_date = now();
            $grade12Enrollment->save();

            // Copy Grade 11 subjects to Grade 12 (for COR continuity)
            $grade11Subjects = DB::table('enrollment_subjects')
                ->where('enrollment_id', $grade11Enrollment->id)
                ->get();

            foreach ($grade11Subjects as $subject) {
                // Get corresponding Grade 12 subjects for the same strand
                $grade12Subject = DB::table('subjects')
                    ->where('strand_id', $currentSection->strand_id)
                    ->where('grade_level', '12')
                    ->where('semester', $subject->semester)
                    ->first();

                if ($grade12Subject) {
                    DB::table('enrollment_subjects')->insert([
                        'enrollment_id' => $grade12Enrollment->id,
                        'subject_id' => $grade12Subject->id,
                        'semester' => $subject->semester,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }

            // Update Grade 11 enrollment status to completed
            $grade11Enrollment->status = 'completed';
            $grade11Enrollment->save();

            DB::commit();

            // Get student name for response
            $student = User::find($studentId);

            return response()->json([
                'success' => true,
                'message' => "Student {$student->firstname} {$student->lastname} has been successfully progressed to Grade 12",
                'grade12_section' => $grade12Section->name,
                'enrollment_id' => $grade12Enrollment->id
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error progressing student to Grade 12: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to progress student to Grade 12. Please try again.'
            ], 500);
        }
    }

    /**
     * Get detailed student information
     */
    public function getStudentDetails($id)
    {
        try {
            $student = DB::table('enrollments')
                ->join('users', 'enrollments.user_id', '=', 'users.id')
                ->leftJoin('sections', 'enrollments.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('users.id', $id)
                ->select([
                    'users.*',
                    'enrollments.grade_level',
                    'enrollments.lrn',
                    'enrollments.student_status',
                    'enrollments.enrollment_date',
                    'strands.name as strand_name',
                    'sections.name as section_name'
                ])
                ->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }

            return response()->json($student);

        } catch (\Exception $e) {
            Log::error('Error fetching student details: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student details'
            ], 500);
        }
    }

    /**
     * Show manual enrollment page for coordinators
     */
    public function manualEnrollmentPage()
    {
        $user = Auth::user();
        
        // Check if user is a coordinator
        if (!$user->is_coordinator) {
            return redirect()->route('faculty.dashboard')
                ->with('error', 'Access denied. Only coordinators can access manual enrollment.');
        }

        $strands = Strand::all();
        $sections = Section::with('strand')->get();

        return Inertia::render('Faculty/Faculty_ManualEnrollment', [
            'strands' => $strands,
            'sections' => $sections,
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Process manual enrollment for students without internet/email
     */
    public function processManualEnrollment(Request $request)
    {
        $user = Auth::user();
        
        // Check if user is a coordinator
        if (!$user->is_coordinator) {
            return back()->with('error', 'Access denied. Only coordinators can perform manual enrollment.');
        }

        try {
            // Validate the request
            $validated = $request->validate([
                'firstname' => 'required|string|max:255',
                'lastname' => 'required|string|max:255',
                'middlename' => 'nullable|string|max:255',
                'suffix' => 'nullable|string|max:10',
                'birthdate' => 'required|date',
                'gender' => 'required|in:Male,Female',
                'contact_number' => 'required|string|max:20',
                'email' => 'nullable|email|unique:users,email',
                'address' => 'required|string',
                'guardian_name' => 'required|string|max:255',
                'guardian_contact' => 'required|string|max:20',
                'guardian_relationship' => 'nullable|string|max:50',
                'lrn' => 'required|string|size:12|regex:/^\d{12}$/|unique:student_personal_info,lrn',
                'strand_id' => 'required|exists:strands,id',
                'student_type' => 'required|in:new,transferee',
                'previous_school' => 'nullable|string|max:255',
                'notes' => 'nullable|string'
            ]);

            DB::beginTransaction();

            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                throw new \Exception('No active school year found.');
            }

            // Use the provided LRN (already validated for uniqueness)
            $lrn = $validated['lrn'];

            // Create user account (optional email)
            $userData = [
                'name' => trim($validated['firstname'] . ' ' . ($validated['middlename'] ? $validated['middlename'] . ' ' : '') . $validated['lastname']),
                'email' => $validated['email'] ?: $lrn . '@manual.enrollment', // Use LRN-based email if no email provided
                'password' => bcrypt('password123'), // Default password
                'role' => 'student',
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'middlename' => $validated['middlename'],
                'suffix' => $validated['suffix'],
                'birthdate' => $validated['birthdate'],
                'gender' => $validated['gender'],
                'contact_number' => $validated['contact_number'],
                'address' => $validated['address'],
                'guardian_name' => $validated['guardian_name'],
                'guardian_contact' => $validated['guardian_contact'],
                'guardian_relationship' => $validated['guardian_relationship'],
                'is_manual_enrollment' => true,
                'enrolled_by_coordinator' => $user->id
            ];

            $newUser = User::create($userData);

            // Create student_personal_info record (required by existing system)
            $personalInfoId = DB::table('student_personal_info')->insertGetId([
                'user_id' => $newUser->id,
                'lrn' => $lrn,
                'grade_level' => '11',
                'birthdate' => $validated['birthdate'],
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Auto-assign to a section if available
            $strand = Strand::find($validated['strand_id']);
            $availableSection = Section::where('strand_id', $validated['strand_id'])
                ->where('school_year_id', $activeSchoolYear->id)
                ->first();

            // Create enrollment record using the existing schema
            $enrollmentId = DB::table('enrollments')->insertGetId([
                'student_id' => $personalInfoId, // Use student_personal_info.id
                'school_year_id' => $activeSchoolYear->id,
                'strand_id' => $validated['strand_id'],
                'assigned_section_id' => $availableSection ? $availableSection->id : null,
                'status' => 'enrolled', // Use 'enrolled' status for existing system
                'date_enrolled' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Create class_details record for tracking
            if ($availableSection) {
                DB::table('class_details')->insertGetId([
                    'class_id' => 1, // Default class ID
                    'enrollment_id' => $enrollmentId,
                    'student_id' => $personalInfoId,
                    'section_id' => $availableSection->id,
                    'is_enrolled' => true,
                    'enrolled_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            DB::commit();

            Log::info('Manual enrollment completed', [
                'student_id' => $newUser->id,
                'lrn' => $lrn,
                'coordinator_id' => $user->id,
                'strand' => $strand->name
            ]);

            return back()->with('success', 
                "Student {$validated['firstname']} {$validated['lastname']} has been successfully enrolled manually. " .
                "LRN: {$lrn}. Default password: password123"
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollback();
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Manual enrollment failed: ' . $e->getMessage());
            return back()->with('error', 'Failed to enroll student: ' . $e->getMessage());
        }
    }

    /**
     * Generate unique LRN (Learner Reference Number)
     */
    private function generateLRN()
    {
        do {
            // Generate LRN in format: YYYY + 8 random digits
            $lrn = date('Y') . str_pad(rand(0, 99999999), 8, '0', STR_PAD_LEFT);
        } while (DB::table('student_personal_info')->where('lrn', $lrn)->exists());

        return $lrn;
    }
}
