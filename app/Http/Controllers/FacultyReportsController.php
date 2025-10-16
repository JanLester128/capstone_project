<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Grade;
use App\Models\ClassSchedule;
use App\Models\Section;
use App\Models\Subject;
use App\Models\SchoolYear;

class FacultyReportsController extends Controller
{
    /**
     * Display the faculty reports page
     */
    public function index()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        // Get faculty's classes and subjects
        $facultyClasses = DB::table('class')
            ->join('subjects', 'class.subject_id', '=', 'subjects.id')
            ->join('sections', 'class.section_id', '=', 'sections.id')
            ->where('class.faculty_id', $user->id)
            ->where('class.is_active', true)
            ->select([
                'class.id as class_id',
                'subjects.id as subject_id',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'sections.id as section_id',
                'sections.section_name'
            ])
            ->get();

        $filterOptions = [
            'subjects' => $facultyClasses->unique('subject_id')->map(function($class) {
                return [
                    'id' => $class->subject_id,
                    'name' => $class->subject_name,
                    'code' => $class->subject_code
                ];
            })->values(),
            'sections' => $facultyClasses->unique('section_id')->map(function($class) {
                return [
                    'id' => $class->section_id,
                    'name' => $class->section_name
                ];
            })->values()
        ];

        return Inertia::render('Faculty/Faculty_Reports', [
            'filterOptions' => $filterOptions,
            'activeSchoolYear' => $activeSchoolYear,
            'totalClasses' => $facultyClasses->count(),
            'totalSubjects' => $facultyClasses->unique('subject_id')->count(),
            'totalSections' => $facultyClasses->unique('section_id')->count()
        ]);
    }

    /**
     * Generate student list report for faculty
     */
    public function studentsReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            Log::info('Faculty students report request', [
                'faculty_id' => $user->id,
                'filters' => $request->all()
            ]);

            // First check if faculty has any classes
            $facultyClasses = DB::table('class')
                ->where('faculty_id', $user->id)
                ->where('is_active', true)
                ->count();

            Log::info('Faculty classes count check', [
                'faculty_id' => $user->id,
                'classes_count' => $facultyClasses
            ]);

            if ($facultyClasses === 0) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'total' => 0,
                    'message' => 'No active classes found for this faculty member',
                    'summary' => [
                        'total_students' => 0,
                        'unique_students' => 0,
                        'subjects_taught' => 0,
                        'sections_handled' => 0
                    ]
                ]);
            }

            Log::info('Building main query for faculty students');
            
            $query = DB::table('class_details')
                ->join('class', 'class_details.class_id', '=', 'class.id')
                ->join('users as students', 'class_details.student_id', '=', 'students.id')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('student_personal_info', 'students.id', '=', 'student_personal_info.user_id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('class.faculty_id', $user->id)
                ->where('class.is_active', true)
                ->where('class_details.is_enrolled', true)
                ->where('students.role', 'student');

            Log::info('Query built, applying filters', [
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id
            ]);

            // Apply filters
            if ($request->subject_id) {
                $query->where('class.subject_id', $request->subject_id);
            }

            if ($request->section_id) {
                $query->where('class.section_id', $request->section_id);
            }

            // Log the SQL query for debugging
            $queryWithSelects = $query->select([
                'students.id',
                'students.firstname',
                'students.lastname',
                'students.email',
                'student_personal_info.lrn',
                'student_personal_info.guardian_contact as contact_number', // Fix: use guardian_contact instead of contact_number
                'student_personal_info.address',
                'subjects.id as subject_id',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'sections.id as section_id',
                'sections.section_name',
                'strands.name as strand_name'
            ])
            ->orderBy('sections.section_name')
            ->orderBy('subjects.name')
            ->orderBy('students.lastname')
            ->orderBy('students.firstname');

            Log::info('About to execute faculty students query', [
                'sql' => $queryWithSelects->toSql(),
                'bindings' => $queryWithSelects->getBindings()
            ]);

            $students = $queryWithSelects->get();

            // Fallback: If no students found via class_details, try enrollments approach
            if ($students->isEmpty()) {
                Log::info('No students found via class_details, trying enrollments approach');
                
                // Get sections that this faculty teaches
                $facultySections = DB::table('class')
                    ->where('faculty_id', $user->id)
                    ->where('is_active', true)
                    ->pluck('section_id')
                    ->unique();
                
                if ($facultySections->isNotEmpty()) {
                    $fallbackStudents = DB::table('enrollments as e')
                        ->join('users as students', 'e.student_id', '=', 'students.id')
                        ->join('sections', 'e.assigned_section_id', '=', 'sections.id')
                        ->leftJoin('student_personal_info', 'students.id', '=', 'student_personal_info.user_id')
                        ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                        ->whereIn('e.assigned_section_id', $facultySections)
                        ->whereIn('e.status', ['enrolled', 'approved'])
                        ->where('students.role', 'student')
                        ->select([
                            'students.id',
                            'students.firstname',
                            'students.lastname',
                            'students.email',
                            'student_personal_info.lrn',
                            'student_personal_info.guardian_contact as contact_number', // Fix: use guardian_contact instead of contact_number
                            'student_personal_info.address',
                            DB::raw('NULL as subject_id'),
                            DB::raw('"Multiple Subjects" as subject_name'),
                            DB::raw('""  as subject_code'),
                            'sections.id as section_id',
                            'sections.section_name',
                            'strands.name as strand_name'
                        ])
                        ->distinct()
                        ->get();
                        
                    Log::info('Fallback query results', [
                        'faculty_sections' => $facultySections->toArray(),
                        'fallback_students_found' => $fallbackStudents->count()
                    ]);
                    
                    if ($fallbackStudents->isNotEmpty()) {
                        $students = $fallbackStudents;
                    }
                }
            }

            Log::info('Faculty students report query results', [
                'faculty_id' => $user->id,
                'total_records' => $students->count(),
                'first_record' => $students->first()
            ]);

            if ($request->format === 'excel') {
                return $this->exportToCSV($students, 'faculty_students_report', [
                    'Name' => function($student) { 
                        $firstName = trim($student->firstname ?? '');
                        $lastName = trim($student->lastname ?? '');
                        return trim($firstName . ' ' . $lastName) ?: 'N/A';
                    },
                    'LRN' => 'lrn',
                    'Email' => 'email',
                    'Contact' => 'contact_number',
                    'Address' => 'address',
                    'Subject' => 'subject_name',
                    'Subject Code' => 'subject_code',
                    'Section' => 'section_name',
                    'Strand' => 'strand_name'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $students,
                'total' => $students->count(),
                'summary' => [
                    'total_students' => $students->count(),
                    'unique_students' => $students->unique('id')->count(),
                    'subjects_taught' => $students->unique('subject_id')->count(),
                    'sections_handled' => $students->unique('section_id')->count()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating faculty students report', [
                'error' => $e->getMessage(),
                'faculty_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate students report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate grades report for faculty
     */
    public function gradesReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $query = DB::table('grades')
                ->join('users as students', 'grades.student_id', '=', 'students.id')
                ->join('subjects', 'grades.subject_id', '=', 'subjects.id')
                ->leftJoin('class', 'grades.class_id', '=', 'class.id')
                ->leftJoin('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('student_personal_info', 'students.id', '=', 'student_personal_info.user_id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('grades.faculty_id', $user->id)
                ->where('students.role', 'student');

            // Apply filters
            if ($request->subject_id) {
                $query->where('grades.subject_id', $request->subject_id);
            }

            if ($request->section_id) {
                $query->where('class.section_id', $request->section_id);
            }

            if ($request->semester) {
                $query->where('grades.semester', $request->semester);
            }

            // Filter by grade status (Passed/Failed)
            $gradeThreshold = $request->grade_threshold ?? 75; // Default passing grade is 75
            if ($request->grade_status) {
                switch ($request->grade_status) {
                    case 'passed':
                        $query->where('grades.semester_grade', '>=', $gradeThreshold);
                        Log::info('Faculty grades - filtering for passed grades', [
                            'faculty_id' => $user->id,
                            'threshold' => $gradeThreshold
                        ]);
                        break;
                    case 'failed':
                        $query->where(function($q) use ($gradeThreshold) {
                            $q->where('grades.semester_grade', '<', $gradeThreshold)
                              ->whereNotNull('grades.semester_grade'); // Only include students with actual grades
                        });
                        Log::info('Faculty grades - filtering for failed grades', [
                            'faculty_id' => $user->id,
                            'threshold' => $gradeThreshold
                        ]);
                        break;
                }
            }

            if ($request->quarter) {
                // Filter by specific quarter
                switch ($request->quarter) {
                    case '1st':
                        $query->whereNotNull('grades.first_quarter');
                        break;
                    case '2nd':
                        $query->whereNotNull('grades.second_quarter');
                        break;
                    case '3rd':
                        $query->whereNotNull('grades.third_quarter');
                        break;
                    case '4th':
                        $query->whereNotNull('grades.fourth_quarter');
                        break;
                }
            }

            $grades = $query->select([
                'grades.id',
                'students.firstname as student_firstname',
                'students.lastname as student_lastname',
                'student_personal_info.lrn as student_lrn',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'sections.section_name',
                'strands.name as strand_name',
                'grades.semester',
                'grades.first_quarter',
                'grades.second_quarter',
                'grades.third_quarter',
                'grades.fourth_quarter',
                'grades.semester_grade',
                'grades.status',
                'grades.created_at',
                'grades.updated_at'
            ])
            ->orderBy('sections.section_name')
            ->orderBy('subjects.name')
            ->orderBy('students.lastname')
            ->orderBy('students.firstname')
            ->get()
            ->map(function ($grade) {
                $grade->student_name = $grade->student_firstname . ' ' . $grade->student_lastname;
                return $grade;
            });

            if ($request->format === 'excel') {
                return $this->exportToCSV($grades, 'faculty_grades_report', [
                    'Student Name' => 'student_name',
                    'LRN' => 'student_lrn',
                    'Subject' => 'subject_name',
                    'Subject Code' => 'subject_code',
                    'Section' => 'section_name',
                    'Strand' => 'strand_name',
                    'Semester' => 'semester',
                    'Q1' => 'first_quarter',
                    'Q2' => 'second_quarter',
                    'Q3' => 'third_quarter',
                    'Q4' => 'fourth_quarter',
                    'Semester Grade' => 'semester_grade',
                    'Status' => 'status',
                    'Last Updated' => function($grade) { return $grade->updated_at; }
                ]);
            }

            // Calculate summary statistics
            $summary = [
                'total_grades' => $grades->count(),
                'approved' => $grades->where('status', 'approved')->count(),
                'pending' => $grades->where('status', 'pending_registrar_approval')->count(),
                'average_grade' => $grades->where('semester_grade', '>', 0)->avg('semester_grade'),
                'passed_students' => $grades->where('semester_grade', '>=', 75)->count(),
                'failed_students' => $grades->where('semester_grade', '<', 75)->where('semester_grade', '>', 0)->count(),
                'honor_students' => $grades->where('semester_grade', '>=', 90)->count(),
                'subjects_graded' => $grades->unique('subject_name')->count(),
                'sections_graded' => $grades->unique('section_name')->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $grades,
                'total' => $grades->count(),
                'summary' => $summary
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating faculty grades report', [
                'error' => $e->getMessage(),
                'faculty_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate grades report: ' . $e->getMessage()
            ], 500);
        }
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
                try {
                    if (is_callable($field)) {
                        $value = $field($row);
                    } else {
                        $value = $row->$field ?? 'N/A';
                    }
                    $csvRow[] = $value ?: 'N/A';
                } catch (\Exception $e) {
                    Log::warning('Error processing CSV field', [
                        'field' => $field,
                        'header' => $header,
                        'error' => $e->getMessage()
                    ]);
                    $csvRow[] = 'N/A';
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
