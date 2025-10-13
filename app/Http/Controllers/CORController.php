<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Enrollment;
use App\Models\Section;
use App\Models\Subject;
use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class CORController extends Controller
{
    /**
     * Display COR for a student based on their assigned section schedules
     */
    public function viewCOR($studentId)
    {
        try {
            // Get student and validate access
            $student = User::where('id', $studentId)
                ->where('role', 'student')
                ->firstOrFail();

            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            // Get student's enrollment and assigned section
            $enrollment = Enrollment::where('student_id', $studentId)
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('status', 'enrolled')
                ->first();

            if (!$enrollment || !$enrollment->assigned_section_id) {
                return response()->json(['error' => 'Student not enrolled or not assigned to a section'], 404);
            }

            // Get section details
            $section = Section::with('strand')->find($enrollment->assigned_section_id);
            if (!$section) {
                return response()->json(['error' => 'Section not found'], 404);
            }

            // Get student personal info
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $studentId)
                ->first();

            // Get all schedules for the student's section grouped by semester
            $schedules = $this->getSectionSchedules($section->id, $activeSchoolYear->id);

            // Build COR data
            $corData = [
                'student' => [
                    'id' => $student->id,
                    'firstname' => $student->firstname,
                    'lastname' => $student->lastname,
                    'middlename' => $student->middlename ?? '',
                    'lrn' => $studentPersonalInfo->lrn ?? 'Not provided',
                    'grade_level' => $enrollment->grade_level ?? 'Grade 11',
                ],
                'section' => $section,
                'strand' => $section->strand,
                'school_year' => $activeSchoolYear,
                'schedules' => $schedules,
                'generated_date' => now()->format('F d, Y'),
                'enrollment' => $enrollment
            ];

            Log::info('COR generated for student', [
                'student_id' => $studentId,
                'section_id' => $section->id,
                'schedules_count' => [
                    '1st_semester' => count($schedules['first_semester'] ?? []),
                    '2nd_semester' => count($schedules['second_semester'] ?? [])
                ]
            ]);

            return Inertia::render('Student/CORView', $corData);

        } catch (\Exception $e) {
            Log::error('Error generating COR', [
                'student_id' => $studentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json(['error' => 'Failed to generate COR'], 500);
        }
    }

    /**
     * Generate and download COR as PDF
     */
    public function generateCORPDF($studentId)
    {
        try {
            // Get the same data as viewCOR
            $student = User::where('id', $studentId)
                ->where('role', 'student')
                ->firstOrFail();

            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            $enrollment = Enrollment::where('student_id', $studentId)
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('status', 'enrolled')
                ->first();

            if (!$enrollment || !$enrollment->assigned_section_id) {
                return response()->json(['error' => 'Student not enrolled or not assigned to a section'], 404);
            }

            $section = Section::with('strand')->find($enrollment->assigned_section_id);
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $studentId)
                ->first();

            $schedules = $this->getSectionSchedules($section->id, $activeSchoolYear->id);

            $corData = [
                'student' => [
                    'id' => $student->id,
                    'firstname' => $student->firstname,
                    'lastname' => $student->lastname,
                    'middlename' => $student->middlename ?? '',
                    'lrn' => $studentPersonalInfo->lrn ?? 'Not provided',
                    'grade_level' => $enrollment->grade_level ?? 'Grade 11',
                ],
                'section' => $section,
                'strand' => $section->strand,
                'school_year' => $activeSchoolYear,
                'schedules' => $schedules,
                'generated_date' => now()->format('F d, Y'),
                'enrollment' => $enrollment
            ];

            // Generate PDF using Blade view
            $pdf = Pdf::loadView('cor.certificate', $corData);
            $pdf->setPaper('A4', 'portrait');

            $filename = "COR_{$student->lastname}_{$student->firstname}_{$activeSchoolYear->year_start}-{$activeSchoolYear->year_end}.pdf";

            // Update enrollment to mark COR as generated
            $enrollment->update([
                'cor_generated' => true,
                'cor_generated_at' => now()
            ]);

            Log::info('COR PDF generated', [
                'student_id' => $studentId,
                'filename' => $filename
            ]);

            return $pdf->download($filename);

        } catch (\Exception $e) {
            Log::error('Error generating COR PDF', [
                'student_id' => $studentId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json(['error' => 'Failed to generate COR PDF'], 500);
        }
    }

    /**
     * Get all schedules for a section grouped by semester using the existing class table
     */
    private function getSectionSchedules($sectionId, $schoolYearId)
    {
        // Get all class schedules for this section from the existing 'class' table
        $schedules = DB::table('class')
            ->join('subjects', 'class.subject_id', '=', 'subjects.id')
            ->leftJoin('users as teachers', 'class.faculty_id', '=', 'teachers.id')
            ->where('class.section_id', $sectionId)
            ->where('class.school_year_id', $schoolYearId)
            ->where('class.is_active', true)
            ->select([
                'subjects.subject_code',
                'subjects.subject_name',
                'subjects.units',
                'class.semester',
                'class.day_of_week',
                'class.start_time',
                'class.end_time',
                'class.room',
                'teachers.firstname as teacher_firstname',
                'teachers.lastname as teacher_lastname'
            ])
            ->orderBy('class.semester')
            ->orderBy('subjects.subject_code')
            ->get();

        // Group by semester
        $groupedSchedules = [
            'first_semester' => [],
            'second_semester' => []
        ];

        foreach ($schedules as $schedule) {
            $semesterKey = $schedule->semester === '1st Semester' ? 'first_semester' : 'second_semester';
            
            $subjectCode = $schedule->subject_code;
            
            // Build teacher name
            $teacherName = 'TBA';
            if ($schedule->teacher_firstname && $schedule->teacher_lastname) {
                $teacherName = $schedule->teacher_firstname . ' ' . $schedule->teacher_lastname;
            }
            
            // If subject already exists, add this schedule to it
            if (isset($groupedSchedules[$semesterKey][$subjectCode])) {
                $groupedSchedules[$semesterKey][$subjectCode]['schedules'][] = [
                    'day' => $schedule->day_of_week,
                    'time' => $schedule->start_time . ' - ' . $schedule->end_time,
                    'room' => $schedule->room
                ];
            } else {
                // Create new subject entry
                $groupedSchedules[$semesterKey][$subjectCode] = [
                    'subject_code' => $schedule->subject_code,
                    'subject_name' => $schedule->subject_name,
                    'units' => $schedule->units,
                    'teacher' => $teacherName,
                    'schedules' => [[
                        'day' => $schedule->day_of_week,
                        'time' => $schedule->start_time . ' - ' . $schedule->end_time,
                        'room' => $schedule->room
                    ]]
                ];
            }
        }

        // Convert to indexed arrays for easier iteration in views
        return [
            'first_semester' => array_values($groupedSchedules['first_semester']),
            'second_semester' => array_values($groupedSchedules['second_semester'])
        ];
    }

    /**
     * Get section schedules API endpoint for frontend
     */
    public function getSectionSchedulesAPI($sectionId)
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            $schedules = $this->getSectionSchedules($sectionId, $activeSchoolYear->id);
            
            return response()->json([
                'success' => true,
                'schedules' => $schedules,
                'school_year' => $activeSchoolYear
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching section schedules', [
                'section_id' => $sectionId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json(['error' => 'Failed to fetch schedules'], 500);
        }
    }
}
