<?php

namespace App\Http\Controllers;

use App\Models\FacultyLoad;
use App\Models\ClassSchedule;
use App\Models\SchoolYear;
use App\Models\User;
use App\Models\Grade;
use App\Models\Subject;
use App\Models\Section;
use App\Models\Enrollment;
use App\Models\GradeInputRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Carbon\Carbon;

class FacultyController extends Controller
{
    /**
     * Display faculty load dashboard.
     */
    public function loadDashboard()
    {
        $user = Auth::user();
        
        if (!$user) {
            return redirect()->route('login');
        }

        if (!in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_LoadDashboard', [
                'facultyLoad' => [
                    'total_loads' => 0,
                    'max_loads' => 5,
                    'remaining_loads' => 5,
                    'is_overloaded' => false,
                    'utilization_percentage' => 0,
                ],
                'classes' => [],
                'notifications' => [
                    [
                        'type' => 'warning',
                        'title' => 'No Active School Year',
                        'message' => 'No active school year found. Contact the registrar to activate a school year.'
                    ]
                ],
                'academicCalendar' => [
                    'semester' => 'N/A',
                    'year_start' => date('Y'),
                    'year_end' => date('Y') + 1,
                    'current_quarter' => null,
                ]
            ]);
        }

        // Get or create faculty load record
        $facultyLoad = FacultyLoad::firstOrCreate([
            'faculty_id' => $user->id,
            'school_year_id' => $activeSchoolYear->id,
        ], [
            'total_loads' => 0,
            'max_loads' => 5,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        // Update load count
        $facultyLoad->updateLoadCount();

        // Get faculty classes
        $classes = ClassSchedule::where('faculty_id', $user->id)
                            ->where('school_year_id', $activeSchoolYear->id)
                            ->where('is_active', true)
                            ->with(['subject', 'section.strand'])
                            ->get()
                            ->map(function ($class) {
                                return [
                                    'id' => $class->id,
                                    'subject_name' => $class->subject->name,
                                    'section_name' => $class->section->section_name,
                                    'strand_name' => $class->section->strand->name ?? null,
                                    'day_of_week' => $class->day_of_week,
                                    'start_time' => $class->start_time,
                                    'end_time' => $class->end_time,
                                    'semester' => $class->semester,
                                    'room' => $class->room ?? null,
                                ];
                            });

        // Generate notifications
        $notifications = [];
        
        if ($facultyLoad->is_overloaded) {
            $notifications[] = [
                'type' => 'error',
                'title' => 'Overloaded',
                'message' => "You have exceeded the maximum load limit of {$facultyLoad->max_loads} classes. Contact the registrar to adjust your assignments."
            ];
        } elseif ($facultyLoad->utilization_percentage >= 80) {
            $notifications[] = [
                'type' => 'warning',
                'title' => 'Near Load Limit',
                'message' => "You are approaching your maximum load limit. {$facultyLoad->remaining_loads} slots remaining."
            ];
        }

        if ($classes->count() === 0) {
            $notifications[] = [
                'type' => 'info',
                'title' => 'No Classes Assigned',
                'message' => 'You don\'t have any classes assigned yet. Contact the registrar for class assignments.'
            ];
        }

        // Academic calendar info
        $academicCalendar = [
            'semester' => $activeSchoolYear->semester,
            'year_start' => $activeSchoolYear->year_start,
            'year_end' => $activeSchoolYear->year_end,
            'current_quarter' => $activeSchoolYear->getCurrentQuarter(),
            'is_enrollment_open' => $activeSchoolYear->isEnrollmentOpen(),
            'is_grading_open' => $activeSchoolYear->isGradingOpen(),
        ];

        return Inertia::render('Faculty/Faculty_LoadDashboard', [
            'facultyLoad' => [
                'total_loads' => $facultyLoad->total_loads,
                'max_loads' => $facultyLoad->max_loads,
                'remaining_loads' => $facultyLoad->remaining_loads,
                'is_overloaded' => $facultyLoad->is_overloaded,
                'utilization_percentage' => $facultyLoad->utilization_percentage,
            ],
            'classes' => $classes,
            'notifications' => $notifications,
            'academicCalendar' => $academicCalendar,
        ]);
    }

    /**
     * Display semester and grading management dashboard.
     */
    public function semesterDashboard()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_SemesterDashboard', [
                'error' => 'No active school year found. Contact the registrar.'
            ]);
        }

        // Get faculty classes with student counts and grade status, grouped by subject+section
        $classSchedules = ClassSchedule::where('faculty_id', $user->id)
                            ->where('school_year_id', $activeSchoolYear->id)
                            ->where('is_active', true)
                            ->with(['subject', 'section.strand'])
                            ->get();

        // Group classes by subject+section combination
        $groupedClasses = $classSchedules->groupBy(function ($class) {
            return $class->subject_id . '_' . $class->section_id;
        });

        $classes = $groupedClasses->map(function ($classGroup) use ($activeSchoolYear) {
            $firstClass = $classGroup->first();
            
            // Get enrolled students count for this section
            $studentsCount = 0;
            
            // First try: class_details table (use any class ID from the group)
            $studentsCount = DB::table('class_details')
                ->whereIn('class_id', $classGroup->pluck('id'))
                ->where('is_enrolled', true)
                ->distinct('student_id')
                ->count();
            
            // If no students found, try alternative approaches
            if ($studentsCount == 0) {
                // Try: certificates_of_registration table
                $studentsCount = DB::table('certificates_of_registration as cor')
                    ->join('users', 'cor.student_id', '=', 'users.id')
                    ->where('cor.section_id', $firstClass->section_id)
                    ->where('cor.school_year_id', $firstClass->school_year_id)
                    ->where('cor.status', 'active')
                    ->where('users.role', 'student')
                    ->count();
                
                // If still no students, try enrollments table
                if ($studentsCount == 0) {
                    $studentsCount = DB::table('enrollments')
                        ->join('users', 'enrollments.student_id', '=', 'users.id')
                        ->where('enrollments.assigned_section_id', $firstClass->section_id)
                        ->where('enrollments.school_year_id', $firstClass->school_year_id)
                        ->where('enrollments.status', 'enrolled')
                        ->where('users.role', 'student')
                        ->count();
                }
            }

            // Get grade submission status for current quarter (use first class ID)
            $currentQuarter = $activeSchoolYear->current_quarter ?: '1st';
            $gradeStatus = $this->getGradeStatusForClass($firstClass->id, $currentQuarter, $activeSchoolYear->id);

            // Combine all schedules for this subject+section
            $schedules = $classGroup->map(function ($class) {
                $startTime = $class->start_time ? date('g:i A', strtotime($class->start_time)) : '';
                $endTime = $class->end_time ? date('g:i A', strtotime($class->end_time)) : '';
                $timeSlot = $startTime && $endTime ? "$startTime - $endTime" : 'TBA';
                
                return [
                    'day' => $class->day_of_week,
                    'time' => $timeSlot,
                    'room' => $class->room ?? 'TBA'
                ];
            })->values();

            // Format schedule display
            $scheduleDisplay = $schedules->map(function ($schedule) {
                return $schedule['day'] . ' ' . $schedule['time'];
            })->join(', ');

            return [
                'id' => $firstClass->id, // Use first class ID for actions
                'class_ids' => $classGroup->pluck('id')->toArray(), // All class IDs
                'subject_name' => $firstClass->subject->name,
                'subject_code' => $firstClass->subject->code,
                'section_name' => $firstClass->section->section_name,
                'strand_name' => $firstClass->section->strand->name ?? null,
                'semester' => $firstClass->semester,
                'students_count' => $studentsCount,
                'grade_status' => $gradeStatus,
                'schedules' => $schedules,
                'schedule_display' => $scheduleDisplay,
                'schedule' => [
                    'day' => $schedules->pluck('day')->join(', '),
                    'time' => $scheduleDisplay,
                    'room' => $schedules->pluck('room')->unique()->join(', ')
                ]
            ];
        })->values();

        // Notifications removed
        $notifications = [];

        // Academic calendar info
        $academicCalendar = [
            'semester' => $activeSchoolYear->semester,
            'year_start' => $activeSchoolYear->year_start,
            'year_end' => $activeSchoolYear->year_end,
            'current_quarter' => $activeSchoolYear->current_quarter,
            'is_quarter_open' => $activeSchoolYear->is_quarter_open,
            'quarter_start_date' => $activeSchoolYear->quarter_start_date,
            'quarter_end_date' => $activeSchoolYear->quarter_end_date,
            'grade_submission_deadline' => $activeSchoolYear->grade_submission_deadline,
            'allow_grade_encoding' => $activeSchoolYear->allow_grade_encoding,
            'days_until_deadline' => $activeSchoolYear->grade_submission_deadline ? 
                Carbon::parse($activeSchoolYear->grade_submission_deadline)->diffInDays(now(), false) : null
        ];

        return Inertia::render('Faculty/Faculty_SemesterDashboard', [
            'classes' => $classes,
            'notifications' => $notifications,
            'academicCalendar' => $academicCalendar,
            'quarterInfo' => [
                'current' => $activeSchoolYear->current_quarter,
                'is_open' => $activeSchoolYear->is_quarter_open,
                'deadline' => $activeSchoolYear->grade_submission_deadline
            ]
        ]);
    }

    /**
     * Display grade encoding page for a specific class.
     */
    public function gradeEncoding(Request $request, $classId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return redirect()->back()->with('error', 'No active school year found.');
        }

        // Verify faculty owns this class
        $class = ClassSchedule::where('id', $classId)
                            ->where('faculty_id', $user->id)
                            ->where('school_year_id', $activeSchoolYear->id)
                            ->with(['subject', 'section.strand'])
                            ->first();

        if (!$class) {
            return redirect()->back()->with('error', 'Class not found or access denied.');
        }

        // Check if grade encoding is allowed
        if (!$activeSchoolYear->allow_grade_encoding) {
            return redirect()->back()->with('error', 'Grade encoding is currently disabled.');
        }

        // Get quarter from request or use current quarter
        $quarter = $request->get('quarter', $activeSchoolYear->current_quarter);
        
        if (!in_array($quarter, ['1st', '2nd', '3rd', '4th'])) {
            return redirect()->back()->with('error', 'Invalid quarter specified.');
        }

        // Ensure class_details is populated for this class
        $this->populateClassDetails($classId, $class->section_id, $activeSchoolYear->id);

        // Get enrolled students with their current grades
        $students = $this->getStudentsWithGrades($classId, $quarter, $activeSchoolYear->id);

        // Check if grades are locked (already submitted)
        $gradesLocked = $this->areGradesLocked($classId, $quarter, $activeSchoolYear->id);

        return Inertia::render('Faculty/Faculty_GradeEncoding', [
            'class' => [
                'id' => $class->id,
                'subject_name' => $class->subject->name,
                'subject_code' => $class->subject->code,
                'section_name' => $class->section->section_name,
                'strand_name' => $class->section->strand->name ?? null,
                'semester' => $class->semester
            ],
            'students' => $students,
            'quarter' => $quarter,
            'gradesLocked' => $gradesLocked,
            'academicCalendar' => [
                'current_quarter' => $activeSchoolYear->current_quarter,
                'grade_submission_deadline' => $activeSchoolYear->grade_submission_deadline,
                'allow_grade_encoding' => $activeSchoolYear->allow_grade_encoding
            ],
            'availableQuarters' => ['1st', '2nd', '3rd', '4th']
        ]);
    }

    /**
     * Save or update grades for students.
     */
    public function saveGrades(Request $request)
    {
        try {
            Log::info('Grade save method called', [
                'user_id' => Auth::id(),
                'request_data' => $request->all()
            ]);

            $user = Auth::user();
            
            if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
                Log::error('Access denied for grade save', ['user_id' => Auth::id(), 'role' => $user->role ?? 'none']);
                return response()->json(['error' => 'Access denied'], 403);
            }

            $validator = Validator::make($request->all(), [
                'class_id' => 'required|integer|exists:class,id',
                'quarter' => 'required|in:1st,2nd,3rd,4th',
                'grades' => 'required|array',
                'grades.*.student_id' => 'required|integer|exists:users,id',
                'grades.*.grade' => 'required|numeric|min:0|max:100',
                'grades.*.remarks' => 'nullable|string|max:1000',
                'is_draft' => 'boolean'
            ]);

            Log::info('Grade save validation', [
                'request_data' => $request->all(),
                'validation_errors' => $validator->errors()->toArray()
            ]);

            if ($validator->fails()) {
                Log::error('Grade save validation failed', [
                    'errors' => $validator->errors()->toArray(),
                    'request_data' => $request->all()
                ]);
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                    'message' => 'Validation failed'
                ], 422);
            }

            $classId = $request->class_id;
            $quarter = $request->quarter;
            $grades = $request->grades;
            $isDraft = $request->boolean('is_draft', false);

            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 400);
            }

            // Verify faculty owns this class
            $class = ClassSchedule::where('id', $classId)
                                ->where('faculty_id', $user->id)
                                ->where('school_year_id', $activeSchoolYear->id)
                                ->first();

            if (!$class) {
                return response()->json(['error' => 'Class not found or access denied'], 403);
            }

            // Check if grades are already locked
            if (!$isDraft && $this->areGradesLocked($classId, $quarter, $activeSchoolYear->id)) {
                return response()->json(['error' => 'Grades are already submitted and locked for this quarter'], 403);
            }

            DB::beginTransaction();
            
            Log::info('Starting grade save process', [
                'class_id' => $classId,
                'quarter' => $quarter,
                'grades_count' => count($grades),
                'is_draft' => $isDraft,
                'user_id' => $user->id
            ]);

            foreach ($grades as $index => $gradeData) {
                Log::info("Processing grade {$index}", [
                    'student_id' => $gradeData['student_id'],
                    'grade' => $gradeData['grade'],
                    'remarks' => $gradeData['remarks'] ?? null
                ]);

                $this->saveStudentGrade(
                    $gradeData['student_id'],
                    $class->subject_id,
                    $classId,
                    $quarter,
                    $gradeData['grade'],
                    $gradeData['remarks'] ?? null,
                    $activeSchoolYear->id,
                    $user->id,
                    $isDraft
                );
            }

            // If not draft, mark grades as submitted
            if (!$isDraft) {
                $this->markGradesAsSubmitted($classId, $quarter, $activeSchoolYear->id);
                
                // Send notification to registrar
                $this->notifyGradeSubmission($user->id, $class, $quarter, count($grades));
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $isDraft ? 'Grades saved as draft' : 'Grades submitted successfully',
                'is_draft' => $isDraft
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error saving grades: ' . $e->getMessage(), [
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'class_id' => $classId ?? 'unknown',
                'quarter' => $quarter ?? 'unknown',
                'grades_count' => isset($grades) ? count($grades) : 0,
                'user_id' => $user->id
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to save grades. Please try again.',
                'message' => 'Failed to save grades. Please try again.',
                'debug' => config('app.debug') ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ] : null
            ], 500);
        }
    }

    /**
     * Get grade status overview for faculty.
     */
    public function gradeStatusOverview()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year found'], 400);
        }

        $classes = ClassSchedule::where('faculty_id', $user->id)
                                ->where('school_year_id', $activeSchoolYear->id)
                                ->where('is_active', true)
                                ->with(['subject', 'section'])
                                ->get();

        $overview = [];
        foreach ($classes as $class) {
            $classOverview = [
                'class_id' => $class->id,
                'subject_name' => $class->subject->name,
                'section_name' => $class->section->section_name,
                'quarters' => []
            ];

            foreach (['1st', '2nd', '3rd', '4th'] as $quarter) {
                $status = $this->getGradeStatusForClass($class->id, $quarter, $activeSchoolYear->id);
                $classOverview['quarters'][$quarter] = $status;
            }

            $overview[] = $classOverview;
        }

        return response()->json([
            'overview' => $overview,
            'current_quarter' => $activeSchoolYear->current_quarter,
            'deadline' => $activeSchoolYear->grade_submission_deadline
        ]);
    }

    /**
     * Get faculty notifications (removed - notifications system disabled).
     */
    public function getNotifications()
    {
        return response()->json(['notifications' => []]);
    }

    /**
     * Mark notification as read (removed - notifications system disabled).
     */
    public function markNotificationRead(Request $request, $notificationId)
    {
        return response()->json(['success' => true]);
    }

    // Private helper methods

    private function getGradeStatusForClass($classId, $quarter, $schoolYearId)
    {
        $totalStudents = DB::table('class_details')
            ->where('class_id', $classId)
            ->where('is_enrolled', true)
            ->count();

        if ($totalStudents === 0) {
            return [
                'status' => 'no_students',
                'submitted_count' => 0,
                'total_students' => 0,
                'percentage' => 0,
                'is_locked' => false
            ];
        }

        $submittedCount = Grade::where('class_id', $classId)
                              ->where('semester', $this->getQuarterSemester($quarter))
                              ->where('school_year_id', $schoolYearId)
                              ->whereNotNull($this->getQuarterColumn($quarter))
                              ->where('status', '!=', 'draft')
                              ->count();

        $isLocked = $this->areGradesLocked($classId, $quarter, $schoolYearId);
        
        $status = 'not_started';
        if ($submittedCount > 0) {
            $status = $submittedCount >= $totalStudents ? 'completed' : 'in_progress';
        }
        if ($isLocked) {
            $status = 'submitted';
        }

        return [
            'status' => $status,
            'submitted_count' => $submittedCount,
            'total_students' => $totalStudents,
            'percentage' => $totalStudents > 0 ? round(($submittedCount / $totalStudents) * 100) : 0,
            'is_locked' => $isLocked
        ];
    }

    private function getStudentsWithGrades($classId, $quarter, $schoolYearId)
    {
        // First try: Get students from class_details table
        $students = DB::table('class_details')
            ->join('users', 'class_details.student_id', '=', 'users.id')
            ->leftJoin('grades', function($join) use ($classId, $quarter, $schoolYearId) {
                $join->on('grades.student_id', '=', 'users.id')
                     ->where('grades.class_id', $classId)
                     ->where('grades.semester', $this->getQuarterSemester($quarter))
                     ->where('grades.school_year_id', $schoolYearId);
            })
            ->where('class_details.class_id', $classId)
            ->where('class_details.is_enrolled', true)
            ->where('users.role', 'student')
            ->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'grades.id as grade_id',
                'grades.' . $this->getQuarterColumn($quarter) . ' as current_grade',
                'grades.remarks',
                'grades.status as grade_status'
            ])
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();

        // If no students found in class_details, try alternative approaches
        if ($students->count() == 0) {
            // Get class info to find section_id
            $classInfo = DB::table('class')->where('id', $classId)->first();
            
            if ($classInfo) {
                // Try certificates_of_registration table
                $students = DB::table('certificates_of_registration as cor')
                    ->join('users', 'cor.student_id', '=', 'users.id')
                    ->leftJoin('grades', function($join) use ($classId, $quarter, $schoolYearId) {
                        $join->on('grades.student_id', '=', 'users.id')
                             ->where('grades.class_id', $classId)
                             ->where('grades.semester', $this->getQuarterSemester($quarter))
                             ->where('grades.school_year_id', $schoolYearId);
                    })
                    ->where('cor.section_id', $classInfo->section_id)
                    ->where('cor.school_year_id', $schoolYearId)
                    ->where('cor.status', 'active')
                    ->where('users.role', 'student')
                    ->select([
                        'users.id',
                        'users.firstname',
                        'users.lastname',
                        'users.email',
                        'grades.id as grade_id',
                        'grades.' . $this->getQuarterColumn($quarter) . ' as current_grade',
                        'grades.remarks',
                        'grades.status as grade_status'
                    ])
                    ->orderBy('users.lastname')
                    ->orderBy('users.firstname')
                    ->get();

                // If still no students, try enrollments table
                if ($students->count() == 0) {
                    $students = DB::table('enrollments')
                        ->join('users', 'enrollments.student_id', '=', 'users.id')
                        ->leftJoin('grades', function($join) use ($classId, $quarter, $schoolYearId) {
                            $join->on('grades.student_id', '=', 'users.id')
                                 ->where('grades.class_id', $classId)
                                 ->where('grades.semester', $this->getQuarterSemester($quarter))
                                 ->where('grades.school_year_id', $schoolYearId);
                        })
                        ->where('enrollments.assigned_section_id', $classInfo->section_id)
                        ->where('enrollments.school_year_id', $schoolYearId)
                        ->where('enrollments.status', 'enrolled')
                        ->where('users.role', 'student')
                        ->select([
                            'users.id',
                            'users.firstname',
                            'users.lastname',
                            'users.email',
                            'grades.id as grade_id',
                            'grades.' . $this->getQuarterColumn($quarter) . ' as current_grade',
                            'grades.remarks',
                            'grades.status as grade_status'
                        ])
                        ->orderBy('users.lastname')
                        ->orderBy('users.firstname')
                        ->get();
                }
            }
        }

        return $students->map(function($student) {
            return [
                'id' => $student->id,
                'name' => $student->firstname . ' ' . $student->lastname,
                'email' => $student->email,
                'grade_id' => $student->grade_id,
                'current_grade' => $student->current_grade,
                'remarks' => $student->remarks,
                'grade_status' => $student->grade_status ?? 'not_started'
            ];
        });
    }

    private function areGradesLocked($classId, $quarter, $schoolYearId)
    {
        return Grade::where('class_id', $classId)
                   ->where('semester', $this->getQuarterSemester($quarter))
                   ->where('school_year_id', $schoolYearId)
                   ->whereIn('status', ['pending_registrar_approval', 'approved'])
                   ->exists();
    }

    private function saveStudentGrade($studentId, $subjectId, $classId, $quarter, $grade, $remarks, $schoolYearId, $facultyId, $isDraft)
    {
        try {
            $semester = $this->getQuarterSemester($quarter);
            $quarterColumn = $this->getQuarterColumn($quarter);

            // Auto-generate remarks based on grade if no custom remarks provided
            $autoRemarks = $this->generateRemarksFromGrade($grade);
            $finalRemarks = !empty($remarks) ? $remarks : $autoRemarks;

            $gradeData = [
                'student_id' => $studentId,
                'subject_id' => $subjectId,
                'class_id' => $classId,
                'semester' => $semester,
                'school_year_id' => $schoolYearId,
                'faculty_id' => $facultyId,
                $quarterColumn => $grade,
                'remarks' => $finalRemarks,
                'status' => $isDraft ? 'draft' : 'pending_registrar_approval',
                'updated_at' => now()
            ];

            // Log the data being saved for debugging
            Log::info('Saving grade data', [
                'student_id' => $studentId,
                'quarter' => $quarter,
                'semester' => $semester,
                'quarter_column' => $quarterColumn,
                'grade' => $grade,
                'grade_data' => $gradeData
            ]);

            $result = Grade::updateOrCreate([
                'student_id' => $studentId,
                'subject_id' => $subjectId,
                'semester' => $semester,
                'school_year_id' => $schoolYearId
            ], $gradeData);

            // Automatically calculate and update semester grade if both quarters are complete
            $calculatedSemesterGrade = $result->calculateSemesterGrade();
            if ($calculatedSemesterGrade !== null && $result->semester_grade !== $calculatedSemesterGrade) {
                $result->semester_grade = $calculatedSemesterGrade;
                $result->save();
                
                Log::info('Semester grade auto-calculated', [
                    'grade_id' => $result->id,
                    'semester_grade' => $calculatedSemesterGrade,
                    'first_quarter' => $result->first_quarter,
                    'second_quarter' => $result->second_quarter
                ]);
            }

            Log::info('Grade saved successfully', [
                'grade_id' => $result->id,
                'student_id' => $studentId,
                'quarter' => $quarter,
                'grade' => $grade,
                'semester_status' => $result->getSemesterStatus(),
                'both_quarters_complete' => $result->areBothQuartersComplete()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in saveStudentGrade', [
                'error' => $e->getMessage(),
                'student_id' => $studentId,
                'quarter' => $quarter,
                'grade' => $grade
            ]);
            throw $e;
        }
    }

    /**
     * Generate automatic remarks based on grade value
     */
    private function generateRemarksFromGrade($grade)
    {
        if (is_null($grade) || $grade === '') {
            return 'No grade entered';
        }

        $numericGrade = floatval($grade);

        // Philippine SHS Grading Scale with Remarks
        if ($numericGrade >= 90) {
            return 'Outstanding - Excellent performance demonstrated';
        } elseif ($numericGrade >= 85) {
            return 'Very Satisfactory - Very good performance';
        } elseif ($numericGrade >= 80) {
            return 'Satisfactory - Good performance';
        } elseif ($numericGrade >= 75) {
            return 'Fairly Satisfactory - Meets minimum requirements';
        } elseif ($numericGrade >= 60) {
            return 'Did Not Meet Expectations - Below standard performance';
        } else {
            return 'Failed - Needs significant improvement';
        }
    }

    private function markGradesAsSubmitted($classId, $quarter, $schoolYearId)
    {
        Grade::where('class_id', $classId)
             ->where('semester', $this->getQuarterSemester($quarter))
             ->where('school_year_id', $schoolYearId)
             ->update([
                 'status' => 'pending_registrar_approval',
                 'submitted_for_approval_at' => now()
             ]);
    }

    private function getQuarterSemester($quarter)
    {
        return in_array($quarter, ['1st', '2nd']) ? '1st' : '2nd';
    }

    private function getQuarterColumn($quarter)
    {
        // Philippine SHS System:
        // 1st Semester: Q1 (first_quarter) + Q2 (second_quarter)
        // 2nd Semester: Q3 (third_quarter) + Q4 (fourth_quarter)
        $columns = [
            '1st' => 'first_quarter',   // Q1 of 1st semester
            '2nd' => 'second_quarter',  // Q2 of 1st semester
            '3rd' => 'third_quarter',   // Q3 of 2nd semester
            '4th' => 'fourth_quarter'   // Q4 of 2nd semester
        ];
        
        // Handle empty or invalid quarter values
        if (empty($quarter) || !isset($columns[$quarter])) {
            return 'first_quarter'; // Default to first quarter
        }
        
        return $columns[$quarter];
    }

    /**
     * Faculty Reports Page
     */
    public function reportsPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Reports', [
                'error' => 'No active school year found. Contact the registrar.',
                'reports' => [],
                'filterOptions' => []
            ]);
        }

        // Get faculty's classes for filtering
        $classes = ClassSchedule::where('faculty_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('is_active', true)
            ->with(['subject', 'section.strand'])
            ->get();

        $filterOptions = [
            'subjects' => $classes->map(function($class) {
                return [
                    'id' => $class->subject->id,
                    'name' => $class->subject->name,
                    'code' => $class->subject->code
                ];
            })->unique('id')->values(),
            'sections' => $classes->map(function($class) {
                return [
                    'id' => $class->section->id,
                    'name' => $class->section->section_name,
                    'strand' => $class->section->strand->name ?? null
                ];
            })->unique('id')->values(),
            'semesters' => ['1st', '2nd'],
            'quarters' => ['1st', '2nd', '3rd', '4th']
        ];

        return Inertia::render('Faculty/Faculty_Reports', [
            'filterOptions' => $filterOptions,
            'activeSchoolYear' => $activeSchoolYear,
            'totalClasses' => $classes->count(),
            'totalSubjects' => $classes->unique('subject_id')->count(),
            'totalSections' => $classes->unique('section_id')->count()
        ]);
    }

    /**
     * Generate Faculty Student List Report
     */
    public function generateStudentListReport(Request $request)
    {
        try {
            $user = Auth::user();
            
            $request->validate([
                'section_id' => 'nullable|exists:sections,id',
                'subject_id' => 'nullable|exists:subjects,id',
                'format' => 'required|in:excel,pdf,json'
            ]);

            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            // Base query for faculty's classes
            $classQuery = ClassSchedule::where('faculty_id', $user->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('is_active', true);

            if ($request->section_id) {
                $classQuery->where('section_id', $request->section_id);
            }

            if ($request->subject_id) {
                $classQuery->where('subject_id', $request->subject_id);
            }

            $classes = $classQuery->get();

            // Get students from class_details or certificates_of_registration
            $students = collect();
            
            foreach ($classes as $class) {
                $classStudents = DB::table('class_details')
                    ->join('users', 'class_details.student_id', '=', 'users.id')
                    ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                    ->where('class_details.class_id', $class->id)
                    ->where('class_details.is_enrolled', true)
                    ->where('users.role', 'student')
                    ->select([
                        'users.id',
                        'users.firstname',
                        'users.lastname',
                        'users.email',
                        'student_personal_info.lrn',
                        'student_personal_info.contact_number',
                        DB::raw("'{$class->subject->name}' as subject_name"),
                        DB::raw("'{$class->subject->code}' as subject_code"),
                        DB::raw("'{$class->section->section_name}' as section_name"),
                        'class_details.enrolled_at'
                    ])
                    ->get();

                $students = $students->merge($classStudents);
            }

            $students = $students->unique('id')->sortBy('lastname');

            if ($request->format === 'json') {
                return response()->json([
                    'success' => true,
                    'data' => $students->values(),
                    'total' => $students->count(),
                    'summary' => [
                        'total_students' => $students->count(),
                        'total_classes' => $classes->count(),
                        'subjects' => $classes->unique('subject_id')->count(),
                        'sections' => $classes->unique('section_id')->count()
                    ]
                ]);
            }

            return $this->exportFacultyStudentList($students, $request->format);

        } catch (\Exception $e) {
            Log::error('Error generating faculty student list report', [
                'error' => $e->getMessage(),
                'faculty_id' => $user->id ?? null
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate student list report. Please try again.'
            ], 500);
        }
    }

    /**
     * Generate Faculty Grades Report
     */
    public function generateGradesReport(Request $request)
    {
        try {
            $user = Auth::user();
            
            $request->validate([
                'subject_id' => 'nullable|exists:subjects,id',
                'section_id' => 'nullable|exists:sections,id',
                'semester' => 'nullable|in:1st,2nd',
                'quarter' => 'nullable|in:1st,2nd,3rd,4th',
                'format' => 'required|in:excel,pdf,json'
            ]);

            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            $query = Grade::with(['student.studentPersonalInfo', 'subject'])
                ->where('faculty_id', $user->id)
                ->where('school_year_id', $activeSchoolYear->id);

            if ($request->subject_id) {
                $query->where('subject_id', $request->subject_id);
            }

            if ($request->semester) {
                $query->where('semester', $request->semester);
            }

            // Filter by section through class relationship
            if ($request->section_id) {
                $query->whereHas('class', function($q) use ($request) {
                    $q->where('section_id', $request->section_id);
                });
            }

            $grades = $query->orderBy('created_at', 'desc')->get()->map(function($grade) use ($request) {
                $data = [
                    'id' => $grade->id,
                    'student_name' => $grade->student->firstname . ' ' . $grade->student->lastname,
                    'student_lrn' => $grade->student->studentPersonalInfo->lrn ?? 'N/A',
                    'subject_name' => $grade->subject->name,
                    'subject_code' => $grade->subject->code,
                    'semester' => $grade->semester,
                    'first_quarter' => $grade->first_quarter,
                    'second_quarter' => $grade->second_quarter,
                    'semester_grade' => $grade->semester_grade,
                    'remarks' => $grade->remarks,
                    'status' => $grade->status,
                    'updated_at' => $grade->updated_at
                ];

                // Add specific quarter grade if requested
                if ($request->quarter) {
                    $quarterColumn = $this->getQuarterColumn($request->quarter);
                    $data['quarter_grade'] = $grade->$quarterColumn;
                    $data['quarter'] = $request->quarter;
                }

                return $data;
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
                        'average_grade' => $grades->where('semester_grade', '!=', null)->avg('semester_grade'),
                        'passing_rate' => $grades->where('semester_grade', '>=', 75)->count() / max($grades->count(), 1) * 100
                    ]
                ]);
            }

            return $this->exportFacultyGradesList($grades, $request->format);

        } catch (\Exception $e) {
            Log::error('Error generating faculty grades report', [
                'error' => $e->getMessage(),
                'faculty_id' => $user->id ?? null
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate grades report. Please try again.'
            ], 500);
        }
    }

    /**
     * Export faculty student list
     */
    private function exportFacultyStudentList($students, $format)
    {
        $filename = 'faculty_student_list_' . date('Y-m-d_H-i-s');
        
        if ($format === 'excel') {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
            ];

            $callback = function() use ($students) {
                $file = fopen('php://output', 'w');
                fputcsv($file, ['Name', 'LRN', 'Email', 'Subject', 'Section', 'Contact', 'Enrolled Date']);
                
                foreach ($students as $student) {
                    fputcsv($file, [
                        $student->firstname . ' ' . $student->lastname,
                        $student->lrn,
                        $student->email,
                        $student->subject_name . ' (' . $student->subject_code . ')',
                        $student->section_name,
                        $student->contact_number,
                        $student->enrolled_at ? date('Y-m-d', strtotime($student->enrolled_at)) : 'N/A'
                    ]);
                }
                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        }

        return response()->json([
            'success' => true,
            'message' => 'Export format not yet implemented',
            'format' => $format
        ]);
    }

    /**
     * Export faculty grades list
     */
    private function exportFacultyGradesList($grades, $format)
    {
        $filename = 'faculty_grades_report_' . date('Y-m-d_H-i-s');
        
        if ($format === 'excel') {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
            ];

            $callback = function() use ($grades) {
                $file = fopen('php://output', 'w');
                fputcsv($file, ['Student Name', 'LRN', 'Subject', 'Semester', 'Q1', 'Q2', 'Semester Grade', 'Remarks', 'Status']);
                
                foreach ($grades as $grade) {
                    fputcsv($file, [
                        $grade['student_name'],
                        $grade['student_lrn'],
                        $grade['subject_name'] . ' (' . $grade['subject_code'] . ')',
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

        return response()->json([
            'success' => true,
            'message' => 'Export format not yet implemented',
            'format' => $format
        ]);
    }

    private function notifyGradeSubmission($facultyId, $class, $quarter, $gradeCount)
    {
        // Notifications system removed - no action needed
    }

    /**
     * Display faculty schedule page.
     */
    public function schedulePage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Schedule', [
                'error' => 'No active school year found. Contact the registrar.',
                'schedule' => [],
                'academicCalendar' => []
            ]);
        }

        // Get faculty schedule
        $schedule = ClassSchedule::where('faculty_id', $user->id)
                                ->where('school_year_id', $activeSchoolYear->id)
                                ->where('is_active', true)
                                ->with(['subject', 'section.strand'])
                                ->orderBy('day_of_week')
                                ->orderBy('start_time')
                                ->get()
                                ->map(function ($class) {
                                    return [
                                        'id' => $class->id,
                                        'subject_name' => $class->subject->name,
                                        'subject_code' => $class->subject->code,
                                        'section_name' => $class->section->section_name,
                                        'strand_name' => $class->section->strand->name ?? null,
                                        'day_of_week' => $class->day_of_week,
                                        'start_time' => $class->start_time,
                                        'end_time' => $class->end_time,
                                        'room' => $class->room ?? 'TBA',
                                        'semester' => $class->semester
                                    ];
                                });

        // Academic calendar info
        $academicCalendar = [
            'semester' => $activeSchoolYear->semester,
            'year_start' => $activeSchoolYear->year_start,
            'year_end' => $activeSchoolYear->year_end,
            'current_quarter' => $activeSchoolYear->current_quarter,
        ];

        return Inertia::render('Faculty/Faculty_Schedule', [
            'schedule' => $schedule,
            'academicCalendar' => $academicCalendar
        ]);
    }

    /**
     * Display faculty classes page.
     */
    public function classesPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Classes', [
                'error' => 'No active school year found. Contact the registrar.',
                'classes' => [],
                'academicCalendar' => []
            ]);
        }

        // Get faculty classes with student counts and group by subject+section
        $classSchedules = ClassSchedule::where('faculty_id', $user->id)
                                ->where('school_year_id', $activeSchoolYear->id)
                                ->where('is_active', true)
                                ->with(['subject', 'section.strand'])
                                ->get();

        // Group classes by subject+section combination
        $groupedClasses = $classSchedules->groupBy(function ($class) {
            return $class->subject_id . '_' . $class->section_id;
        });

        $classes = $groupedClasses->map(function ($classGroup) {
            $firstClass = $classGroup->first();
            
            // Get enrolled students count for this section
            $studentsCount = 0;
            
            // First try: class_details table (use any class ID from the group)
            $studentsCount = DB::table('class_details')
                ->whereIn('class_id', $classGroup->pluck('id'))
                ->where('is_enrolled', true)
                ->distinct('student_id')
                ->count();
            
            // If no students found, try alternative approaches
            if ($studentsCount == 0) {
                // Try: certificates_of_registration table
                $studentsCount = DB::table('certificates_of_registration as cor')
                    ->join('users', 'cor.student_id', '=', 'users.id')
                    ->where('cor.section_id', $firstClass->section_id)
                    ->where('cor.school_year_id', $firstClass->school_year_id)
                    ->where('cor.status', 'active')
                    ->where('users.role', 'student')
                    ->count();
                
                // If still no students, try enrollments table
                if ($studentsCount == 0) {
                    $studentsCount = DB::table('enrollments')
                        ->join('users', 'enrollments.student_id', '=', 'users.id')
                        ->where('enrollments.assigned_section_id', $firstClass->section_id)
                        ->where('enrollments.school_year_id', $firstClass->school_year_id)
                        ->where('enrollments.status', 'enrolled')
                        ->where('users.role', 'student')
                        ->count();
                }
            }

            // Combine all schedules for this subject+section
            $schedules = $classGroup->map(function ($class) {
                $startTime = $class->start_time ? date('g:i A', strtotime($class->start_time)) : '';
                $endTime = $class->end_time ? date('g:i A', strtotime($class->end_time)) : '';
                $timeSlot = $startTime && $endTime ? "$startTime - $endTime" : 'TBA';
                
                return [
                    'day' => $class->day_of_week,
                    'time' => $timeSlot,
                    'room' => $class->room ?? 'TBA'
                ];
            })->values();

            // Format schedule display
            $scheduleDisplay = $schedules->map(function ($schedule) {
                return $schedule['day'] . ' ' . $schedule['time'];
            })->join(', ');

            return [
                'id' => $firstClass->id, // Use first class ID for actions
                'class_ids' => $classGroup->pluck('id')->toArray(), // All class IDs
                'subject_name' => $firstClass->subject->name,
                'subject_code' => $firstClass->subject->code,
                'section_name' => $firstClass->section->section_name,
                'strand_name' => $firstClass->section->strand->name ?? null,
                'semester' => $firstClass->semester,
                'students_count' => $studentsCount,
                'schedules' => $schedules,
                'schedule_display' => $scheduleDisplay,
                // Keep legacy fields for compatibility
                'day_of_week' => $schedules->pluck('day')->join(', '),
                'start_time' => $firstClass->start_time,
                'end_time' => $firstClass->end_time,
                'room' => $schedules->pluck('room')->unique()->join(', ')
            ];
        })->values();

        // Academic calendar info
        $academicCalendar = [
            'semester' => $activeSchoolYear->semester,
            'year_start' => $activeSchoolYear->year_start,
            'year_end' => $activeSchoolYear->year_end,
            'current_quarter' => $activeSchoolYear->current_quarter,
        ];

        return Inertia::render('Faculty/Faculty_Classes', [
            'classes' => $classes,
            'academicCalendar' => $academicCalendar
        ]);
    }

    /**
     * Display faculty grades page.
     */
    public function gradesPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        // Redirect to semester dashboard for grade management
        return redirect()->route('faculty.semester');
    }

    /**
     * Display faculty students page.
     */
    public function studentsPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        // For now, redirect to classes page
        return redirect()->route('faculty.classes');
    }

    /**
     * Display faculty manual enrollment page.
     */
    public function manualEnrollmentPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        // Check if user has coordinator privileges
        if (!$user->is_coordinator && $user->role !== 'coordinator') {
            return redirect()->route('faculty.dashboard')->with('error', 'Coordinator access required.');
        }

        // Redirect to enrollment management
        return redirect()->route('faculty.enrollment');
    }

    /**
     * Populate class_details table for a specific class if empty
     */
    private function populateClassDetails($classId, $sectionId, $schoolYearId)
    {
        // Check if class_details already has students for this class
        $existingCount = DB::table('class_details')
            ->where('class_id', $classId)
            ->where('is_enrolled', true)
            ->count();

        if ($existingCount == 0) {
            // First try: Get students from certificates_of_registration (COR)
            $enrolledStudents = DB::table('certificates_of_registration as cor')
                ->join('users', 'cor.student_id', '=', 'users.id')
                ->where('cor.section_id', $sectionId)
                ->where('cor.school_year_id', $schoolYearId)
                ->where('cor.status', 'active')
                ->where('users.role', 'student')
                ->select('cor.enrollment_id', 'cor.student_id', 'cor.id as cor_id')
                ->get();

            // If no students in COR, fallback to enrollments table
            if ($enrolledStudents->count() == 0) {
                $enrolledStudents = DB::table('enrollments')
                    ->join('users', 'enrollments.student_id', '=', 'users.id')
                    ->where('enrollments.assigned_section_id', $sectionId)
                    ->where('enrollments.school_year_id', $schoolYearId)
                    ->where('enrollments.status', 'enrolled')
                    ->where('users.role', 'student')
                    ->select('enrollments.id as enrollment_id', 'users.id as student_id', DB::raw('NULL as cor_id'))
                    ->get();
            }

            // Insert into class_details
            foreach ($enrolledStudents as $student) {
                DB::table('class_details')->insertOrIgnore([
                    'class_id' => $classId,
                    'student_id' => $student->student_id,
                    'enrollment_id' => $student->enrollment_id,
                    'section_id' => $sectionId,
                    'is_enrolled' => true,
                    'enrolled_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            return $enrolledStudents->count();
        }

        return $existingCount;
    }

    /**
     * Display students in a specific class.
     */
    public function viewClassStudents($classId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_ClassStudents', [
                'error' => 'No active school year found. Contact the registrar.',
                'students' => [],
                'classInfo' => null,
                'academicCalendar' => []
            ]);
        }

        // Get class information and verify faculty owns this class
        $classInfo = ClassSchedule::where('id', $classId)
                                 ->where('faculty_id', $user->id)
                                 ->where('school_year_id', $activeSchoolYear->id)
                                 ->where('is_active', true)
                                 ->with(['subject', 'section.strand'])
                                 ->first();

        if (!$classInfo) {
            return redirect()->route('faculty.classes')->with('error', 'Class not found or access denied.');
        }

        // Ensure class_details is populated for this class
        $this->populateClassDetails($classId, $classInfo->section_id, $activeSchoolYear->id);

        // Get enrolled students for this class - try multiple approaches
        $students = collect();
        
        // First try: class_details table
        $studentsFromClassDetails = DB::table('class_details')
            ->join('users', 'class_details.student_id', '=', 'users.id')
            ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->where('class_details.class_id', $classId)
            ->where('class_details.is_enrolled', true)
            ->where('users.role', 'student')
            ->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.student_type',
                'student_personal_info.lrn',
                'student_personal_info.student_status',
                'class_details.enrolled_at',
                'class_details.is_enrolled as enrollment_active'
            ])
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();

        if ($studentsFromClassDetails->count() > 0) {
            $students = $studentsFromClassDetails;
        } else {
            // Fallback: First try certificates_of_registration
            $students = DB::table('certificates_of_registration as cor')
                ->join('users', 'cor.student_id', '=', 'users.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->where('cor.section_id', $classInfo->section_id)
                ->where('cor.school_year_id', $activeSchoolYear->id)
                ->where('cor.status', 'active')
                ->where('users.role', 'student')
                ->select([
                    'users.id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'users.student_type',
                    'student_personal_info.lrn',
                    'student_personal_info.student_status',
                    'cor.registration_date as enrolled_at',
                    DB::raw('1 as enrollment_active')
                ])
                ->orderBy('users.lastname')
                ->orderBy('users.firstname')
                ->get();

            // If still no students, try enrollments table
            if ($students->count() == 0) {
                $students = DB::table('enrollments')
                    ->join('users', 'enrollments.student_id', '=', 'users.id')
                    ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                    ->where('enrollments.assigned_section_id', $classInfo->section_id)
                    ->where('enrollments.school_year_id', $activeSchoolYear->id)
                    ->where('enrollments.status', 'enrolled')
                    ->where('users.role', 'student')
                    ->select([
                        'users.id',
                        'users.firstname',
                        'users.lastname',
                        'users.email',
                        'users.student_type',
                        'student_personal_info.lrn',
                        'student_personal_info.student_status',
                        'enrollments.created_at as enrolled_at',
                        DB::raw('1 as enrollment_active')
                    ])
                    ->orderBy('users.lastname')
                    ->orderBy('users.firstname')
                    ->get();
            }
        }

        $students = $students->map(function ($student) {
            return [
                'id' => $student->id,
                'name' => $student->firstname . ' ' . $student->lastname,
                'firstname' => $student->firstname,
                'lastname' => $student->lastname,
                'email' => $student->email,
                'lrn' => $student->lrn,
                'student_type' => $student->student_type,
                'student_status' => $student->student_status,
                'enrolled_at' => $student->enrolled_at,
                'enrollment_active' => $student->enrollment_active
            ];
        });

        // Format class information
        $formattedClassInfo = [
            'id' => $classInfo->id,
            'subject_name' => $classInfo->subject->name,
            'subject_code' => $classInfo->subject->code,
            'section_name' => $classInfo->section->section_name,
            'strand_name' => $classInfo->section->strand->name ?? null,
            'day_of_week' => $classInfo->day_of_week,
            'start_time' => $classInfo->start_time,
            'end_time' => $classInfo->end_time,
            'room' => $classInfo->room ?? 'TBA',
            'semester' => $classInfo->semester,
            'students_count' => $students->count()
        ];

        // Academic calendar info
        $academicCalendar = [
            'semester' => $activeSchoolYear->semester,
            'year_start' => $activeSchoolYear->year_start,
            'year_end' => $activeSchoolYear->year_end,
            'current_quarter' => $activeSchoolYear->current_quarter,
        ];

        return Inertia::render('Faculty/Faculty_ClassStudents', [
            'students' => $students,
            'classInfo' => $formattedClassInfo,
            'academicCalendar' => $academicCalendar
        ]);
    }

    /**
     * Request permission to input grades for a specific class and quarter.
     */
    public function requestGradeInput(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $validator = Validator::make($request->all(), [
            'class_id' => 'required|integer|exists:class,id',
            'quarter' => 'required|in:1st,2nd,3rd,4th',
            'reason' => 'required|string|max:1000',
            'is_urgent' => 'boolean',
            'student_ids' => 'array',
            'student_ids.*' => 'integer|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year found'], 400);
        }

        // Verify faculty owns this class
        $class = ClassSchedule::where('id', $request->class_id)
                            ->where('faculty_id', $user->id)
                            ->where('school_year_id', $activeSchoolYear->id)
                            ->with(['subject', 'section'])
                            ->first();

        if (!$class) {
            return response()->json(['error' => 'Class not found or access denied'], 403);
        }

        // Check if there's already a pending or approved request for this class and quarter
        $existingRequest = GradeInputRequest::forClassAndQuarter($request->class_id, $request->quarter)
                                          ->where('faculty_id', $user->id)
                                          ->whereIn('status', ['pending', 'approved'])
                                          ->first();

        if ($existingRequest) {
            return response()->json([
                'error' => 'A request for this class and quarter already exists',
                'existing_status' => $existingRequest->status
            ], 409);
        }

        // Check if quarter has ended
        if (!$activeSchoolYear->isQuarterEnded($request->quarter)) {
            return response()->json([
                'error' => 'Grade input requests can only be submitted after the quarter has ended',
                'quarter_status' => 'ongoing'
            ], 400);
        }

        // Get students without grades for this quarter
        $studentsWithoutGrades = $this->getStudentsWithoutGrades($request->class_id, $request->quarter, $activeSchoolYear->id);

        // Check if there are students without grades
        if ($studentsWithoutGrades->isEmpty()) {
            return response()->json([
                'error' => 'All students already have grades for this quarter. No request needed.',
                'students_without_grades' => 0
            ], 400);
        }

        try {
            $gradeInputRequest = GradeInputRequest::create([
                'faculty_id' => $user->id,
                'class_id' => $request->class_id,
                'school_year_id' => $activeSchoolYear->id,
                'quarter' => $request->quarter,
                'reason' => $request->reason,
                'is_urgent' => $request->boolean('is_urgent', false),
                'student_list' => $request->student_ids ?? $studentsWithoutGrades->pluck('id')->toArray(),
                'status' => 'pending'
            ]);

            Log::info('Grade input request created', [
                'request_id' => $gradeInputRequest->id,
                'faculty_id' => $user->id,
                'class_id' => $request->class_id,
                'quarter' => $request->quarter,
                'students_count' => count($gradeInputRequest->student_list)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Grade input request submitted successfully',
                'request' => [
                    'id' => $gradeInputRequest->id,
                    'status' => $gradeInputRequest->status,
                    'quarter' => $gradeInputRequest->quarter,
                    'class_name' => $class->subject->name . ' - ' . $class->section->section_name,
                    'students_count' => count($gradeInputRequest->student_list)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error creating grade input request', [
                'error' => $e->getMessage(),
                'faculty_id' => $user->id,
                'class_id' => $request->class_id,
                'quarter' => $request->quarter
            ]);

            return response()->json([
                'error' => 'Failed to submit grade input request. Please try again.'
            ], 500);
        }
    }

    /**
     * Get faculty's grade input requests.
     */
    public function getGradeInputRequests(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year found'], 400);
        }

        $requests = GradeInputRequest::forFaculty($user->id)
                                   ->where('school_year_id', $activeSchoolYear->id)
                                   ->with(['class.subject', 'class.section', 'approvedBy'])
                                   ->orderBy('created_at', 'desc')
                                   ->get()
                                   ->map(function ($request) {
                                       return [
                                           'id' => $request->id,
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
                                           'can_input_grades' => $request->isValidForGradeInput()
                                       ];
                                   });

        return response()->json([
            'success' => true,
            'requests' => $requests
        ]);
    }

    /**
     * Check if faculty can input grades for a specific class and quarter.
     */
    public function checkGradeInputPermission($classId, $quarter)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year found'], 400);
        }

        // Check if quarter has ended
        $quarterEnded = $activeSchoolYear->isQuarterEnded($quarter);
        
        // Get students without grades
        $studentsWithoutGrades = $this->getStudentsWithoutGrades($classId, $quarter, $activeSchoolYear->id);
        
        // Check if there's an approved and valid request
        $approvedRequest = GradeInputRequest::forClassAndQuarter($classId, $quarter)
                                          ->where('faculty_id', $user->id)
                                          ->approved()
                                          ->first();

        $canInputGrades = $approvedRequest && $approvedRequest->isValidForGradeInput();
        
        // Check if request is needed and allowed
        $requestNeeded = $quarterEnded && $studentsWithoutGrades->isNotEmpty();
        $canMakeRequest = $requestNeeded && !$approvedRequest;

        return response()->json([
            'success' => true,
            'can_input_grades' => $canInputGrades,
            'can_make_request' => $canMakeRequest,
            'request_needed' => $requestNeeded,
            'quarter_ended' => $quarterEnded,
            'students_without_grades' => $studentsWithoutGrades->count(),
            'request_status' => $approvedRequest ? $approvedRequest->status : 'none',
            'expires_at' => $approvedRequest ? $approvedRequest->expires_at : null,
            'is_expired' => $approvedRequest ? $approvedRequest->isExpired() : false,
            'quarter_status' => $quarterEnded ? 'ended' : 'ongoing'
        ]);
    }

    /**
     * Get students without grades for a specific class and quarter.
     */
    private function getStudentsWithoutGrades($classId, $quarter, $schoolYearId)
    {
        $quarterColumn = $this->getQuarterColumn($quarter);
        $semester = $this->getQuarterSemester($quarter);

        return DB::table('class_details')
            ->join('users', 'class_details.student_id', '=', 'users.id')
            ->leftJoin('grades', function($join) use ($classId, $semester, $schoolYearId) {
                $join->on('grades.student_id', '=', 'users.id')
                     ->where('grades.class_id', $classId)
                     ->where('grades.semester', $semester)
                     ->where('grades.school_year_id', $schoolYearId);
            })
            ->where('class_details.class_id', $classId)
            ->where('class_details.is_enrolled', true)
            ->where('users.role', 'student')
            ->whereNull('grades.' . $quarterColumn)
            ->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email'
            ])
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();
    }

    /**
     * Check if a quarter has ended based on school year settings and current date.
     */
    private function isQuarterEnded($quarter, $schoolYear)
    {
        // Get current date
        $currentDate = now();
        
        // Check if there are specific quarter end dates in school year
        $quarterEndField = strtolower($quarter) . '_quarter_end_date';
        
        if (isset($schoolYear->$quarterEndField) && $schoolYear->$quarterEndField) {
            return $currentDate->isAfter(Carbon::parse($schoolYear->$quarterEndField));
        }
        
        // Fallback: Check if current quarter in school year is past the requested quarter
        $quarterOrder = ['1st' => 1, '2nd' => 2, '3rd' => 3, '4th' => 4];
        $requestedQuarterNumber = $quarterOrder[$quarter] ?? 0;
        $currentQuarterNumber = $quarterOrder[$schoolYear->current_quarter ?? '1st'] ?? 1;
        
        // If current quarter is ahead of requested quarter, then requested quarter has ended
        if ($currentQuarterNumber > $requestedQuarterNumber) {
            return true;
        }
        
        // If it's the same quarter, check if quarter is marked as closed
        if ($currentQuarterNumber === $requestedQuarterNumber) {
            return !($schoolYear->is_quarter_open ?? true);
        }
        
        // If requested quarter is in the future, it hasn't ended
        return false;
    }

    /**
     * Display grade progression page for coordinators
     */
    public function gradeProgressionPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator']) || !$user->is_coordinator) {
            return redirect('/faculty/dashboard')->with('error', 'Access denied. Coordinator privileges required.');
        }

        // Get current school year
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Faculty/Faculty_GradeProgression', [
                'error' => 'No active school year found.',
                'students' => [],
                'schoolYear' => null
            ]);
        }

        // Get Grade 11 students eligible for progression to Grade 12
        $eligibleStudents = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->join('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->join('strands', 'enrollments.strand_id', '=', 'strands.id')
            ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
            ->where('enrollments.school_year_id', $currentSchoolYear->id)
            ->where('enrollments.intended_grade_level', 11)
            ->where('enrollments.status', 'approved')
            ->select([
                'users.id as student_id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'student_personal_info.lrn',
                'strands.name as strand_name',
                'strands.code as strand_code',
                'sections.section_name as section_name',
                'enrollments.id as enrollment_id',
                'enrollments.status as enrollment_status'
            ])
            ->get();

        return Inertia::render('Faculty/Faculty_GradeProgression', [
            'students' => $eligibleStudents,
            'schoolYear' => $currentSchoolYear,
            'user' => $user
        ]);
    }
}
