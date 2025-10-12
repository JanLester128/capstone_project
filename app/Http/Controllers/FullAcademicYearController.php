<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\Subject;
use App\Models\Grade;
use App\Models\SchoolYear;
use App\Models\ClassSchedule;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Strand;
use App\Models\Section;
use App\Models\User;
// Note: PDF functionality requires barryvdh/laravel-dompdf package
// Run: composer require barryvdh/laravel-dompdf

class FullAcademicYearController extends Controller
{
    /**
     * SHS Enrollment Logic: Check Grade 11/12 enrollment eligibility
     * Following HCI Principle 1: Visibility of system status - Clear enrollment requirements
     * Following HCI Principle 5: Error prevention - Prevent duplicate enrollments
     */
    public function checkEnrollmentEligibility(Request $request)
    {
        $user = Auth::user();
        $gradeLevel = $request->input('grade_level');
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json([
                'eligible' => false,
                'reason' => 'No active school year found',
                'action_required' => 'contact_registrar'
            ]);
        }
        
        // Check for existing enrollment in current school year
        $currentEnrollment = Enrollment::where('student_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->first();
            
        if ($currentEnrollment) {
            return response()->json([
                'eligible' => false,
                'reason' => 'Already enrolled for current school year',
                'enrollment_status' => $currentEnrollment->status,
                'action_required' => 'none'
            ]);
        }
        
        if ($gradeLevel === 'Grade 11') {
            // Grade 11: Always allow self-enrollment (first entry to SHS)
            return response()->json([
                'eligible' => true,
                'enrollment_type' => 'self_enroll',
                'reason' => 'Grade 11 students must self-enroll',
                'action_required' => 'complete_enrollment_form'
            ]);
        }
        
        if ($gradeLevel === 'Grade 12') {
            // Grade 12: Check if Grade 11 enrollment exists
            $grade11Enrollment = Enrollment::where('student_id', $user->id)
                ->whereHas('schoolYear', function($query) {
                    $query->where('year_start', '<', now()->year);
                })
                ->where('status', 'enrolled')
                ->first();
                
            if ($grade11Enrollment) {
                // Has Grade 11 enrollment - Faculty/coordinator should auto-enroll
                return response()->json([
                    'eligible' => true,
                    'enrollment_type' => 'auto_enroll',
                    'reason' => 'Grade 11 enrollment found - Faculty will auto-enroll you',
                    'action_required' => 'wait_for_faculty',
                    'grade11_info' => [
                        'school_year' => $grade11Enrollment->schoolYear->year_start . '-' . $grade11Enrollment->schoolYear->year_end,
                        'strand' => $grade11Enrollment->assignedStrand->name ?? 'N/A'
                    ]
                ]);
            } else {
                // No Grade 11 enrollment - Allow self-enrollment (transferee/late onboarding)
                return response()->json([
                    'eligible' => true,
                    'enrollment_type' => 'self_enroll',
                    'reason' => 'No Grade 11 enrollment found - You may self-enroll as transferee',
                    'action_required' => 'complete_enrollment_form',
                    'notice' => 'If you were not enrolled in this system during Grade 11, you must submit your own Grade 12 enrollment.'
                ]);
            }
        }
        
        return response()->json([
            'eligible' => false,
            'reason' => 'Invalid grade level',
            'action_required' => 'select_valid_grade'
        ]);
    }
    
    /**
     * Faculty Dashboard: Get students eligible for Grade 12 auto-enrollment
     * Following HCI Principle 2: Match between system and real world - Faculty workflow
     */
    public function getGrade12EligibleStudents(Request $request)
    {
        $user = Auth::user();
        
        if (!in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $previousSchoolYear = SchoolYear::where('year_end', $activeSchoolYear->year_start)->first();
        
        if (!$previousSchoolYear) {
            return response()->json([
                'eligible_students' => [],
                'message' => 'No previous school year found for Grade 12 progression'
            ]);
        }
        
        // Get Grade 11 students from previous year who need Grade 12 auto-enrollment
        $eligibleStudents = Enrollment::with(['student', 'assignedStrand', 'assignedSection'])
            ->where('school_year_id', $previousSchoolYear->id)
            ->where('status', 'enrolled')
            ->whereDoesntHave('student.enrollments', function($query) use ($activeSchoolYear) {
                $query->where('school_year_id', $activeSchoolYear->id);
            })
            ->get()
            ->map(function($enrollment) {
                return [
                    'id' => $enrollment->student->id,
                    'name' => $enrollment->student->firstname . ' ' . $enrollment->student->lastname,
                    'email' => $enrollment->student->email,
                    'grade11_strand' => $enrollment->assignedStrand->name ?? 'N/A',
                    'grade11_section' => $enrollment->assignedSection->section_name ?? 'N/A',
                    'grade11_school_year' => $enrollment->schoolYear->year_start . '-' . $enrollment->schoolYear->year_end,
                    'progression_status' => 'pending_auto_enrollment',
                    'auto_enroll_eligible' => true
                ];
            });
            
        return response()->json([
            'eligible_students' => $eligibleStudents,
            'total_count' => $eligibleStudents->count(),
            'current_school_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end
        ]);
    }
    
    /**
     * Faculty Action: Process Grade 12 auto-enrollment
     * Following HCI Principle 3: User control and freedom - Faculty can approve/reject
     */
    public function processGrade12AutoEnrollment(Request $request)
    {
        $request->validate([
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:users,id',
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string'
        ]);
        
        $user = Auth::user();
        
        if (!in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $processedCount = 0;
        $errors = [];
        
        DB::beginTransaction();
        
        try {
            foreach ($request->student_ids as $studentId) {
                $student = User::find($studentId);
                
                if (!$student || $student->role !== 'student') {
                    $errors[] = "Student ID {$studentId} not found or invalid";
                    continue;
                }
                
                // Get Grade 11 enrollment info
                $grade11Enrollment = Enrollment::where('student_id', $studentId)
                    ->whereHas('schoolYear', function($query) use ($activeSchoolYear) {
                        $query->where('year_end', $activeSchoolYear->year_start);
                    })
                    ->where('status', 'enrolled')
                    ->first();
                    
                if (!$grade11Enrollment) {
                    $errors[] = "No Grade 11 enrollment found for {$student->firstname} {$student->lastname}";
                    continue;
                }
                
                if ($request->action === 'approve') {
                    // Create Grade 12 enrollment with same strand and progression
                    Enrollment::create([
                        'student_id' => $studentId,
                        'school_year_id' => $activeSchoolYear->id,
                        'strand_id' => $grade11Enrollment->strand_id,
                        'assigned_section_id' => null, // Will be assigned later by registrar
                        'status' => 'enrolled',
                        'enrollment_type' => 'auto_progression',
                        'enrolled_by' => $user->id,
                        'enrollment_date' => now(),
                        'notes' => $request->notes ?? 'Auto-enrolled from Grade 11 progression',
                        'academic_year_status' => 'Grade 12'
                    ]);
                    
                    $processedCount++;
                }
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => "Successfully processed {$processedCount} students",
                'processed_count' => $processedCount,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error processing Grade 12 auto-enrollment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process auto-enrollment'], 500);
        }
    }

    /**
     * Generate Full Academic Year COR for Coordinator/Faculty
     * Following HCI Principle 1: Visibility of system status - Clear academic year overview
     * Following HCI Principle 6: Recognition rather than recall - Complete curriculum display
     */
    public function generateFullYearCOR(Request $request, $studentId)
    {
        try {
            // Get student user and enrollment data (HCI Principle 9: Error prevention)
            $studentUser = \App\Models\User::where('id', $studentId)
                ->where('role', 'student')
                ->first();
                
            if (!$studentUser) {
                Log::info("Student not found with ID: {$studentId}");
                return response()->json(['error' => 'Student not found'], 404);
            }
            
            Log::info("Processing Full Year COR for student: {$studentUser->firstname} {$studentUser->lastname} (ID: {$studentId})");
            
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            // Get student's enrollment for the active school year
            $enrollment = Enrollment::with(['strand', 'section'])
                ->where('student_id', $studentId)
                ->where('school_year_id', $activeSchoolYear->id)
                ->whereIn('status', ['enrolled', 'approved'])
                ->first();

            if (!$enrollment) {
                return response()->json(['error' => 'Student not enrolled for current academic year'], 404);
            }

            // Get all subjects for the student's strand for BOTH semesters
            Log::info("Fetching subjects for strand: {$enrollment->strand_id}, school year: {$activeSchoolYear->id}");
            
            $firstSemesterSubjects = $this->getSubjectsForSemester($enrollment->strand_id, 1, $activeSchoolYear->id);
            $secondSemesterSubjects = $this->getSubjectsForSemester($enrollment->strand_id, 2, $activeSchoolYear->id);
            
            Log::info("Found subjects - 1st Semester: {$firstSemesterSubjects->count()}, 2nd Semester: {$secondSemesterSubjects->count()}");

            // Get student's grades for both semesters (only approved grades for privacy)
            $studentGrades = Grade::where('student_id', $studentId)
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('approval_status', 'approved') // Privacy protection
                ->get()
                ->keyBy(function($grade) {
                    return $grade->subject_id . '_' . $grade->semester;
                });

            // Get class schedules for both semesters
            $firstSemesterSchedules = $this->getSchedulesForSemester($enrollment->section_id, 1, $activeSchoolYear->id);
            $secondSemesterSchedules = $this->getSchedulesForSemester($enrollment->section_id, 2, $activeSchoolYear->id);

            // Prepare full academic year data
            $fullYearData = [
                'student' => [
                    'id' => $studentUser->id,
                    'name' => $studentUser->firstname . ' ' . $studentUser->lastname,
                    'student_id' => $studentUser->id,
                    'grade_level' => $enrollment->grade_level ?? 'Grade 11',
                    'strand' => $enrollment->strand,
                    'section' => $enrollment->section
                ],
                'school_year' => [
                    'year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                    'full_name' => $activeSchoolYear->getFullNameAttribute()
                ],
                'first_semester' => [
                    'subjects' => $this->formatSubjectsWithGrades($firstSemesterSubjects, $studentGrades, 1),
                    'schedules' => $firstSemesterSchedules,
                    'total_subjects' => $firstSemesterSubjects->count(),
                    'semester_name' => '1st Semester'
                ],
                'second_semester' => [
                    'subjects' => $this->formatSubjectsWithGrades($secondSemesterSubjects, $studentGrades, 2),
                    'schedules' => $secondSemesterSchedules,
                    'total_subjects' => $secondSemesterSubjects->count(),
                    'semester_name' => '2nd Semester'
                ],
                'academic_summary' => $this->calculateAcademicSummary($studentGrades),
                'failed_subjects' => $this->getFailedSubjects($studentGrades),
                'summer_eligibility' => $this->checkSummerEligibility($studentGrades)
            ];

            return response()->json($fullYearData);

        } catch (\Exception $e) {
            Log::error('Error generating full year COR: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate full year COR'], 500);
        }
    }

    /**
     * Get subjects for a specific semester including core subjects
     */
    private function getSubjectsForSemester($strandId, $semester, $schoolYearId)
    {
        // Get subjects for the specific semester and strand
        $query = Subject::with(['strand', 'faculty'])
            ->where('semester', $semester)
            ->where(function($query) use ($strandId) {
                $query->where('strand_id', $strandId)  // Strand-specific subjects
                      ->orWhereNull('strand_id');        // Core subjects for all strands
            });
            
        // Only filter by school year if it exists in the subjects table
        if ($schoolYearId) {
            $query->where(function($q) use ($schoolYearId) {
                $q->where('school_year_id', $schoolYearId)
                  ->orWhereNull('school_year_id'); // Include subjects without specific school year
            });
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * Get class schedules for a specific semester
     */
    private function getSchedulesForSemester($sectionId, $semester, $schoolYearId)
    {
        return ClassSchedule::with(['subject', 'faculty', 'section'])
            ->where('school_year_id', $schoolYearId)
            ->where('semester', $semester)
            ->where('section_id', $sectionId)
            ->where('is_active', true)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(function($schedule) {
                return [
                    'subject_code' => $schedule->subject->code ?? 'N/A',
                    'subject_name' => $schedule->subject->name ?? 'N/A',
                    'faculty_name' => $schedule->faculty ? $schedule->faculty->firstname . ' ' . $schedule->faculty->lastname : 'TBA',
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time ? date('g:i A', strtotime($schedule->start_time)) : 'TBA',
                    'end_time' => $schedule->end_time ? date('g:i A', strtotime($schedule->end_time)) : 'TBA',
                    'room' => $schedule->room ?? 'TBA',
                    'time_display' => $schedule->start_time && $schedule->end_time ? 
                        date('g:i A', strtotime($schedule->start_time)) . ' - ' . date('g:i A', strtotime($schedule->end_time)) : 'TBA'
                ];
            });
    }

    /**
     * Format subjects with their corresponding grades
     */
    private function formatSubjectsWithGrades($subjects, $studentGrades, $semester)
    {
        return $subjects->map(function($subject) use ($studentGrades, $semester) {
            $gradeKey = $subject->id . '_' . $semester;
            $grade = $studentGrades->get($gradeKey);
            
            return [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
                'faculty' => $subject->faculty ? $subject->faculty->firstname . ' ' . $subject->faculty->lastname : 'TBA',
                'grade' => $grade ? [
                    'first_quarter' => $grade->first_quarter,
                    'second_quarter' => $grade->second_quarter,
                    'third_quarter' => $grade->third_quarter,
                    'fourth_quarter' => $grade->fourth_quarter,
                    'semester_grade' => $grade->semester_grade,
                    'status' => $grade->isPassed() ? 'Passed' : 'Failed',
                    'letter_grade' => $grade->getLetterGrade()
                ] : null,
                'is_core_subject' => $subject->strand_id === null,
                'strand_specific' => $subject->strand_id !== null
            ];
        });
    }

    /**
     * Calculate academic summary for the full year
     */
    private function calculateAcademicSummary($studentGrades)
    {
        $firstSemGrades = $studentGrades->filter(function($grade, $key) {
            return str_contains($key, '_1');
        });
        
        $secondSemGrades = $studentGrades->filter(function($grade, $key) {
            return str_contains($key, '_2');
        });

        return [
            'first_semester' => [
                'total_subjects' => $firstSemGrades->count(),
                'passed_subjects' => $firstSemGrades->filter(fn($g) => $g->isPassed())->count(),
                'failed_subjects' => $firstSemGrades->filter(fn($g) => !$g->isPassed())->count(),
                'average_grade' => $firstSemGrades->avg('semester_grade')
            ],
            'second_semester' => [
                'total_subjects' => $secondSemGrades->count(),
                'passed_subjects' => $secondSemGrades->filter(fn($g) => $g->isPassed())->count(),
                'failed_subjects' => $secondSemGrades->filter(fn($g) => !$g->isPassed())->count(),
                'average_grade' => $secondSemGrades->avg('semester_grade')
            ],
            'overall' => [
                'total_subjects' => $studentGrades->count(),
                'passed_subjects' => $studentGrades->filter(fn($g) => $g->isPassed())->count(),
                'failed_subjects' => $studentGrades->filter(fn($g) => !$g->isPassed())->count(),
                'overall_average' => $studentGrades->avg('semester_grade')
            ]
        ];
    }

    /**
     * Get failed subjects for summer class eligibility
     */
    private function getFailedSubjects($studentGrades)
    {
        return $studentGrades->filter(function($grade) {
            return !$grade->isPassed();
        })->map(function($grade) {
            return [
                'subject_id' => $grade->subject_id,
                'subject_name' => $grade->subject->name,
                'subject_code' => $grade->subject->code,
                'semester' => $grade->semester,
                'failed_grade' => $grade->semester_grade,
                'letter_grade' => $grade->getLetterGrade()
            ];
        })->values();
    }

    /**
     * Check if student is eligible for summer classes
     */
    private function checkSummerEligibility($studentGrades)
    {
        $failedSubjects = $studentGrades->filter(fn($g) => !$g->isPassed());
        $totalSubjects = $studentGrades->count();
        $failedCount = $failedSubjects->count();
        
        // Philippine SHS rules: Can take summer if failed 1-3 subjects
        $isEligible = $failedCount > 0 && $failedCount <= 3;
        
        return [
            'is_eligible' => $isEligible,
            'failed_count' => $failedCount,
            'total_subjects' => $totalSubjects,
            'reason' => $isEligible ? 'Eligible for summer classes' : 
                       ($failedCount === 0 ? 'No failed subjects' : 'Too many failed subjects - requires retention'),
            'failed_subjects' => $failedSubjects->pluck('subject.name')->toArray()
        ];
    }

    /**
     * Generate Summer Class Enrollment for students with failed subjects
     * Following HCI Principle 8: Aesthetic and minimalist design - Only essential summer enrollment data
     */
    public function generateSummerEnrollment(Request $request, $studentId = null)
    {
        try {
            // Handle both faculty (with studentId) and student (current user) requests
            if ($studentId) {
                // Faculty accessing student data
                $student = Student::with(['user'])->findOrFail($studentId);
            } else {
                // Student accessing their own data (privacy protection)
                $userId = Auth::id();
                $student = Student::with(['user'])->where('user_id', $userId)->firstOrFail();
            }
            
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            // Get failed subjects only (privacy protection - student's own data only)
            $failedGrades = Grade::with(['subject'])
                ->where('student_id', $student->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('approval_status', 'approved')
                ->whereRaw('semester_grade < 75 OR semester_grade IS NULL')
                ->get();

            if ($failedGrades->isEmpty()) {
                return response()->json(['error' => 'No failed subjects found for summer enrollment'], 404);
            }

            // Check summer eligibility (1-3 failed subjects)
            if ($failedGrades->count() > 3) {
                return response()->json([
                    'error' => 'Student has too many failed subjects for summer classes',
                    'failed_count' => $failedGrades->count(),
                    'recommendation' => 'Student requires grade retention'
                ], 400);
            }

            $summerEnrollmentData = [
                'student' => [
                    'id' => $student->id,
                    'name' => $student->user->firstname . ' ' . $student->user->lastname,
                    'student_id' => $student->user->id
                ],
                'school_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                'enrollment_type' => 'Summer Classes',
                'failed_subjects' => $failedGrades->map(function($grade) {
                    return [
                        'subject_id' => $grade->subject_id,
                        'subject_name' => $grade->subject->name,
                        'subject_code' => $grade->subject->code,
                        'semester' => $grade->semester,
                        'failed_grade' => $grade->semester_grade,
                        'required_grade' => 75,
                        'status' => 'For Summer Class'
                    ];
                }),
                'enrollment_requirements' => [
                    'personal_info_required' => false, // No need to re-enter personal info
                    'documents_required' => false,     // Use existing documents
                    'payment_required' => true,        // Summer class fees
                    'schedule_selection' => true       // Choose summer schedule
                ]
            ];

            return response()->json($summerEnrollmentData);

        } catch (\Exception $e) {
            Log::error('Error generating summer enrollment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate summer enrollment'], 500);
        }
    }

    /**
     * Process Summer Class Enrollment (simplified - no personal info needed)
     */
    public function processSummerEnrollment(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:student_personal_info,id',
            'failed_subject_ids' => 'required|array|min:1|max:3',
            'failed_subject_ids.*' => 'exists:subjects,id',
            'summer_schedule_preference' => 'required|string'
        ]);

        try {
            DB::beginTransaction();

            $studentId = $request->student_id;
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            // Create summer enrollment record
            $summerEnrollment = Enrollment::create([
                'student_id' => $studentId,
                'school_year_id' => $activeSchoolYear->id,
                'enrollment_type' => 'summer',
                'status' => 'enrolled',
                'enrollment_date' => now(),
                'enrolled_by' => Auth::id(),
                'summer_subjects' => json_encode($request->failed_subject_ids),
                'schedule_preference' => $request->summer_schedule_preference
            ]);

            // Create summer class schedules for failed subjects
            foreach ($request->failed_subject_ids as $subjectId) {
                ClassSchedule::create([
                    'subject_id' => $subjectId,
                    'faculty_id' => null, // TBA
                    'section_id' => null, // Summer classes are mixed sections
                    'school_year_id' => $activeSchoolYear->id,
                    'semester' => 'Summer',
                    'day_of_week' => 'Monday-Friday', // Intensive summer schedule
                    'start_time' => '08:00:00',
                    'end_time' => '12:00:00',
                    'room' => 'Summer Classroom',
                    'is_active' => true,
                    'enrollment_id' => $summerEnrollment->id
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Summer enrollment completed successfully',
                'enrollment_id' => $summerEnrollment->id,
                'subjects_enrolled' => count($request->failed_subject_ids)
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error processing summer enrollment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process summer enrollment'], 500);
        }
    }

    /**
     * Generate COR as Blade view for printing
     * Following HCI Principle 8: Aesthetic and minimalist design - Clean printable format
     */
    public function generateCORView(Request $request, $studentId)
    {
        try {
            $user = Auth::user();
            
            // Get student enrollment data
            $studentUser = User::where('id', $studentId)
                ->where('role', 'student')
                ->first();
                
            if (!$studentUser) {
                return redirect()->back()->with('error', 'Student not found');
            }
            
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return redirect()->back()->with('error', 'No active school year found');
            }

            // Get student's enrollment
            $enrollment = Enrollment::with(['assignedStrand', 'assignedSection'])
                ->where('student_id', $studentId)
                ->where('school_year_id', $activeSchoolYear->id)
                ->whereIn('status', ['enrolled', 'approved'])
                ->first();

            if (!$enrollment) {
                return redirect()->back()->with('error', 'Student not enrolled for current academic year');
            }

            // Get class schedules for both semesters grouped by section
            $firstSemesterSchedules = $this->getSchedulesForSemester($enrollment->assigned_section_id, 1, $activeSchoolYear->id);
            $secondSemesterSchedules = $this->getSchedulesForSemester($enrollment->assigned_section_id, 2, $activeSchoolYear->id);

            $corData = [
                'student' => [
                    'id' => $studentUser->id,
                    'name' => $studentUser->firstname . ' ' . $studentUser->lastname,
                    'lrn' => $studentUser->lrn ?? 'N/A',
                    'grade_level' => 'Grade 12', // SHS is Grade 11-12
                    'strand' => $enrollment->assignedStrand,
                    'section' => $enrollment->assignedSection
                ],
                'school_year' => [
                    'year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                    'full_name' => 'School Year ' . $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end
                ],
                'first_semester' => [
                    'schedules' => $firstSemesterSchedules,
                    'semester_name' => '1st Semester'
                ],
                'second_semester' => [
                    'schedules' => $secondSemesterSchedules,
                    'semester_name' => '2nd Semester'
                ],
                'prepared_by' => [
                    'name' => $user->firstname . ' ' . $user->lastname,
                    'position' => ucfirst($user->role),
                    'date' => now()->format('F j, Y')
                ]
            ];

            return view('cor.full-academic-year', compact('corData'));

        } catch (\Exception $e) {
            Log::error('Error generating COR view: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to generate COR');
        }
    }

    /**
     * Generate COR as PDF for download
     * Following HCI Principle 7: Flexibility and efficiency of use - Multiple output formats
     */
    public function generateCORPDF(Request $request, $studentId)
    {
        try {
            $user = Auth::user();
            
            // Get student enrollment data (same as COR view)
            $studentUser = User::where('id', $studentId)
                ->where('role', 'student')
                ->first();
                
            if (!$studentUser) {
                return response()->json(['error' => 'Student not found'], 404);
            }
            
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            // Get student's enrollment
            $enrollment = Enrollment::with(['assignedStrand', 'assignedSection'])
                ->where('student_id', $studentId)
                ->where('school_year_id', $activeSchoolYear->id)
                ->whereIn('status', ['enrolled', 'approved'])
                ->first();

            if (!$enrollment) {
                return response()->json(['error' => 'Student not enrolled'], 404);
            }

            // Get class schedules for both semesters
            $firstSemesterSchedules = $this->getSchedulesForSemester($enrollment->assigned_section_id, 1, $activeSchoolYear->id);
            $secondSemesterSchedules = $this->getSchedulesForSemester($enrollment->assigned_section_id, 2, $activeSchoolYear->id);

            $corData = [
                'student' => [
                    'id' => $studentUser->id,
                    'name' => $studentUser->firstname . ' ' . $studentUser->lastname,
                    'lrn' => $studentUser->lrn ?? 'N/A',
                    'grade_level' => 'Grade 12',
                    'strand' => $enrollment->assignedStrand,
                    'section' => $enrollment->assignedSection
                ],
                'school_year' => [
                    'year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                    'full_name' => 'School Year ' . $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end
                ],
                'first_semester' => [
                    'schedules' => $firstSemesterSchedules,
                    'semester_name' => '1st Semester'
                ],
                'second_semester' => [
                    'schedules' => $secondSemesterSchedules,
                    'semester_name' => '2nd Semester'
                ],
                'prepared_by' => [
                    'name' => $user->firstname . ' ' . $user->lastname,
                    'position' => ucfirst($user->role),
                    'date' => now()->format('F j, Y')
                ]
            ];

            // TODO: Install barryvdh/laravel-dompdf package for PDF generation
            // For now, return JSON response with download instructions
            return response()->json([
                'error' => 'PDF generation not available',
                'message' => 'Please install barryvdh/laravel-dompdf package to enable PDF downloads',
                'instructions' => 'Run: composer require barryvdh/laravel-dompdf'
            ], 501);

        } catch (\Exception $e) {
            Log::error('Error generating COR PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate PDF'], 500);
        }
    }

    /**
     * Student COR Interface - View own COR
     * Following HCI Principle 4: Consistency and standards - Student self-service
     */
    public function studentCORView(Request $request)
    {
        try {
            $user = Auth::user();
            
            if ($user->role !== 'student') {
                return redirect()->route('login')->with('error', 'Unauthorized access');
            }
            
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            // Get student's enrollment
            $enrollment = Enrollment::with(['assignedStrand', 'assignedSection'])
                ->where('student_id', $user->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->whereIn('status', ['enrolled', 'approved'])
                ->first();

            if (!$enrollment) {
                return Inertia::render('Student/Student_COR', [
                    'error' => 'You are not enrolled for the current academic year',
                    'enrollment_status' => 'not_enrolled'
                ]);
            }

            // Get class schedules for both semesters
            $firstSemesterSchedules = $this->getSchedulesForSemester($enrollment->assigned_section_id, 1, $activeSchoolYear->id);
            $secondSemesterSchedules = $this->getSchedulesForSemester($enrollment->assigned_section_id, 2, $activeSchoolYear->id);

            $corData = [
                'student' => [
                    'id' => $user->id,
                    'name' => $user->firstname . ' ' . $user->lastname,
                    'lrn' => $user->lrn ?? 'N/A',
                    'grade_level' => 'Grade 12',
                    'strand' => $enrollment->assignedStrand,
                    'section' => $enrollment->assignedSection
                ],
                'school_year' => [
                    'year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                    'full_name' => 'School Year ' . $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end
                ],
                'first_semester' => [
                    'schedules' => $firstSemesterSchedules,
                    'semester_name' => '1st Semester'
                ],
                'second_semester' => [
                    'schedules' => $secondSemesterSchedules,
                    'semester_name' => '2nd Semester'
                ],
                'enrollment_status' => 'enrolled',
                'can_print' => true,
                'can_download' => true
            ];

            return Inertia::render('Student/Student_COR', [
                'corData' => $corData,
                'auth' => ['user' => $user]
            ]);

        } catch (\Exception $e) {
            Log::error('Error loading student COR: ' . $e->getMessage());
            return Inertia::render('Student/Student_COR', [
                'error' => 'Failed to load your COR. Please contact the registrar.',
                'enrollment_status' => 'error'
            ]);
        }
    }

    /**
     * Faculty Dashboard Data - Handles Adviser vs Teacher vs Coordinator roles
     * Following HCI Principle 2: Match between system and real world - Role-based data access
     */
    public function getFacultyDashboardData(Request $request)
    {
        try {
            $user = Auth::user();
            $schoolYearId = $request->input('school_year_id');
            
            // Get school year (current if not specified)
            $schoolYear = $schoolYearId 
                ? SchoolYear::find($schoolYearId)
                : SchoolYear::where('is_active', true)->first();
                
            if (!$schoolYear) {
                return response()->json(['error' => 'No school year found'], 404);
            }

            $dashboardData = [
                'user_role' => $user->role,
                'is_coordinator' => $user->is_coordinator ?? false,
                'school_year' => $schoolYear,
                'faculty_assignments' => [],
                'students' => [],
                'role_description' => ''
            ];

            // Check if user is an adviser (assigned to a section)
            $adviserAssignment = Section::where('adviser_id', $user->id)
                ->where('school_year_id', $schoolYear->id)
                ->with(['strand', 'enrollments.student'])
                ->first();

            // Get teaching assignments (subjects assigned to faculty)
            $teachingAssignments = ClassSchedule::where('faculty_id', $user->id)
                ->where('school_year_id', $schoolYear->id)
                ->where('is_active', true)
                ->with(['subject', 'section.strand'])
                ->get();

            if ($adviserAssignment) {
                // ADVISER VIEW: All students in assigned section
                $dashboardData['role_description'] = "You are the adviser for Section {$adviserAssignment->section_name}. Here are all the students assigned to your section.";
                $dashboardData['adviser_section'] = $adviserAssignment;
                
                // Get all students in the section
                $sectionStudents = Enrollment::where('assigned_section_id', $adviserAssignment->id)
                    ->where('school_year_id', $schoolYear->id)
                    ->whereIn('status', ['enrolled', 'approved'])
                    ->with(['student', 'assignedStrand'])
                    ->get()
                    ->map(function($enrollment) {
                        return [
                            'id' => $enrollment->student->id,
                            'name' => $enrollment->student->firstname . ' ' . $enrollment->student->lastname,
                            'email' => $enrollment->student->email,
                            'strand' => $enrollment->assignedStrand->name ?? 'N/A',
                            'enrollment_status' => $enrollment->status,
                            'view_type' => 'adviser'
                        ];
                    });
                    
                $dashboardData['students'] = $sectionStudents;
                
            } elseif ($teachingAssignments->count() > 0) {
                // TEACHER VIEW: Students enrolled in assigned subjects
                $subjectNames = $teachingAssignments->pluck('subject.name')->toArray();
                $dashboardData['role_description'] = "You are assigned to teach these subjects: " . implode(', ', $subjectNames) . ". Here are the students enrolled in your subjects.";
                $dashboardData['teaching_assignments'] = $teachingAssignments;
                
                // Get students enrolled in teacher's subjects
                $teacherStudents = collect();
                foreach ($teachingAssignments as $assignment) {
                    $subjectStudents = Enrollment::where('assigned_section_id', $assignment->section_id)
                        ->where('school_year_id', $schoolYear->id)
                        ->whereIn('status', ['enrolled', 'approved'])
                        ->with(['student', 'assignedStrand'])
                        ->get()
                        ->map(function($enrollment) use ($assignment) {
                            return [
                                'id' => $enrollment->student->id,
                                'name' => $enrollment->student->firstname . ' ' . $enrollment->student->lastname,
                                'email' => $enrollment->student->email,
                                'strand' => $enrollment->assignedStrand->name ?? 'N/A',
                                'enrollment_status' => $enrollment->status,
                                'subject' => $assignment->subject->name,
                                'section' => $assignment->section->section_name,
                                'view_type' => 'teacher'
                            ];
                        });
                    $teacherStudents = $teacherStudents->merge($subjectStudents);
                }
                
                // Remove duplicates and group by subject
                $dashboardData['students'] = $teacherStudents->unique('id')->values();
                $dashboardData['students_by_subject'] = $teacherStudents->groupBy('subject');
            }

            // COORDINATOR VIEW: Additional permissions
            if ($user->is_coordinator) {
                $dashboardData['role_description'] .= " As a coordinator, you can also review submitted pre-enrollments and enrolled students by section and school year.";
                
                // Get pre-enrollments for coordinator review
                $preEnrollments = Enrollment::where('school_year_id', $schoolYear->id)
                    ->whereIn('status', ['pending', 'submitted'])
                    ->with(['student', 'assignedStrand', 'assignedSection'])
                    ->get()
                    ->map(function($enrollment) {
                        return [
                            'id' => $enrollment->id,
                            'student_id' => $enrollment->student->id,
                            'student_name' => $enrollment->student->firstname . ' ' . $enrollment->student->lastname,
                            'email' => $enrollment->student->email,
                            'strand' => $enrollment->assignedStrand->name ?? 'N/A',
                            'section' => $enrollment->assignedSection->section_name ?? 'N/A',
                            'status' => $enrollment->status,
                            'submitted_at' => $enrollment->created_at,
                            'view_type' => 'coordinator'
                        ];
                    });
                    
                $dashboardData['pre_enrollments'] = $preEnrollments;
                
                // Get all enrolled students grouped by section
                $enrolledBySection = Enrollment::where('school_year_id', $schoolYear->id)
                    ->whereIn('status', ['enrolled', 'approved'])
                    ->with(['student', 'assignedStrand', 'assignedSection'])
                    ->get()
                    ->groupBy('assignedSection.section_name')
                    ->map(function($sectionEnrollments) {
                        return $sectionEnrollments->map(function($enrollment) {
                            return [
                                'id' => $enrollment->student->id,
                                'name' => $enrollment->student->firstname . ' ' . $enrollment->student->lastname,
                                'email' => $enrollment->student->email,
                                'strand' => $enrollment->assignedStrand->name ?? 'N/A',
                                'enrollment_status' => $enrollment->status,
                                'view_type' => 'coordinator'
                            ];
                        });
                    });
                    
                $dashboardData['enrolled_by_section'] = $enrolledBySection;
            }

            return response()->json($dashboardData);
            
        } catch (\Exception $e) {
            Log::error('Error getting faculty dashboard data: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load dashboard data'], 500);
        }
    }

    /**
     * Coordinator Pre-enrollment Management
     * Following HCI Principle 3: User control and freedom - Approve/reject functionality
     */
    public function processPreEnrollment(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user->is_coordinator) {
                return response()->json(['error' => 'Unauthorized. Coordinator access required.'], 403);
            }
            
            $validated = $request->validate([
                'enrollment_id' => 'required|exists:enrollments,id',
                'action' => 'required|in:approve,reject',
                'notes' => 'nullable|string|max:500'
            ]);
            
            $enrollment = Enrollment::findOrFail($validated['enrollment_id']);
            
            if (!in_array($enrollment->status, ['pending', 'submitted'])) {
                return response()->json(['error' => 'Enrollment cannot be processed in current status'], 400);
            }
            
            DB::beginTransaction();
            
            if ($validated['action'] === 'approve') {
                $enrollment->status = 'approved';
                $enrollment->approved_by = $user->id;
                $enrollment->approved_at = now();
            } else {
                $enrollment->status = 'rejected';
                $enrollment->rejected_by = $user->id;
                $enrollment->rejected_at = now();
            }
            
            $enrollment->coordinator_notes = $validated['notes'];
            $enrollment->save();
            
            DB::commit();
            
            Log::info('Pre-enrollment processed by coordinator', [
                'enrollment_id' => $enrollment->id,
                'action' => $validated['action'],
                'coordinator_id' => $user->id,
                'student_id' => $enrollment->student_id
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Pre-enrollment ' . $validated['action'] . 'd successfully',
                'enrollment' => $enrollment->load(['student', 'assignedStrand', 'assignedSection'])
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error processing pre-enrollment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process pre-enrollment'], 500);
        }
    }

    /**
     * Get Historical Student Data (Multi-Year)
     * Following HCI Principle 6: Recognition rather than recall - Historical data access
     */
    public function getHistoricalStudentData(Request $request)
    {
        try {
            $user = Auth::user();
            $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();
            
            $historicalData = [];
            
            foreach ($schoolYears as $schoolYear) {
                $yearData = [
                    'school_year' => $schoolYear,
                    'students' => []
                ];
                
                if ($user->role === 'registrar') {
                    // Registrar can see all students from all years
                    $students = Enrollment::where('school_year_id', $schoolYear->id)
                        ->with(['student', 'assignedStrand', 'assignedSection'])
                        ->get()
                        ->map(function($enrollment) {
                            return [
                                'id' => $enrollment->student->id,
                                'name' => $enrollment->student->firstname . ' ' . $enrollment->student->lastname,
                                'email' => $enrollment->student->email,
                                'strand' => $enrollment->assignedStrand->name ?? 'N/A',
                                'section' => $enrollment->assignedSection->section_name ?? 'N/A',
                                'status' => $enrollment->status
                            ];
                        });
                        
                    $yearData['students'] = $students;
                    
                } elseif ($user->is_coordinator) {
                    // Coordinators can see enrolled students from current and previous years
                    $students = Enrollment::where('school_year_id', $schoolYear->id)
                        ->whereIn('status', ['enrolled', 'approved'])
                        ->with(['student', 'assignedStrand', 'assignedSection'])
                        ->get()
                        ->groupBy('assignedSection.section_name')
                        ->map(function($sectionStudents) {
                            return $sectionStudents->map(function($enrollment) {
                                return [
                                    'id' => $enrollment->student->id,
                                    'name' => $enrollment->student->firstname . ' ' . $enrollment->student->lastname,
                                    'email' => $enrollment->student->email,
                                    'strand' => $enrollment->assignedStrand->name ?? 'N/A',
                                    'status' => $enrollment->status
                                ];
                            });
                        });
                        
                    $yearData['students_by_section'] = $students;
                }
                
                $historicalData[] = $yearData;
            }
            
            return response()->json([
                'historical_data' => $historicalData,
                'user_role' => $user->role,
                'is_coordinator' => $user->is_coordinator ?? false
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting historical student data: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load historical data'], 500);
        }
    }
}
