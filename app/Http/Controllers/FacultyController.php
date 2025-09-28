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
                        // First try to get from ClassDetail (direct class assignments)
                        // Only include ClassDetails where the student has role 'student'
                        $classDetails = ClassDetail::with('student')
                            ->where('class_id', $class->id)
                            ->whereHas('student', function($query) {
                                $query->where('role', 'student');
                            })
                            ->get();
                        
                        $enrolledStudents = $classDetails->map(function ($classDetail) {
                            return $classDetail->student ?? null;
                        })->filter()->values();

                        // If no direct class assignments, get students enrolled in this specific subject
                        if ($enrolledStudents->isEmpty()) {
                            // Get students enrolled in this specific subject
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
                                    'users.email',
                                    'users.role',
                                    'student_personal_info.id as personal_info_id'
                                ])
                                ->get();
                            
                            $enrolledStudents = $enrollmentSubjects->map(function ($enrollmentSubject) {
                                return (object) [
                                    'id' => $enrollmentSubject->id,
                                    'firstname' => $enrollmentSubject->firstname,
                                    'lastname' => $enrollmentSubject->lastname,
                                    'email' => $enrollmentSubject->email,
                                    'role' => $enrollmentSubject->role
                                ];
                            });
                            
                            Log::info('Classes page - Subject-specific students found', [
                                'subject_id' => $class->subject_id,
                                'subject_name' => $class->subject->name ?? 'Unknown',
                                'student_count' => $enrolledStudents->count(),
                                'students' => $enrolledStudents->pluck('firstname')->toArray()
                            ]);
                            
                            // Fallback: if no enrollment_subjects, use section-based count
                            if ($enrolledStudents->isEmpty() && $class->section_id) {
                                $sectionStudents = DB::table('enrollments')
                                    ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                                    ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                                    ->where('enrollments.assigned_section_id', $class->section_id)
                                    ->where('enrollments.school_year_id', $displaySchoolYear->id)
                                    ->whereIn('enrollments.status', ['approved', 'enrolled'])
                                    ->where('users.role', 'student')
                                    ->select([
                                        'users.id',
                                        'users.firstname',
                                        'users.lastname',
                                        'users.email',
                                        'users.role'
                                    ])
                                    ->get();
                                
                                $enrolledStudents = $sectionStudents->map(function ($sectionStudent) {
                                    return (object) [
                                        'id' => $sectionStudent->id,
                                        'firstname' => $sectionStudent->firstname,
                                        'lastname' => $sectionStudent->lastname,
                                        'email' => $sectionStudent->email,
                                        'role' => $sectionStudent->role
                                    ];
                                });
                            }
                        }
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
            // First try to get from ClassDetail (direct class assignments)
            // Only include ClassDetails where the student has role 'student'
            $classDetails = ClassDetail::with('student')
                ->where('class_id', $classId)
                ->whereHas('student', function($query) {
                    $query->where('role', 'student');
                })
                ->get();
            
            $students = $classDetails->map(function ($classDetail) {
                return $classDetail->student ?? null;
            })->filter()->values();

            // If no direct class assignments, check enrollment_subjects for this specific subject
            if ($students->isEmpty()) {
                Log::info('No ClassDetail students found for class ' . $classId . ', checking enrollment_subjects for subject ' . $class->subject_id);
                
                // Get students who are specifically enrolled in this subject
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
                        'users.email',
                        'users.role',
                        'student_personal_info.id as personal_info_id',
                        'enrollment_subjects.subject_id'
                    ])
                    ->get();
                
                Log::info('Found ' . $enrollmentSubjects->count() . ' students enrolled in subject ' . $class->subject_id . ' for school year ' . $displaySchoolYear->id);
                
                $students = $enrollmentSubjects->map(function ($enrollmentSubject) {
                    Log::info('Processing student enrolled in subject: ' . $enrollmentSubject->firstname . ' ' . $enrollmentSubject->lastname);
                    return (object) [
                        'id' => $enrollmentSubject->id,
                        'firstname' => $enrollmentSubject->firstname,
                        'lastname' => $enrollmentSubject->lastname,
                        'email' => $enrollmentSubject->email,
                        'role' => $enrollmentSubject->role,
                        'phone' => null, // Phone not available in users table
                        'student_id' => null // Student ID not available in users table
                    ];
                });
                
                Log::info('Final students collection count for this subject: ' . $students->count());
                
                // If still no students found, it might mean enrollment_subjects table isn't populated
                // In that case, show students from the same section as a fallback
                if ($students->isEmpty() && $class->section_id) {
                    Log::info('No enrollment_subjects found, falling back to section-based students for section ' . $class->section_id);
                    
                    $sectionStudents = DB::table('enrollments')
                        ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                        ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                        ->where('enrollments.assigned_section_id', $class->section_id)
                        ->where('enrollments.school_year_id', $displaySchoolYear->id)
                        ->whereIn('enrollments.status', ['approved', 'enrolled'])
                        ->where('users.role', 'student')
                        ->select([
                            'users.id',
                            'users.firstname',
                            'users.lastname',
                            'users.email',
                            'users.role',
                            'student_personal_info.id as personal_info_id'
                        ])
                        ->get();
                    
                    $students = $sectionStudents->map(function ($sectionStudent) {
                        return (object) [
                            'id' => $sectionStudent->id,
                            'firstname' => $sectionStudent->firstname,
                            'lastname' => $sectionStudent->lastname,
                            'email' => $sectionStudent->email,
                            'role' => $sectionStudent->role,
                            'phone' => null,
                            'student_id' => null
                        ];
                    });
                    
                    Log::info('Fallback: Found ' . $students->count() . ' students in section ' . $class->section_id);
                }
            }
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

        // Get existing grades for this student in this subject
        $existingGrades = Grade::where('student_id', $studentId)
            ->where('subject_id', $class->subject_id)
            ->where('class_id', $classId)
            ->where('school_year_id', $displaySchoolYear->id)
            ->get();

        // Format existing grades for frontend
        $formattedGrades = $existingGrades->mapWithKeys(function ($grade) {
            return [$grade->semester => [
                'first_quarter' => $grade->first_quarter,
                'second_quarter' => $grade->second_quarter,
                'third_quarter' => $grade->third_quarter,
                'fourth_quarter' => $grade->fourth_quarter,
                'semester_grade' => $grade->semester_grade,
                'semester' => $grade->semester,
                'status' => $grade->status,
                'remarks' => $grade->remarks
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
            
            // Validate the request
            $validated = $request->validate([
                'first_quarter' => 'nullable|numeric|min:0|max:100',
                'second_quarter' => 'nullable|numeric|min:0|max:100',
                'third_quarter' => 'nullable|numeric|min:0|max:100',
                'fourth_quarter' => 'nullable|numeric|min:0|max:100',
                'semester_grade' => 'nullable|numeric|min:0|max:100',
                'remarks' => 'nullable|string|max:1000'
            ]);

            // Get the class and verify faculty ownership
            $class = ClassSchedule::with(['subject', 'section'])
                ->where('id', $classId)
                ->where('faculty_id', $user->id)
                ->firstOrFail();

            // Verify student exists and get student_personal_info ID
            $student = User::where('id', $studentId)
                ->where('role', 'student')
                ->firstOrFail();
                
            // Get the student_personal_info record
            Log::info('🔍 Looking for student_personal_info', [
                'user_id' => $studentId,
                'class_id' => $classId
            ]);
            
            $studentPersonalInfo = Student::where('user_id', $studentId)->first();
            
            if (!$studentPersonalInfo) {
                // Let's see what student records exist
                $allStudents = Student::all(['id', 'user_id'])->toArray();
                Log::warning('🟡 Student personal info not found, creating basic record', [
                    'user_id' => $studentId,
                    'class_id' => $classId,
                    'all_students_in_table' => $allStudents
                ]);
                
                // Create a basic student_personal_info record for this user
                $studentPersonalInfo = Student::create([
                    'user_id' => $studentId,
                    'student_status' => 'active',
                    'grade_level' => '11', // Default for SHS
                    // Other fields can be null for now
                ]);
                
                Log::info('🟢 Created student_personal_info record', [
                    'student_personal_info_id' => $studentPersonalInfo->id,
                    'user_id' => $studentId
                ]);
            }
            
            // Use student_personal_info.id as required by the database foreign key constraint
            $actualStudentId = $studentPersonalInfo->id;
            
            Log::info('🔍 Student ID mapping', [
                'url_student_id' => $studentId,
                'student_personal_info_found' => $studentPersonalInfo->toArray(),
                'actual_student_id_to_use' => $actualStudentId,
                'note' => 'Using student_personal_info.id as required by database constraint'
            ]);

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

            // Check if grade record already exists
            $existingGrade = Grade::where('student_id', $actualStudentId)
                ->where('subject_id', $class->subject_id)
                ->where('class_id', $classId)
                ->where('school_year_id', $displaySchoolYear->id)
                ->first();

            // Calculate semester grade from entered quarters
            $quarters = collect([
                $validated['first_quarter'],
                $validated['second_quarter'],
                $validated['third_quarter'],
                $validated['fourth_quarter']
            ])->filter(function($grade) {
                return $grade !== null && $grade > 0;
            });

            $semesterGrade = $quarters->count() > 0 ? $quarters->avg() : null;

            // Determine status
            $status = 'ongoing';
            if ($quarters->count() === 4) {
                $status = 'completed';
            }

            // Progressive grading: Allow adding more quarters until all 4 are complete
            if ($existingGrade) {
                // Check if all 4 quarters are already filled (completed)
                $existingQuarters = [
                    $existingGrade->first_quarter,
                    $existingGrade->second_quarter,
                    $existingGrade->third_quarter,
                    $existingGrade->fourth_quarter
                ];
                $filledQuarters = array_filter($existingQuarters, function($q) { return $q !== null && $q > 0; });
                
                if (count($filledQuarters) >= 4) {
                    Log::info('🔒 Grade edit attempt blocked - all quarters completed', [
                        'class_id' => $classId,
                        'student_id' => $studentId,
                        'existing_grade_id' => $existingGrade->id,
                        'filled_quarters' => count($filledQuarters)
                    ]);
                    
                    if (request()->header('X-Inertia')) {
                        return back()->withErrors(['message' => 'All quarters are complete. Grades have been finalized and submitted to registrar.']);
                    }
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'All quarters are complete. Grades have been finalized and submitted to registrar.'
                    ], 403);
                }
                
                // Allow progressive entry - merge new quarters with existing ones
                Log::info('🟡 Progressive grade entry - adding more quarters', [
                    'class_id' => $classId,
                    'student_id' => $studentId,
                    'existing_quarters' => count($filledQuarters),
                    'new_quarters_being_added' => $quarters->count()
                ]);
            }

            $gradeData = [
                'student_id' => $actualStudentId, // Use student_personal_info ID
                'subject_id' => $class->subject_id,
                'faculty_id' => $user->id,
                'class_id' => $classId,
                'school_year_id' => $displaySchoolYear->id,
                'first_quarter' => $validated['first_quarter'],
                'second_quarter' => $validated['second_quarter'],
                'third_quarter' => $validated['third_quarter'],
                'fourth_quarter' => $validated['fourth_quarter'],
                'semester_grade' => $semesterGrade,
                'semester' => '1st', // Default to 1st semester since we removed semester dropdown
                'status' => $status,
                'remarks' => $validated['remarks'] ?? null
            ];

            if ($existingGrade) {
                // Update existing grade with new quarters (progressive entry)
                $existingGrade->update($gradeData);
                $grade = $existingGrade;
                
                Log::info('🟡 Grade record updated with additional quarters', [
                    'grade_id' => $grade->id,
                    'student_id' => $studentId,
                    'class_id' => $classId,
                    'total_quarters_now' => $quarters->count()
                ]);
            } else {
                // Create new grade record
                $grade = Grade::create($gradeData);
                
                Log::info('🟢 New grade record created', [
                    'grade_id' => $grade->id,
                    'student_id' => $studentId,
                    'class_id' => $classId,
                    'quarters_entered' => $quarters->count()
                ]);
            }

            // Submit grade for approval if all quarters are complete
            if ($quarters->count() === 4) {
                $grade->submitForApproval();
                Log::info('Grade submitted for approval', [
                    'grade_id' => $grade->id,
                    'student_id' => $studentId,
                    'subject_id' => $class->subject_id,
                    'submitted_at' => now()
                ]);
            }

            Log::info('Grade saved successfully', [
                'grade_id' => $grade->id,
                'student_id' => $studentId,
                'subject_id' => $class->subject_id,
                'quarters_entered' => $quarters->count(),
                'semester_grade' => $semesterGrade,
                'status' => $status,
                'approval_status' => $grade->approval_status,
                'is_passing' => $semesterGrade ? $semesterGrade >= 75 : false
            ]);

            // For Inertia requests, redirect back to refresh the page with updated data
            if (request()->header('X-Inertia')) {
                return redirect()->route('faculty.classes.students', ['classId' => $classId])
                    ->with('success', 'Grades saved successfully');
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Grades saved successfully',
                'grade' => $grade,
                'status' => $status,
                'quarters_filled' => $quarters->count()
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
                'classes' => collect([]),
                'auth' => [
                    'user' => $user
                ]
            ]);
        }

        // Get faculty's assigned classes with students
        $classes = ClassSchedule::with(['subject', 'section', 'schoolYear'])
            ->where('faculty_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('is_active', true)
            ->get();

        // Format classes data for frontend
        $formattedClasses = $classes->map(function ($class) {
            return [
                'id' => $class->id,
                'subject' => $class->subject,
                'section' => $class->section,
                'school_year' => $class->schoolYear,
                'student_count' => $class->section ? $class->section->students()->count() : 0,
                'faculty_id' => $class->faculty_id,
                'is_active' => $class->is_active
            ];
        });

        return Inertia::render('Faculty/Faculty_Grades', [
            'classes' => $formattedClasses,
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

        // Get all enrolled students (not just those with class_details)
        // This shows all students who have completed enrollment, regardless of class assignments
        $enrolledStudents = DB::table('enrollments')
            ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
            ->join('users', 'student_personal_info.user_id', '=', 'users.id')
            ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
            ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
            ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
            ->leftJoin('class_details', 'student_personal_info.id', '=', 'class_details.student_id')
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
                'enrollments.created_at as enrolled_at',
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
            'all_students' => $enrolledStudents->map(function($student) {
                return [
                    'user_id' => $student->user_id,
                    'name' => $student->firstname . ' ' . $student->lastname,
                    'email' => $student->email,
                    'section' => $student->section_name,
                    'has_class_details' => $student->class_detail_id ? true : false
                ];
            })->toArray()
        ]);

        // Format students for frontend
        $formattedStudents = $enrolledStudents->map(function($student) {
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
        });

        return Inertia::render('Faculty/Faculty_Students', [
            'students' => $formattedStudents,
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
