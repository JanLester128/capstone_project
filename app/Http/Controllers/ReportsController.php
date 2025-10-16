<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\ClassSchedule;
use App\Models\Section;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\SchoolYear;

class ReportsController extends Controller
{
    /**
     * Display the registrar reports page
     */
    public function registrarReports()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return redirect()->route('login');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        // Get filter options
        $filterOptions = [
            'strands' => Strand::orderBy('name')->get(['id', 'name', 'code']),
            'sections' => Section::with('strand')->orderBy('section_name')->get(['id', 'section_name', 'strand_id']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name', 'code']),
            'schoolYears' => SchoolYear::orderBy('year_start', 'desc')->get(['id', 'year_start', 'year_end'])
        ];

        // Get basic report data
        $reports = [
            'enrollment_by_strand' => $this->getEnrollmentByStrand($activeSchoolYear),
            'grade_approval_summary' => $this->getGradeApprovalSummary($activeSchoolYear),
            'faculty_summary' => $this->getFacultySummary()
        ];

        return Inertia::render('Registrar/Reports', [
            'reports' => $reports,
            'activeSchoolYear' => $activeSchoolYear,
            'filterOptions' => $filterOptions
        ]);
    }

    /**
     * Generate student list report
     */
    public function studentsReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $query = DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', 'enrollments.strand_id', '=', 'strands.id')
                ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                ->where('users.role', 'student');

            // Apply filters
            if ($request->school_year_id) {
                $query->where('enrollments.school_year_id', $request->school_year_id);
            }

            if ($request->strand_id) {
                $query->where('enrollments.strand_id', $request->strand_id);
            }

            if ($request->section_id) {
                $query->where('enrollments.assigned_section_id', $request->section_id);
            }

            if ($request->enrollment_status) {
                $query->where('enrollments.status', $request->enrollment_status);
            }

            $students = $query->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'student_personal_info.lrn',
                'student_personal_info.contact_number',
                'student_personal_info.address',
                'sections.section_name',
                'strands.name as strand_name',
                'strands.code as strand_code',
                'enrollments.status as enrollment_status',
                'enrollments.grade_level',
                'enrollments.intended_grade_level',
                'school_years.year_start',
                'school_years.year_end'
            ])
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();

            if ($request->format === 'excel') {
                return $this->exportToCSV($students, 'students_report', [
                    'Name' => function($student) { return $student->firstname . ' ' . $student->lastname; },
                    'LRN' => 'lrn',
                    'Email' => 'email',
                    'Contact' => 'contact_number',
                    'Address' => 'address',
                    'Section' => 'section_name',
                    'Strand' => 'strand_name',
                    'Grade Level' => 'grade_level',
                    'Status' => 'enrollment_status',
                    'School Year' => function($student) { return $student->year_start . '-' . $student->year_end; }
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $students,
                'total' => $students->count(),
                'summary' => [
                    'total_students' => $students->count(),
                    'enrolled' => $students->where('enrollment_status', 'enrolled')->count(),
                    'pending' => $students->where('enrollment_status', 'pending')->count(),
                    'approved' => $students->where('enrollment_status', 'approved')->count()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating students report', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate students report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate grades report
     */
    public function gradesReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $query = DB::table('grades')
                ->join('users as students', 'grades.student_id', '=', 'students.id')
                ->join('subjects', 'grades.subject_id', '=', 'subjects.id')
                ->join('users as faculty', 'grades.faculty_id', '=', 'faculty.id')
                ->leftJoin('student_personal_info', 'students.id', '=', 'student_personal_info.user_id')
                ->leftJoin('class', 'grades.class_id', '=', 'class.id')
                ->leftJoin('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('students.role', 'student');

            // Apply filters
            if ($request->school_year_id) {
                $query->where('grades.school_year_id', $request->school_year_id);
            }

            if ($request->strand_id) {
                $query->where('sections.strand_id', $request->strand_id);
            }

            if ($request->section_id) {
                $query->where('class.section_id', $request->section_id);
            }

            if ($request->semester) {
                $query->where('grades.semester', $request->semester);
            }

            $grades = $query->select([
                'grades.id',
                'students.firstname as student_firstname',
                'students.lastname as student_lastname',
                'student_personal_info.lrn as student_lrn',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'faculty.firstname as faculty_firstname',
                'faculty.lastname as faculty_lastname',
                'sections.section_name',
                'strands.name as strand_name',
                'grades.semester',
                'grades.first_quarter',
                'grades.second_quarter',
                'grades.third_quarter',
                'grades.fourth_quarter',
                'grades.semester_grade',
                'grades.status'
            ])
            ->orderBy('students.lastname')
            ->orderBy('students.firstname')
            ->orderBy('subjects.name')
            ->get()
            ->map(function ($grade) {
                $grade->student_name = $grade->student_firstname . ' ' . $grade->student_lastname;
                $grade->faculty_name = $grade->faculty_firstname . ' ' . $grade->faculty_lastname;
                return $grade;
            });

            if ($request->format === 'excel') {
                return $this->exportToCSV($grades, 'grades_report', [
                    'Student Name' => 'student_name',
                    'LRN' => 'student_lrn',
                    'Subject' => 'subject_name',
                    'Subject Code' => 'subject_code',
                    'Faculty' => 'faculty_name',
                    'Section' => 'section_name',
                    'Strand' => 'strand_name',
                    'Semester' => 'semester',
                    'Q1' => 'first_quarter',
                    'Q2' => 'second_quarter',
                    'Q3' => 'third_quarter',
                    'Q4' => 'fourth_quarter',
                    'Semester Grade' => 'semester_grade',
                    'Status' => 'status'
                ]);
            }

            // Calculate summary
            $summary = [
                'total_grades' => $grades->count(),
                'approved' => $grades->where('status', 'approved')->count(),
                'pending' => $grades->where('status', 'pending_registrar_approval')->count(),
                'average_grade' => $grades->where('semester_grade', '>', 0)->avg('semester_grade'),
                'passed_students' => $grades->where('semester_grade', '>=', 75)->count(),
                'failed_students' => $grades->where('semester_grade', '<', 75)->where('semester_grade', '>', 0)->count(),
                'honor_students' => $grades->where('semester_grade', '>=', 90)->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $grades,
                'total' => $grades->count(),
                'summary' => $summary
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating grades report', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate grades report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate faculty loads report
     */
    public function facultyLoadsReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'registrar') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $query = DB::table('class')
                ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->leftJoin('school_years', 'class.school_year_id', '=', 'school_years.id')
                ->where('faculty.role', 'faculty')
                ->where('class.is_active', true);

            // Apply filters
            if ($request->school_year_id) {
                $query->where('class.school_year_id', $request->school_year_id);
            }

            if ($request->semester) {
                $query->where('class.semester', $request->semester);
            }

            $facultyLoads = $query->select([
                'faculty.id as faculty_id',
                'faculty.firstname as faculty_firstname',
                'faculty.lastname as faculty_lastname',
                'faculty.email as faculty_email',
                'faculty.is_coordinator',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'sections.section_name',
                'strands.name as strand_name',
                'class.day_of_week',
                'class.start_time',
                'class.end_time',
                'class.semester',
                'school_years.year_start',
                'school_years.year_end'
            ])
            ->orderBy('faculty.lastname')
            ->orderBy('faculty.firstname')
            ->orderBy('subjects.name')
            ->get()
            ->map(function ($load) {
                $load->faculty_name = $load->faculty_firstname . ' ' . $load->faculty_lastname;
                return $load;
            });

            // Group by faculty for summary
            $facultySummary = $facultyLoads->groupBy('faculty_id')->map(function ($loads, $facultyId) {
                $firstLoad = $loads->first();
                return [
                    'faculty_id' => $facultyId,
                    'faculty_name' => $firstLoad->faculty_name,
                    'faculty_email' => $firstLoad->faculty_email,
                    'is_coordinator' => $firstLoad->is_coordinator,
                    'total_subjects' => $loads->count(),
                    'total_sections' => $loads->pluck('section_name')->unique()->count(),
                    'subjects' => $loads->pluck('subject_name')->unique()->values(),
                    'sections' => $loads->pluck('section_name')->unique()->values()
                ];
            })->values();

            if ($request->format === 'excel') {
                return $this->exportToCSV($facultyLoads, 'faculty_loads_report', [
                    'Faculty Name' => 'faculty_name',
                    'Email' => 'faculty_email',
                    'Is Coordinator' => function($load) { return $load->is_coordinator ? 'Yes' : 'No'; },
                    'Subject' => 'subject_name',
                    'Subject Code' => 'subject_code',
                    'Section' => 'section_name',
                    'Strand' => 'strand_name',
                    'Day' => 'day_of_week',
                    'Start Time' => 'start_time',
                    'End Time' => 'end_time',
                    'Semester' => 'semester',
                    'School Year' => function($load) { return $load->year_start . '-' . $load->year_end; }
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $facultyLoads,
                'total' => $facultyLoads->count(),
                'faculty_summary' => $facultySummary,
                'summary' => [
                    'total_faculty' => $facultySummary->count(),
                    'total_assignments' => $facultyLoads->count(),
                    'coordinators' => $facultySummary->where('is_coordinator', true)->count(),
                    'average_load' => $facultySummary->avg('total_subjects')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating faculty loads report', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate faculty loads report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method to get enrollment by strand
     */
    private function getEnrollmentByStrand($schoolYear)
    {
        if (!$schoolYear) return [];

        return DB::table('enrollments')
            ->join('strands', 'enrollments.strand_id', '=', 'strands.id')
            ->where('enrollments.school_year_id', $schoolYear->id)
            ->select([
                'strands.name',
                'strands.code',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN enrollments.status = "enrolled" THEN 1 ELSE 0 END) as approved'),
                DB::raw('SUM(CASE WHEN enrollments.status = "pending" THEN 1 ELSE 0 END) as pending')
            ])
            ->groupBy('strands.id', 'strands.name', 'strands.code')
            ->orderBy('strands.name')
            ->get();
    }

    /**
     * Helper method to get grade approval summary
     */
    private function getGradeApprovalSummary($schoolYear)
    {
        if (!$schoolYear) return [];

        return DB::table('grades')
            ->where('grades.school_year_id', $schoolYear->id)
            ->select([
                'grades.status',
                DB::raw('COUNT(*) as count')
            ])
            ->groupBy('grades.status')
            ->get();
    }

    /**
     * Helper method to get faculty summary
     */
    private function getFacultySummary()
    {
        return [
            'total_faculty' => User::where('role', 'faculty')->count(),
            'coordinators' => User::where('role', 'faculty')->where('is_coordinator', true)->count(),
            'password_change_required' => User::where('role', 'faculty')->where('password_changed', false)->count()
        ];
    }

    /**
     * Helper method to export data to CSV
     */
    private function exportToCSV($data, $filename, $columns)
    {
        $csvData = [];
        
        // Add header row
        $csvData[] = array_keys($columns);
        
        // Add data rows
        foreach ($data as $row) {
            $csvRow = [];
            foreach ($columns as $header => $field) {
                if (is_callable($field)) {
                    $csvRow[] = $field($row);
                } else {
                    $csvRow[] = $row->$field ?? '';
                }
            }
            $csvData[] = $csvRow;
        }
        
        // Create CSV content
        $output = fopen('php://temp', 'r+');
        foreach ($csvData as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);
        
        return response($csvContent)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '_' . date('Y-m-d') . '.csv"');
    }
}
