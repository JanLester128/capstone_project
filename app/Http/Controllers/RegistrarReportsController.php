<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Subject;
use App\Models\Strand;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\Enrollment;
use App\Models\ClassSchedule;
use App\Models\Grade;
use App\Models\StudentPersonalInfo;
// use PDF; // Uncomment when barryvdh/laravel-dompdf is installed

class RegistrarReportsController extends Controller
{
    /**
     * Show the reports dashboard
     * Following HCI Principle 1: Visibility of system status - Clear report categories
     */
    public function reportsPage()
    {
        try {
            // Get filter options
            $strands = Strand::orderBy('name')->get();
            
            // Get sections from current active school year to avoid duplicates
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $sections = Section::with('strand')
                ->when($activeSchoolYear, function($query) use ($activeSchoolYear) {
                    $query->where('school_year_id', $activeSchoolYear->id);
                })
                ->orderBy('section_name')
                ->get();
                
            $subjects = Subject::orderBy('name')->get();
            $teachers = User::where('role', 'faculty')->orderBy('firstname')->get();
            $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();
            
            return Inertia::render('Registrar/RegistrarReports', [
                'strands' => $strands,
                'sections' => $sections,
                'subjects' => $subjects,
                'teachers' => $teachers,
                'schoolYears' => $schoolYears,
                'auth' => ['user' => Auth::user()]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error loading reports page: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to load reports page');
        }
    }

    /**
     * Generate Student List Report
     * Following HCI Principle 6: Recognition rather than recall - Clear student information display
     */
    public function generateStudentListReport(Request $request)
    {
        try {
            $validated = $request->validate([
                'strand_id' => 'nullable|exists:strands,id',
                'section_id' => 'nullable|exists:sections,id',
                'subject_id' => 'nullable|exists:subjects,id',
                'school_year_id' => 'nullable|exists:school_years,id',
                'year_level' => 'nullable|string',
                'format' => 'nullable|in:view,pdf'
            ]);

            // Get active school year if not specified
            $schoolYear = $validated['school_year_id'] 
                ? SchoolYear::find($validated['school_year_id'])
                : SchoolYear::where('is_active', true)->first();

            if (!$schoolYear) {
                return response()->json(['error' => 'No school year found'], 404);
            }

            // Build query for students
            $query = Enrollment::with([
                'student', 
                'assignedStrand', 
                'assignedSection.strand',
                'classDetails.classSchedule.subject'
            ])
            ->where('school_year_id', $schoolYear->id)
            ->whereIn('status', ['enrolled', 'approved']);

            // Apply filters
            if ($validated['strand_id']) {
                $query->where('assigned_strand_id', $validated['strand_id']);
            }

            if ($validated['section_id']) {
                $query->where('assigned_section_id', $validated['section_id']);
            }

            if ($validated['year_level']) {
                $query->whereHas('assignedSection', function($q) use ($validated) {
                    $q->where('year_level', $validated['year_level']);
                });
            }

            $enrollments = $query->get();

            // Filter by subject if specified
            if ($validated['subject_id']) {
                $enrollments = $enrollments->filter(function($enrollment) use ($validated) {
                    return $enrollment->classDetails->contains(function($classDetail) use ($validated) {
                        return $classDetail->classSchedule && 
                               $classDetail->classSchedule->subject_id == $validated['subject_id'];
                    });
                });
            }

            // Format student data
            $students = $enrollments->map(function($enrollment) use ($validated) {
                $student = $enrollment->student;
                $personalInfo = StudentPersonalInfo::where('student_id', $student->id)->first();
                
                // Get enrolled subjects
                $enrolledSubjects = $enrollment->classDetails->map(function($classDetail) {
                    return $classDetail->classSchedule ? $classDetail->classSchedule->subject->name : null;
                })->filter()->unique()->values();

                return [
                    'id' => $student->id,
                    'full_name' => trim($student->firstname . ' ' . ($student->middlename ? $student->middlename . ' ' : '') . $student->lastname),
                    'lrn' => $student->lrn ?? 'N/A',
                    'email' => $student->email,
                    'strand' => $enrollment->assignedStrand->name ?? 'N/A',
                    'year_level' => $enrollment->assignedSection->year_level ?? 'N/A',
                    'section' => $enrollment->assignedSection->section_name ?? 'N/A',
                    'enrolled_subjects' => $enrolledSubjects,
                    'enrollment_status' => $enrollment->status,
                    'contact_number' => $personalInfo->contact_number ?? 'N/A',
                    'address' => $personalInfo->address ?? 'N/A'
                ];
            })->sortBy('full_name')->values();

            // Get filter labels for display
            $filterLabels = [
                'strand' => $validated['strand_id'] ? Strand::find($validated['strand_id'])->name : 'All Strands',
                'section' => $validated['section_id'] ? Section::find($validated['section_id'])->section_name : 'All Sections',
                'subject' => $validated['subject_id'] ? Subject::find($validated['subject_id'])->name : 'All Subjects',
                'year_level' => $validated['year_level'] ?? 'All Year Levels',
                'school_year' => $schoolYear->year_start . '-' . $schoolYear->year_end
            ];

            $reportData = [
                'title' => 'Student List Report',
                'students' => $students,
                'filters' => $filterLabels,
                'generated_at' => now()->format('F j, Y g:i A'),
                'generated_by' => Auth::user()->firstname . ' ' . Auth::user()->lastname,
                'total_students' => $students->count()
            ];

            if ($validated['format'] === 'pdf') {
                return $this->generateStudentListPDF($reportData);
            }

            return response()->json($reportData);

        } catch (\Exception $e) {
            Log::error('Error generating student list report: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate report'], 500);
        }
    }

    /**
     * Generate Grades Report
     * Following HCI Principle 8: Aesthetic and minimalist design - Clean grade display
     */
    public function generateGradesReport(Request $request)
    {
        try {
            $validated = $request->validate([
                'section_id' => 'nullable|exists:sections,id',
                'subject_id' => 'nullable|exists:subjects,id',
                'faculty_id' => 'nullable|exists:users,id',
                'school_year_id' => 'nullable|exists:school_years,id',
                'year_level' => 'nullable|string',
                'semester' => 'nullable|in:1,2',
                'sort_by' => 'nullable|in:name,grade',
                'format' => 'nullable|in:view,pdf'
            ]);

            $schoolYear = $validated['school_year_id'] 
                ? SchoolYear::find($validated['school_year_id'])
                : SchoolYear::where('is_active', true)->first();

            if (!$schoolYear) {
                return response()->json(['error' => 'No school year found'], 404);
            }

            // Build query for grades
            $query = Grade::with([
                'student',
                'subject',
                'classSchedule.faculty',
                'classSchedule.section'
            ])
            ->whereHas('classSchedule', function($q) use ($schoolYear) {
                $q->where('school_year_id', $schoolYear->id);
            });

            // Apply filters
            if ($validated['section_id']) {
                $query->whereHas('classSchedule', function($q) use ($validated) {
                    $q->where('section_id', $validated['section_id']);
                });
            }

            if ($validated['subject_id']) {
                $query->where('subject_id', $validated['subject_id']);
            }

            if ($validated['faculty_id']) {
                $query->whereHas('classSchedule', function($q) use ($validated) {
                    $q->where('faculty_id', $validated['faculty_id']);
                });
            }

            if ($validated['semester']) {
                $semesterValue = $validated['semester'] == 1 ? '1st Semester' : '2nd Semester';
                $query->where('semester', $semesterValue);
            }

            $grades = $query->get();

            // Format grades data
            $gradesData = $grades->map(function($grade) {
                return [
                    'student_name' => $grade->student->firstname . ' ' . $grade->student->lastname,
                    'lrn' => $grade->student->lrn ?? 'N/A',
                    'subject' => $grade->subject->name,
                    'teacher' => $grade->classSchedule->faculty->firstname . ' ' . $grade->classSchedule->faculty->lastname,
                    'section' => $grade->classSchedule->section->section_name,
                    'first_quarter' => $grade->first_quarter,
                    'second_quarter' => $grade->second_quarter,
                    'third_quarter' => $grade->third_quarter,
                    'fourth_quarter' => $grade->fourth_quarter,
                    'semester_grade' => $grade->semester_grade,
                    'semester' => $grade->semester,
                    'status' => $grade->status
                ];
            });

            // Sort data
            if ($validated['sort_by'] === 'grade') {
                $gradesData = $gradesData->sortByDesc('semester_grade');
            } else {
                $gradesData = $gradesData->sortBy('student_name');
            }

            // Get filter labels
            $filterLabels = [
                'section' => $validated['section_id'] ? Section::find($validated['section_id'])->section_name : 'All Sections',
                'subject' => $validated['subject_id'] ? Subject::find($validated['subject_id'])->name : 'All Subjects',
                'teacher' => $validated['faculty_id'] ? User::find($validated['faculty_id'])->firstname . ' ' . User::find($validated['faculty_id'])->lastname : 'All Faculty',
                'semester' => $validated['semester'] ? ($validated['semester'] == 1 ? '1st Semester' : '2nd Semester') : 'Both Semesters',
                'school_year' => $schoolYear->year_start . '-' . $schoolYear->year_end
            ];

            $reportData = [
                'title' => 'Grades Report',
                'grades' => $gradesData->values(),
                'filters' => $filterLabels,
                'generated_at' => now()->format('F j, Y g:i A'),
                'generated_by' => Auth::user()->firstname . ' ' . Auth::user()->lastname,
                'total_records' => $gradesData->count()
            ];

            if ($validated['format'] === 'pdf') {
                return $this->generateGradesPDF($reportData);
            }

            return response()->json($reportData);

        } catch (\Exception $e) {
            Log::error('Error generating grades report: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate report'], 500);
        }
    }

    /**
     * Generate Subjects Report
     * Following HCI Principle 2: Match between system and real world - Academic structure
     */
    public function generateSubjectsReport(Request $request)
    {
        try {
            $validated = $request->validate([
                'section_id' => 'nullable|exists:sections,id',
                'strand_id' => 'nullable|exists:strands,id',
                'school_year_id' => 'nullable|exists:school_years,id',
                'year_level' => 'nullable|string',
                'semester' => 'nullable|in:1,2',
                'format' => 'nullable|in:view,pdf'
            ]);

            $schoolYear = $validated['school_year_id'] 
                ? SchoolYear::find($validated['school_year_id'])
                : SchoolYear::where('is_active', true)->first();

            if (!$schoolYear) {
                return response()->json(['error' => 'No school year found'], 404);
            }

            // Build query for class schedules (subjects with assignments)
            $query = ClassSchedule::with([
                'subject',
                'faculty',
                'section.strand'
            ])
            ->where('school_year_id', $schoolYear->id)
            ->where('is_active', true);

            // Apply filters
            if ($validated['section_id']) {
                $query->where('section_id', $validated['section_id']);
            }

            if ($validated['strand_id']) {
                $query->whereHas('section', function($q) use ($validated) {
                    $q->where('strand_id', $validated['strand_id']);
                });
            }

            if ($validated['semester']) {
                $semesterValue = $validated['semester'] == 1 ? '1st Semester' : '2nd Semester';
                $query->where('semester', $semesterValue);
            }

            $schedules = $query->get();

            // Format subjects data
            $subjectsData = $schedules->map(function($schedule) {
                // Count enrolled students for this subject
                $enrolledCount = DB::table('class_details')
                    ->join('enrollments', 'class_details.student_id', '=', 'enrollments.student_id')
                    ->where('class_details.class_id', $schedule->id)
                    ->whereIn('enrollments.status', ['enrolled', 'approved'])
                    ->count();

                return [
                    'subject_name' => $schedule->subject->name,
                    'subject_code' => $schedule->subject->code ?? 'N/A',
                    'teacher_name' => $schedule->faculty->firstname . ' ' . $schedule->faculty->lastname,
                    'section' => $schedule->section->section_name,
                    'strand' => $schedule->section->strand->name ?? 'N/A',
                    'semester' => $schedule->semester,
                    'day_of_week' => $schedule->day_of_week,
                    'time' => $schedule->start_time && $schedule->end_time 
                        ? date('g:i A', strtotime($schedule->start_time)) . ' - ' . date('g:i A', strtotime($schedule->end_time))
                        : 'TBA',
                    'room' => $schedule->room ?? 'TBA',
                    'enrolled_students' => $enrolledCount
                ];
            })->sortBy('subject_name')->values();

            // Get filter labels
            $filterLabels = [
                'section' => $validated['section_id'] ? Section::find($validated['section_id'])->section_name : 'All Sections',
                'strand' => $validated['strand_id'] ? Strand::find($validated['strand_id'])->name : 'All Strands',
                'semester' => $validated['semester'] ? ($validated['semester'] == 1 ? '1st Semester' : '2nd Semester') : 'Both Semesters',
                'school_year' => $schoolYear->year_start . '-' . $schoolYear->year_end
            ];

            $reportData = [
                'title' => 'Subjects Report',
                'subjects' => $subjectsData,
                'filters' => $filterLabels,
                'generated_at' => now()->format('F j, Y g:i A'),
                'generated_by' => Auth::user()->firstname . ' ' . Auth::user()->lastname,
                'total_subjects' => $subjectsData->count()
            ];

            if ($validated['format'] === 'pdf') {
                return $this->generateSubjectsPDF($reportData);
            }

            return response()->json($reportData);

        } catch (\Exception $e) {
            Log::error('Error generating subjects report: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate report'], 500);
        }
    }

    /**
     * Generate Faculty Report
     * Following HCI Principle 4: Consistency and standards - Faculty information display
     */
    public function generateTeacherReport(Request $request)
    {
        try {
            $validated = $request->validate([
                'faculty_id' => 'nullable|exists:users,id',
                'school_year_id' => 'nullable|exists:school_years,id',
                'format' => 'nullable|in:view,pdf'
            ]);

            $schoolYear = $validated['school_year_id'] 
                ? SchoolYear::find($validated['school_year_id'])
                : SchoolYear::where('is_active', true)->first();

            if (!$schoolYear) {
                return response()->json(['error' => 'No school year found'], 404);
            }

            // Build query for faculty
            $query = User::where('role', 'faculty');

            if ($validated['faculty_id']) {
                $query->where('id', $validated['faculty_id']);
            }

            $teachers = $query->get();

            // Format teacher data
            $teachersData = $teachers->map(function($teacher) use ($schoolYear) {
                // Get teacher's class schedules
                $schedules = ClassSchedule::with(['subject', 'section.strand'])
                    ->where('faculty_id', $teacher->id)
                    ->where('school_year_id', $schoolYear->id)
                    ->where('is_active', true)
                    ->get();

                // Get assigned subjects and student counts
                $subjects = $schedules->map(function($schedule) {
                    $enrolledCount = DB::table('class_details')
                        ->join('enrollments', 'class_details.student_id', '=', 'enrollments.student_id')
                        ->where('class_details.class_schedule_id', $schedule->id)
                        ->whereIn('enrollments.status', ['enrolled', 'approved'])
                        ->count();

                    return [
                        'subject_name' => $schedule->subject->name,
                        'section' => $schedule->section->section_name,
                        'strand' => $schedule->section->strand->name ?? 'N/A',
                        'day_of_week' => $schedule->day_of_week,
                        'time' => $schedule->start_time && $schedule->end_time 
                            ? date('g:i A', strtotime($schedule->start_time)) . ' - ' . date('g:i A', strtotime($schedule->end_time))
                            : 'TBA',
                        'room' => $schedule->room ?? 'TBA',
                        'semester' => $schedule->semester,
                        'enrolled_students' => $enrolledCount
                    ];
                });

                // Check if teacher is a section adviser
                $adviserSections = Section::where('adviser_id', $teacher->id)
                    ->where('school_year_id', $schoolYear->id)
                    ->with('strand')
                    ->get()
                    ->map(function($section) {
                        $studentCount = Enrollment::where('assigned_section_id', $section->id)
                            ->whereIn('status', ['enrolled', 'approved'])
                            ->count();

                        return [
                            'section_name' => $section->section_name,
                            'strand' => $section->strand->name ?? 'N/A',
                            'student_count' => $studentCount
                        ];
                    });

                return [
                    'teacher_name' => $teacher->firstname . ' ' . $teacher->lastname,
                    'email' => $teacher->email,
                    'is_coordinator' => $teacher->is_coordinator ?? false,
                    'assigned_subjects' => $subjects,
                    'adviser_sections' => $adviserSections,
                    'total_subjects' => $subjects->count(),
                    'total_students' => $subjects->sum('enrolled_students')
                ];
            })->sortBy('teacher_name')->values();

            // Get filter labels
            $filterLabels = [
                'teacher' => $validated['teacher_id'] ? User::find($validated['teacher_id'])->firstname . ' ' . User::find($validated['teacher_id'])->lastname : 'All Teachers',
                'school_year' => $schoolYear->year_start . '-' . $schoolYear->year_end
            ];

            $reportData = [
                'title' => 'Teacher Report',
                'teachers' => $teachersData,
                'filters' => $filterLabels,
                'generated_at' => now()->format('F j, Y g:i A'),
                'generated_by' => Auth::user()->firstname . ' ' . Auth::user()->lastname,
                'total_teachers' => $teachersData->count()
            ];

            if ($validated['format'] === 'pdf') {
                return $this->generateTeacherPDF($reportData);
            }

            return response()->json($reportData);

        } catch (\Exception $e) {
            Log::error('Error generating teacher report: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate report'], 500);
        }
    }

    /**
     * PDF Generation Methods
     * Note: Requires barryvdh/laravel-dompdf package
     */
    private function generateStudentListPDF($data)
    {
        try {
            // For now, return the Blade view for PDF generation
            // TODO: Uncomment when barryvdh/laravel-dompdf is installed
            // $pdf = PDF::loadView('reports.student-list', ['reportData' => $data]);
            // $pdf->setPaper('A4', 'landscape');
            // return $pdf->download('student_list_report_' . now()->format('Y-m-d') . '.pdf');
            
            // Temporary: Return HTML view for PDF generation
            return view('reports.student-list', ['reportData' => $data]);
            
        } catch (\Exception $e) {
            Log::error('Error generating student list PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate PDF'], 500);
        }
    }

    private function generateGradesPDF($data)
    {
        // TODO: Install barryvdh/laravel-dompdf package
        return response()->json([
            'error' => 'PDF generation not available',
            'message' => 'Please install barryvdh/laravel-dompdf package',
            'instructions' => 'Run: composer require barryvdh/laravel-dompdf'
        ], 501);
    }

    private function generateSubjectsPDF($data)
    {
        // TODO: Install barryvdh/laravel-dompdf package
        return response()->json([
            'error' => 'PDF generation not available',
            'message' => 'Please install barryvdh/laravel-dompdf package',
            'instructions' => 'Run: composer require barryvdh/laravel-dompdf'
        ], 501);
    }

    private function generateTeacherPDF($data)
    {
        // TODO: Install barryvdh/laravel-dompdf package
        return response()->json([
            'error' => 'PDF generation not available',
            'message' => 'Please install barryvdh/laravel-dompdf package',
            'instructions' => 'Run: composer require barryvdh/laravel-dompdf'
        ], 501);
    }
}
