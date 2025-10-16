<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Enrollment;
use App\Models\Section;
use App\Models\Strand;
use App\Models\SchoolYear;

class CoordinatorReportsController extends Controller
{
    /**
     * Display the coordinator reports page
     */
    public function index()
    {
        $user = Auth::user();
        
        if (!$user || (!$user->is_coordinator && $user->role !== 'coordinator')) {
            return redirect()->route('login');
        }

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        // Get filter options
        $filterOptions = [
            'strands' => Strand::orderBy('name')->get(['id', 'name', 'code']),
            'sections' => Section::with('strand')->orderBy('section_name')->get(['id', 'section_name', 'strand_id']),
            'schoolYears' => SchoolYear::orderBy('year_start', 'desc')->get(['id', 'year_start', 'year_end'])
        ];

        // Get basic statistics
        $stats = [
            'total_enrolled' => $this->getTotalEnrolledStudents($activeSchoolYear),
            'enrollment_by_strand' => $this->getEnrollmentByStrand($activeSchoolYear),
            'enrollment_by_section' => $this->getEnrollmentBySection($activeSchoolYear)
        ];

        return Inertia::render('Faculty/Coordinator_Reports', [
            'filterOptions' => $filterOptions,
            'activeSchoolYear' => $activeSchoolYear,
            'stats' => $stats
        ]);
    }

    /**
     * Generate enrolled students report
     */
    public function enrolledStudentsReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || (!$user->is_coordinator && $user->role !== 'coordinator')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $query = DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', 'enrollments.strand_id', '=', 'strands.id')
                ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                ->where('users.role', 'student')
                ->where('enrollments.status', 'enrolled'); // Only enrolled students

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

            if ($request->grade_level) {
                $query->where('enrollments.grade_level', $request->grade_level);
            }

            $students = $query->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'student_personal_info.lrn',
                'student_personal_info.contact_number',
                'student_personal_info.address',
                'student_personal_info.guardian_name',
                'student_personal_info.guardian_contact',
                'sections.section_name',
                'strands.name as strand_name',
                'strands.code as strand_code',
                'enrollments.grade_level',
                'enrollments.intended_grade_level',
                'enrollments.created_at as enrollment_date',
                'school_years.year_start',
                'school_years.year_end'
            ])
            ->orderBy('strands.name')
            ->orderBy('sections.section_name')
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();

            if ($request->format === 'excel') {
                return $this->exportToCSV($students, 'enrolled_students_report', [
                    'Name' => function($student) { return $student->firstname . ' ' . $student->lastname; },
                    'LRN' => 'lrn',
                    'Email' => 'email',
                    'Contact' => 'contact_number',
                    'Address' => 'address',
                    'Guardian' => 'guardian_name',
                    'Guardian Contact' => 'guardian_contact',
                    'Section' => 'section_name',
                    'Strand' => 'strand_name',
                    'Grade Level' => 'grade_level',
                    'Enrollment Date' => function($student) { return date('Y-m-d', strtotime($student->enrollment_date)); },
                    'School Year' => function($student) { return $student->year_start . '-' . $student->year_end; }
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $students,
                'total' => $students->count(),
                'summary' => [
                    'total_enrolled' => $students->count(),
                    'by_strand' => $students->groupBy('strand_name')->map->count(),
                    'by_section' => $students->groupBy('section_name')->map->count(),
                    'by_grade_level' => $students->groupBy('grade_level')->map->count()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating enrolled students report', [
                'error' => $e->getMessage(),
                'coordinator_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate enrolled students report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate students by strand report
     */
    public function studentsByStrandReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || (!$user->is_coordinator && $user->role !== 'coordinator')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $query = DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->join('strands', 'enrollments.strand_id', '=', 'strands.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                ->where('users.role', 'student')
                ->where('enrollments.status', 'enrolled');

            // Apply filters
            if ($request->school_year_id) {
                $query->where('enrollments.school_year_id', $request->school_year_id);
            }

            if ($request->strand_id) {
                $query->where('enrollments.strand_id', $request->strand_id);
            }

            $students = $query->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'student_personal_info.lrn',
                'student_personal_info.contact_number',
                'sections.section_name',
                'strands.id as strand_id',
                'strands.name as strand_name',
                'strands.code as strand_code',
                'enrollments.grade_level',
                'enrollments.created_at as enrollment_date',
                'school_years.year_start',
                'school_years.year_end'
            ])
            ->orderBy('strands.name')
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();

            // Group by strand for better organization
            $strandGroups = $students->groupBy('strand_name')->map(function ($strandStudents, $strandName) {
                $firstStudent = $strandStudents->first();
                return [
                    'strand_id' => $firstStudent->strand_id,
                    'strand_name' => $strandName,
                    'strand_code' => $firstStudent->strand_code,
                    'student_count' => $strandStudents->count(),
                    'grade_11_count' => $strandStudents->where('grade_level', 'Grade 11')->count(),
                    'grade_12_count' => $strandStudents->where('grade_level', 'Grade 12')->count(),
                    'students' => $strandStudents->values()
                ];
            });

            if ($request->format === 'excel') {
                return $this->exportToCSV($students, 'students_by_strand_report', [
                    'Name' => function($student) { return $student->firstname . ' ' . $student->lastname; },
                    'LRN' => 'lrn',
                    'Email' => 'email',
                    'Contact' => 'contact_number',
                    'Strand' => 'strand_name',
                    'Strand Code' => 'strand_code',
                    'Section' => 'section_name',
                    'Grade Level' => 'grade_level',
                    'Enrollment Date' => function($student) { return date('Y-m-d', strtotime($student->enrollment_date)); },
                    'School Year' => function($student) { return $student->year_start . '-' . $student->year_end; }
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $students,
                'strand_groups' => $strandGroups,
                'total' => $students->count(),
                'summary' => [
                    'total_students' => $students->count(),
                    'total_strands' => $strandGroups->count(),
                    'strand_distribution' => $strandGroups->pluck('student_count', 'strand_name')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating students by strand report', [
                'error' => $e->getMessage(),
                'coordinator_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate students by strand report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate students by section report
     */
    public function studentsBySectionReport(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || (!$user->is_coordinator && $user->role !== 'coordinator')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $query = DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->join('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                ->where('users.role', 'student')
                ->where('enrollments.status', 'enrolled');

            // Apply filters
            if ($request->school_year_id) {
                $query->where('enrollments.school_year_id', $request->school_year_id);
            }

            if ($request->section_id) {
                $query->where('enrollments.assigned_section_id', $request->section_id);
            }

            if ($request->strand_id) {
                $query->where('sections.strand_id', $request->strand_id);
            }

            $students = $query->select([
                'users.id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'student_personal_info.lrn',
                'student_personal_info.contact_number',
                'sections.id as section_id',
                'sections.section_name',
                'sections.capacity',
                'strands.name as strand_name',
                'strands.code as strand_code',
                'enrollments.grade_level',
                'enrollments.created_at as enrollment_date',
                'school_years.year_start',
                'school_years.year_end'
            ])
            ->orderBy('sections.section_name')
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->get();

            // Group by section for better organization
            $sectionGroups = $students->groupBy('section_name')->map(function ($sectionStudents, $sectionName) {
                $firstStudent = $sectionStudents->first();
                return [
                    'section_id' => $firstStudent->section_id,
                    'section_name' => $sectionName,
                    'strand_name' => $firstStudent->strand_name,
                    'strand_code' => $firstStudent->strand_code,
                    'capacity' => $firstStudent->capacity,
                    'enrolled_count' => $sectionStudents->count(),
                    'available_slots' => $firstStudent->capacity - $sectionStudents->count(),
                    'grade_11_count' => $sectionStudents->where('grade_level', 'Grade 11')->count(),
                    'grade_12_count' => $sectionStudents->where('grade_level', 'Grade 12')->count(),
                    'students' => $sectionStudents->values()
                ];
            });

            if ($request->format === 'excel') {
                return $this->exportToCSV($students, 'students_by_section_report', [
                    'Name' => function($student) { return $student->firstname . ' ' . $student->lastname; },
                    'LRN' => 'lrn',
                    'Email' => 'email',
                    'Contact' => 'contact_number',
                    'Section' => 'section_name',
                    'Strand' => 'strand_name',
                    'Strand Code' => 'strand_code',
                    'Grade Level' => 'grade_level',
                    'Enrollment Date' => function($student) { return date('Y-m-d', strtotime($student->enrollment_date)); },
                    'School Year' => function($student) { return $student->year_start . '-' . $student->year_end; }
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $students,
                'section_groups' => $sectionGroups,
                'total' => $students->count(),
                'summary' => [
                    'total_students' => $students->count(),
                    'total_sections' => $sectionGroups->count(),
                    'section_distribution' => $sectionGroups->pluck('enrolled_count', 'section_name'),
                    'capacity_utilization' => $sectionGroups->map(function($section) {
                        return [
                            'section' => $section['section_name'],
                            'utilization' => $section['capacity'] > 0 ? round(($section['enrolled_count'] / $section['capacity']) * 100, 1) : 0
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating students by section report', [
                'error' => $e->getMessage(),
                'coordinator_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate students by section report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method to get total enrolled students
     */
    private function getTotalEnrolledStudents($schoolYear)
    {
        if (!$schoolYear) return 0;

        return DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->where('enrollments.school_year_id', $schoolYear->id)
            ->where('enrollments.status', 'enrolled')
            ->where('users.role', 'student')
            ->count();
    }

    /**
     * Helper method to get enrollment by strand
     */
    private function getEnrollmentByStrand($schoolYear)
    {
        if (!$schoolYear) return [];

        return DB::table('enrollments')
            ->join('strands', 'enrollments.strand_id', '=', 'strands.id')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->where('enrollments.school_year_id', $schoolYear->id)
            ->where('enrollments.status', 'enrolled')
            ->where('users.role', 'student')
            ->select([
                'strands.name',
                'strands.code',
                DB::raw('COUNT(*) as enrolled_count')
            ])
            ->groupBy('strands.id', 'strands.name', 'strands.code')
            ->orderBy('strands.name')
            ->get();
    }

    /**
     * Helper method to get enrollment by section
     */
    private function getEnrollmentBySection($schoolYear)
    {
        if (!$schoolYear) return [];

        return DB::table('enrollments')
            ->join('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
            ->where('enrollments.school_year_id', $schoolYear->id)
            ->where('enrollments.status', 'enrolled')
            ->where('users.role', 'student')
            ->select([
                'sections.section_name',
                'sections.capacity',
                'strands.name as strand_name',
                DB::raw('COUNT(*) as enrolled_count')
            ])
            ->groupBy('sections.id', 'sections.section_name', 'sections.capacity', 'strands.name')
            ->orderBy('sections.section_name')
            ->get();
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
