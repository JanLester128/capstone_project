<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Subject;
use App\Models\Strand;
use App\Models\Section;
use App\Models\Student;
use App\Models\SchoolYear;
use App\Models\StudentPersonalInfo;
use App\Models\Enrollment;
use App\Models\ClassSchedule;
use App\Models\ClassDetail;
use App\Models\Notification;
use App\Models\Registrar;
use App\Models\Coordinator;
use App\Models\Semester;
use App\Services\SchoolYearService;

class RegistrarController extends Controller
{
    /**
     * Toggle whether faculty can print COR for the active school year
     */
    public function toggleFacultyCorPrint(Request $request)
    {
        try {
            $active = SchoolYear::where('is_active', true)->first();
            if (!$active) {
                return redirect()->back()->withErrors(['general' => 'No active school year found.']);
            }

            $new = !((bool)$active->allow_faculty_cor_print);
            $active->update(['allow_faculty_cor_print' => $new]);

            $msg = $new ? 'Faculty COR printing has been enabled.' : 'Faculty COR printing has been disabled.';
            return redirect()->back()->with('success', $msg);
        } catch (\Exception $e) {
            Log::error('toggleFacultyCorPrint error: '.$e->getMessage());
            return redirect()->back()->withErrors(['general' => 'Failed to update setting.']);
        }
    }
    public function sectionCOR($sectionId, $studentId = null)
    {
        $section = Section::with(['strand'])->findOrFail($sectionId);
        $activeSchoolYear = SchoolYear::getActive();

        if (!$activeSchoolYear) {
            return redirect()->back()->with('error', 'No active school year found. Please set an active school year first.');
        }

        // Get actual scheduled subjects for this section from class table
        // Filter by active school year and current semester
        $scheduledSubjects = DB::table('class')
            ->join('subjects', 'class.subject_id', '=', 'subjects.id')
            ->join('users', 'class.faculty_id', '=', 'users.id')
            ->where('class.school_year_id', $activeSchoolYear->id)
            ->where('subjects.school_year_id', $activeSchoolYear->id)
            ->where('subjects.semester', $activeSchoolYear->current_semester ?? 1)
            ->where('class.is_active', true)
            ->select(
                'subjects.*',
                'class.day_of_week',
                'class.start_time',
                'class.end_time',
                'class.semester',
                'users.name as faculty_name'
            )
            ->orderBy('subjects.year_level')
            ->orderBy('subjects.semester')
            ->orderBy('subjects.name')
            ->get();

        // Group subjects by year level and semester
        $subjectsByYear = $scheduledSubjects->groupBy('year_level');

        // Get all sections for dropdown
        $sections = Section::with('strand')->orderBy('section_name')->get();

        return Inertia::render('Registrar/SectionCOR', [
            'section' => $section,
            'subjectsByYear' => $subjectsByYear,
            'activeSchoolYear' => $activeSchoolYear,
            'sections' => $sections,
            'scheduledSubjects' => $scheduledSubjects
        ]);
    }

    // Classes Management Method
    public function classesPage()
    {
        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        if (!$activeSchoolYear) {
            return Inertia::render('Registrar/RegistrarClass', [
                'strands' => Strand::orderBy('name')->get(),
                'faculties' => User::whereIn('role', ['faculty', 'coordinator'])->get(),
                'sections' => Section::with(['strand', 'adviser'])->orderBy('section_name')->get(),
                'classSchedules' => [],
                'activeSchoolYear' => null,
                'message' => 'No active school year found. Please create and activate a school year first.'
            ]);
        }

        // Get all strands for class assignment
        $strands = Strand::with(['subjects' => function ($query) use ($activeSchoolYear) {
            $query->where('school_year_id', $activeSchoolYear->id);
        }])->orderBy('name')->get();

        // Get all faculties for teacher assignment
        $faculties = User::whereIn('role', ['faculty', 'coordinator'])
            ->select('id', 'firstname', 'lastname', 'email', 'role', 'assigned_strand_id')
            ->get();

        // Get faculties grouped by strand for filtering
        $facultiesByStrand = User::whereIn('role', ['faculty', 'coordinator'])
            ->whereNotNull('assigned_strand_id')
            ->with('assignedStrand')
            ->get()
            ->groupBy('assigned_strand_id')
            ->map(function ($strandFaculties) {
                return $strandFaculties->map(function ($faculty) {
                    return [
                        'id' => $faculty->id,
                        'name' => $faculty->firstname . ' ' . $faculty->lastname,
                        'firstname' => $faculty->firstname,
                        'lastname' => $faculty->lastname,
                        'email' => $faculty->email,
                        'role' => $faculty->role,
                        'assigned_strand_id' => $faculty->assigned_strand_id
                    ];
                });
            });

        // Debug: Log the faculty data to see what's happening
        Log::info('Faculties data:', [
            'total_faculties' => $faculties->count(),
            'faculties_with_strand' => $faculties->whereNotNull('assigned_strand_id')->count(),
            'facultiesByStrand_keys' => array_keys($facultiesByStrand->toArray()),
            'sample_faculty' => $faculties->first() ? $faculties->first()->toArray() : null
        ]);

        // Get all sections for class assignment
        $sections = Section::with(['strand', 'adviser'])->orderBy('section_name')->get();

        // Debug: Check all schedules in database
        $allSchedules = ClassSchedule::all();
        $schedulesWithoutYear = $allSchedules->whereNull('school_year_id');
        
        Log::info('All schedules in database', [
            'total_count' => $allSchedules->count(),
            'schedules_with_school_year' => $allSchedules->whereNotNull('school_year_id')->count(),
            'schedules_without_school_year' => $schedulesWithoutYear->count(),
            'active_school_year_id' => $activeSchoolYear->id,
            'schedules_by_year' => $allSchedules->groupBy('school_year_id')->map->count()->toArray()
        ]);

        // Fix orphaned schedules (schedules without school_year_id)
        if ($schedulesWithoutYear->count() > 0) {
            Log::info('Found orphaned schedules, these need manual assignment', [
                'orphaned_count' => $schedulesWithoutYear->count(),
                'active_year_id' => $activeSchoolYear->id,
                'orphaned_schedule_ids' => $schedulesWithoutYear->pluck('id')->toArray()
            ]);
            
            // Don't auto-assign orphaned schedules to avoid data confusion
            // Instead, log them for manual review
        }

        // Get class schedules with relationships - only for active school year
        $classSchedules = ClassSchedule::with(['subject.strand', 'faculty', 'section'])
            ->where('school_year_id', $activeSchoolYear->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        Log::info('Filtered schedules for active year', [
            'active_year_schedules' => $classSchedules->count(),
            'active_school_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end
        ]);

        $classSchedules = $classSchedules->map(function ($schedule) {
                return [
                    'id' => $schedule->id,
                    'subject_name' => $schedule->subject ? $schedule->subject->name : 'No Subject',
                    'subject_code' => $schedule->subject ? $schedule->subject->code : 'N/A',
                    'strand_name' => $schedule->subject && $schedule->subject->strand ? $schedule->subject->strand->name : 'No Strand',
                    'faculty_name' => $schedule->faculty ? $schedule->faculty->firstname . ' ' . $schedule->faculty->lastname : 'No Faculty',
                    'section_name' => $schedule->section ? $schedule->section->section_name : 'No Section',
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'semester' => $schedule->semester,
                    'is_active' => $schedule->is_active
                ];
            });

        return Inertia::render('Registrar/RegistrarClass', [
            'strands' => $strands,
            'faculties' => $faculties,
            'sections' => $sections,
            'classSchedules' => $classSchedules,
            'activeSchoolYear' => $activeSchoolYear,
            'facultiesByStrand' => $facultiesByStrand
        ]);
    }

    public function createSchoolYear(Request $request)
    {
        $validated = $request->validate([
            'year_start' => 'required|integer|min:2020|max:2050',
            'year_end' => 'required|integer|min:2020|max:2050',
            'semester' => 'required|in:Full Academic Year,Summer',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'enrollment_start' => 'nullable|date',
            'enrollment_end' => 'nullable|date|after:enrollment_start',
        ]);

        // Validate 10-month duration for Full Academic Year
        if ($validated['semester'] === 'Full Academic Year') {
            $startDate = \Carbon\Carbon::parse($validated['start_date']);
            $endDate = \Carbon\Carbon::parse($validated['end_date']);
            
            // Calculate duration in months
            $durationInMonths = $startDate->diffInMonths($endDate);
            
            if ($durationInMonths < 10) {
                return redirect()->back()->withErrors([
                    'end_date' => 'Full Academic Year must be at least 10 months duration. Current duration: ' . $durationInMonths . ' months.'
                ]);
            }
            
            if ($durationInMonths > 11) {
                return redirect()->back()->withErrors([
                    'end_date' => 'Full Academic Year cannot exceed 11 months duration. Current duration: ' . $durationInMonths . ' months.'
                ]);
            }
        }

        // Weekend Validation temporarily removed for testing
        $startDate = \Carbon\Carbon::parse($validated['start_date']);
        $endDate = \Carbon\Carbon::parse($validated['end_date']);
        
        // Weekend validation commented out for testing purposes
        // if ($startDate->dayOfWeek === 0 || $startDate->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'start_date' => 'Start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }
        // 
        // if ($endDate->dayOfWeek === 0 || $endDate->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'end_date' => 'End date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }

        // Validate enrollment window (1 week minimum, 2 weeks maximum)
        $diffDays = $startDate->diffInDays($endDate);

        if ($diffDays < 7) {
            return redirect()->back()->withErrors([
                'end_date' => "Enrollment period must be at least 1 week (7 days). Current period: {$diffDays} days."
            ]);
        }

        if ($diffDays > 14) {
            return redirect()->back()->withErrors([
                'end_date' => "Enrollment period cannot exceed 2 weeks (14 days). Current period: {$diffDays} days."
            ]);
        }

        // Handle Full Academic Year creation
        if ($validated['semester'] === 'Full Academic Year') {
            return $this->createFullAcademicYear($request);
        }

        // Handle Summer semester creation
        if ($validated['semester'] === 'Summer') {
            return $this->createSummerSemester($request);
        }

        return redirect()->back()->withErrors(['semester' => 'Invalid semester type selected.']);
    }

    /**
     * Create Summer semester for students with failed subjects
     */
    public function createSummerSemester(Request $request)
    {
        $validated = $request->validate([
            'year_start' => 'required|integer|min:2020|max:2050',
            'year_end' => 'required|integer|min:2020|max:2050',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'enrollment_start' => 'nullable|date',
            'enrollment_end' => 'nullable|date|after:enrollment_start',
        ]);

        // Weekend Validation temporarily removed for testing
        $startDate = \Carbon\Carbon::parse($validated['start_date']);
        $endDate = \Carbon\Carbon::parse($validated['end_date']);
        
        // Weekend validation commented out for testing purposes
        // if ($startDate->dayOfWeek === 0 || $startDate->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'start_date' => 'Summer start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }
        // 
        // if ($endDate->dayOfWeek === 0 || $endDate->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'end_date' => 'Summer end date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }

        // Validate enrollment window (1 week minimum, 2 weeks maximum)
        $diffDays = $startDate->diffInDays($endDate);

        if ($diffDays < 7) {
            return redirect()->back()->withErrors([
                'end_date' => "Summer enrollment period must be at least 1 week (7 days). Current period: {$diffDays} days."
            ]);
        }

        if ($diffDays > 14) {
            return redirect()->back()->withErrors([
                'end_date' => "Summer enrollment period cannot exceed 2 weeks (14 days). Current period: {$diffDays} days."
            ]);
        }

        try {
            // Check if summer semester already exists for this year
            $existingSummer = SchoolYear::where('year_start', $validated['year_start'])
                ->where('year_end', $validated['year_end'])
                ->where('semester', 'Summer')
                ->first();

            if ($existingSummer) {
                return redirect()->back()->withErrors(['general' => 'Summer semester already exists for this academic year.']);
            }

            // Prepare data for summer semester creation
            $schoolYearData = [
                'year_start' => $validated['year_start'],
                'year_end' => $validated['year_end'],
                'semester' => 'Summer',
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'is_active' => false,
                'enrollment_open' => false, // Summer enrollment is managed separately
                'enrollment_start' => $validated['enrollment_start'] ?? $validated['start_date'],
                'enrollment_end' => $validated['enrollment_end'] ?? $validated['end_date'],
                'is_current_academic_year' => false, // Summer is not part of regular academic year
                'allow_grade_progression' => false, // No grade progression in summer
            ];

            // Only include 'year' column if it exists in the database schema
            if (Schema::hasColumn('school_years', 'year')) {
                $schoolYearData['year'] = $validated['year_start'] . '-' . $validated['year_end'] . ' Summer';
            }

            $schoolYear = SchoolYear::create($schoolYearData);

            Log::info('Summer semester created successfully', [
                'school_year_id' => $schoolYear->id,
                'semester' => $schoolYear->semester,
                'year_range' => $schoolYear->year_start . '-' . $schoolYear->year_end,
                'purpose' => 'Failed subjects remedial'
            ]);

            return redirect()->back()->with('success', 
                "Summer semester {$validated['year_start']}-{$validated['year_end']} created successfully! " .
                "This semester is specifically designed for students who need to retake failed subjects."
            );

        } catch (\Exception $e) {
            Log::error('Failed to create summer semester', [
                'error' => $e->getMessage(),
                'year_start' => $validated['year_start'],
                'year_end' => $validated['year_end'],
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->back()->withErrors([
                'error' => 'Failed to create summer semester: ' . $e->getMessage()
            ]);
        }
    }

    public function activateSchoolYear($id)
    {
        try {
            DB::beginTransaction();
            
            $schoolYear = SchoolYear::findOrFail($id);
            $previousActiveYear = SchoolYear::where('is_active', true)->first();

            Log::info('Activating school year', [
                'school_year_id' => $id,
                'previous_active' => $previousActiveYear ? $previousActiveYear->id : 'none',
                'new_year' => $schoolYear->year_start . '-' . $schoolYear->year_end
            ]);

            // Deactivate all other school years
            SchoolYear::where('id', '!=', $id)->update(['is_active' => false]);

            // Activate the selected school year
            $schoolYear->update(['is_active' => true]);

            // If this is a new school year activation, handle data reset and progression
            if ($previousActiveYear && $previousActiveYear->id !== $id) {
                try {
                    $this->handleSchoolYearTransition($previousActiveYear, $schoolYear);
                } catch (\Exception $transitionError) {
                    Log::error('Error in school year transition: ' . $transitionError->getMessage(), [
                        'trace' => $transitionError->getTraceAsString()
                    ]);
                    // Continue without transition - just activate the year
                }
            }

            DB::commit();
            
            Log::info('School year activated successfully', ['school_year_id' => $id]);
            
            return redirect()->back()->with('success', 'School year activated successfully. Data has been prepared for the new academic year.');
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error activating school year: ' . $e->getMessage(), [
                'school_year_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->withErrors(['general' => 'Failed to activate school year: ' . $e->getMessage()]);
        }
    }

    /**
     * Handle the transition between school years
     */
    private function handleSchoolYearTransition($previousYear, $newYear)
    {
        Log::info('Handling school year transition', [
            'previous_year' => $previousYear->year_start . '-' . $previousYear->year_end,
            'new_year' => $newYear->year_start . '-' . $newYear->year_end
        ]);

        // 1. Auto-create Grade 12 pending enrollments for current Grade 11 students
        $this->createGrade12PendingEnrollments($previousYear, $newYear);

        // 2. Reset class schedules (but preserve faculty accounts)
        $this->resetClassSchedules($newYear);

        // 3. Create default sections for new school year if they don't exist
        $this->createDefaultSections($newYear);
    }

    /**
     * Create Grade 12 pending enrollments for Grade 11 students
     */
    private function createGrade12PendingEnrollments($previousYear, $newYear)
    {
        try {
            // Get all Grade 11 students who were enrolled in the previous year
            $grade11Students = DB::table('enrollments')
                ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
                ->where('enrollments.school_year_id', $previousYear->id)
                ->where('student_personal_info.grade_level', '11')
                ->where('enrollments.status', 'enrolled')
                ->select('student_personal_info.*', 'enrollments.assigned_section_id', 'enrollments.strand_id')
                ->get();

            Log::info('Found Grade 11 students for progression', [
                'count' => $grade11Students->count(),
                'previous_year_id' => $previousYear->id,
                'new_year_id' => $newYear->id,
                'students' => $grade11Students->pluck('id')->toArray()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching Grade 11 students: ' . $e->getMessage());
            return; // Skip this step if it fails
        }

        $createdCount = 0;
        $skippedCount = 0;
        
        foreach ($grade11Students as $student) {
            // Check if student already has enrollment for new year
            $existingEnrollment = DB::table('enrollments')
                ->where('student_id', $student->id)
                ->where('school_year_id', $newYear->id)
                ->first();

            if (!$existingEnrollment) {
                // Create pending Grade 12 enrollment
                DB::table('enrollments')->insert([
                    'student_id' => $student->id,
                    'school_year_id' => $newYear->id,
                    'assigned_section_id' => null, // Will be assigned later
                    'strand_id' => $student->strand_id,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update student to Grade 12
                DB::table('student_personal_info')
                    ->where('id', $student->id)
                    ->update([
                        'grade_level' => '12',
                        'updated_at' => now()
                    ]);
                
                $createdCount++;
                
                Log::info('Created Grade 12 pending enrollment', [
                    'student_id' => $student->id,
                    'user_id' => $student->user_id,
                    'new_school_year_id' => $newYear->id,
                    'strand_id' => $student->strand_id
                ]);
            } else {
                $skippedCount++;
                Log::info('Skipped student - already has enrollment', [
                    'student_id' => $student->id,
                    'existing_status' => $existingEnrollment->status
                ]);
            }
        }

        Log::info('Grade 12 pending enrollments summary', [
            'total_grade11_students' => $grade11Students->count(),
            'created_enrollments' => $createdCount,
            'skipped_existing' => $skippedCount
        ]);
    }

    /**
     * Reset class schedules for new school year
     */
    private function resetClassSchedules($newYear)
    {
        try {
            // Note: We don't delete faculty accounts, just reset their class assignments
            // Faculty accounts (users table) remain intact
            
            // Clear schedules for the NEW year to ensure clean slate
            $deletedSchedules = DB::table('class_schedules')->where('school_year_id', $newYear->id)->delete();
            $deletedClasses = DB::table('class')->where('school_year_id', $newYear->id)->delete();
            
            // Also clear any orphaned schedules (without school_year_id) to prevent confusion
            $deletedOrphans = DB::table('class_schedules')->whereNull('school_year_id')->delete();
            $deletedOrphanClasses = DB::table('class')->whereNull('school_year_id')->delete();
            
            Log::info('Reset class schedules for new school year', [
                'school_year_id' => $newYear->id,
                'year' => $newYear->year_start . '-' . $newYear->year_end,
                'deleted_schedules' => $deletedSchedules,
                'deleted_classes' => $deletedClasses,
                'deleted_orphan_schedules' => $deletedOrphans,
                'deleted_orphan_classes' => $deletedOrphanClasses
            ]);
        } catch (\Exception $e) {
            Log::error('Error resetting class schedules: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create default sections for new school year
     */
    private function createDefaultSections($newYear)
    {
        $strands = Strand::all();
        
        foreach ($strands as $strand) {
            // Create Grade 11 and Grade 12 sections for each strand
            foreach ([11, 12] as $gradeLevel) {
                $sectionName = $strand->code . '-A-G' . $gradeLevel;
                
                // Check if section already exists
                $existingSection = Section::where('section_name', $sectionName)
                    ->where('strand_id', $strand->id)
                    ->where('grade_level', $gradeLevel)
                    ->first();
                
                if (!$existingSection) {
                    Section::create([
                        'section_name' => $sectionName,
                        'strand_id' => $strand->id,
                        'grade_level' => $gradeLevel,
                        'max_students' => 40,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
        }
        
        Log::info('Created default sections for new school year');
    }

    /**
     * Check and fix data integrity for school year schedules
     */
    public function checkScheduleIntegrity()
    {
        try {
            $allSchedules = ClassSchedule::all();
            $allSchoolYears = SchoolYear::all();
            
            $report = [
                'total_schedules' => $allSchedules->count(),
                'total_school_years' => $allSchoolYears->count(),
                'schedules_without_year' => $allSchedules->whereNull('school_year_id')->count(),
                'schedules_by_year' => $allSchedules->groupBy('school_year_id')->map->count()->toArray(),
                'school_years' => $allSchoolYears->map(function($year) {
                    return [
                        'id' => $year->id,
                        'year' => $year->year_start . '-' . $year->year_end,
                        'is_active' => $year->is_active,
                        'schedule_count' => ClassSchedule::where('school_year_id', $year->id)->count()
                    ];
                })->toArray()
            ];
            
            Log::info('Schedule integrity report', $report);
            
            return response()->json([
                'success' => true,
                'report' => $report
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking schedule integrity: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manually clear schedules for active school year
     */
    public function clearActiveYearSchedules()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found'
                ], 404);
            }

            // Clear schedules for active year
            $deletedSchedules = DB::table('class_schedules')->where('school_year_id', $activeSchoolYear->id)->delete();
            $deletedClasses = DB::table('class')->where('school_year_id', $activeSchoolYear->id)->delete();
            
            // Also clear orphaned schedules
            $deletedOrphans = DB::table('class_schedules')->whereNull('school_year_id')->delete();
            $deletedOrphanClasses = DB::table('class')->whereNull('school_year_id')->delete();
            
            Log::info('Manually cleared schedules for active school year', [
                'school_year_id' => $activeSchoolYear->id,
                'year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                'deleted_schedules' => $deletedSchedules,
                'deleted_classes' => $deletedClasses,
                'deleted_orphan_schedules' => $deletedOrphans,
                'deleted_orphan_classes' => $deletedOrphanClasses
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Successfully cleared schedules for active school year',
                'deleted' => [
                    'schedules' => $deletedSchedules,
                    'classes' => $deletedClasses,
                    'orphan_schedules' => $deletedOrphans,
                    'orphan_classes' => $deletedOrphanClasses
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error clearing active year schedules: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear schedules: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manually trigger Grade 12 progression for all eligible Grade 11 students
     */
    public function triggerGrade12Progression()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            $previousSchoolYear = SchoolYear::where('is_active', false)
                ->orderBy('year_start', 'desc')
                ->first();
            
            if (!$activeSchoolYear || !$previousSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Could not find active and previous school years'
                ], 404);
            }

            // Trigger the Grade 12 progression
            $this->createGrade12PendingEnrollments($previousSchoolYear, $activeSchoolYear);
            
            return response()->json([
                'success' => true,
                'message' => 'Grade 12 progression triggered successfully',
                'active_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                'previous_year' => $previousSchoolYear->year_start . '-' . $previousSchoolYear->year_end
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error triggering Grade 12 progression: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to trigger Grade 12 progression: ' . $e->getMessage()
            ], 500);
        }
    }

    public function switchSemester(Request $request)
    {
        $validated = $request->validate([
            'semester' => 'required|integer|in:1,2'
        ]);

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        if (!$activeSchoolYear) {
            return redirect()->back()->withErrors(['general' => 'No active school year found']);
        }

        $activeSchoolYear->update([
            'current_semester' => $validated['semester'],
            'semester' => $validated['semester'] === 1 ? '1st Semester' : '2nd Semester'
        ]);

        return redirect()->back()->with('success', 'Semester switched successfully');
    }

    public function getSections()
    {
        $sections = Section::with(['strand', 'adviser'])
            ->orderBy('section_name')
            ->get()
            ->map(function ($section) {
                return [
                    'id' => $section->id,
                    'section_name' => $section->section_name,
                    'year_level' => $section->year_level,
                    'strand_id' => $section->strand_id,
                    'strand_name' => $section->strand ? $section->strand->name : 'No Strand',
                    'strand_code' => $section->strand ? $section->strand->code : 'N/A',
                    'adviser_id' => $section->adviser_id,
                    'adviser_name' => $section->adviser ? $section->adviser->firstname . ' ' . $section->adviser->lastname : 'No Adviser Assigned',
                ];
            });

        return response()->json($sections);
    }

    // Class Management Method
    public function classPage()
    {
        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Get all strands for class assignment
        $strands = Strand::with(['subjects' => function ($query) use ($activeSchoolYear) {
            if ($activeSchoolYear) {
                $query->where('school_year_id', $activeSchoolYear->id);
            }
        }])->orderBy('name')->get();

        // Get all sections for class assignment
        $sections = Section::with(['strand', 'adviser'])->orderBy('section_name')->get();

        // Get all faculties for teacher assignment
        $faculties = User::whereIn('role', ['faculty', 'coordinator'])->get();

        // Get class schedules with relationships
        $classSchedules = ClassSchedule::with(['subject.strand', 'faculty', 'section'])
            ->when($activeSchoolYear, function ($query) use ($activeSchoolYear) {
                $query->where('school_year_id', $activeSchoolYear->id);
            })
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(function ($schedule) {
                return [
                    'id' => $schedule->id,
                    'subject_id' => $schedule->subject_id,
                    'subject_name' => $schedule->subject ? $schedule->subject->name : 'No Subject',
                    'subject_code' => $schedule->subject ? $schedule->subject->code : 'N/A',
                    'strand_name' => $schedule->subject && $schedule->subject->strand ? $schedule->subject->strand->name : 'No Strand',
                    'faculty_id' => $schedule->faculty_id,
                    'faculty_name' => $schedule->faculty ? $schedule->faculty->firstname . ' ' . $schedule->faculty->lastname : 'No Teacher',
                    'section_id' => $schedule->section_id,
                    'section_name' => $schedule->section ? $schedule->section->name : 'No Section',
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'room' => 'TBA',
                    'semester' => $schedule->semester,
                    'is_active' => $schedule->is_active ?? true,
                ];
            });

        return Inertia::render('Registrar/RegistrarClass', [
            'strands' => $strands,
            'sections' => $sections,
            'faculties' => $faculties,
            'classSchedules' => $classSchedules,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }


    // Sections Management Method
    public function sectionsPage()
    {
        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Get all strands for section assignment
        $strands = Strand::orderBy('name')->get();

        // Get all faculties for teacher assignment
        $faculties = User::whereIn('role', ['faculty', 'coordinator'])
            ->select('id', 'firstname', 'lastname', 'email', 'role', 'assigned_strand_id')
            ->get();

        // Get faculties grouped by strand for filtering
        $facultiesByStrand = User::whereIn('role', ['faculty', 'coordinator'])
            ->whereNotNull('assigned_strand_id')
            ->with('assignedStrand')
            ->get()
            ->groupBy('assigned_strand_id')
            ->map(function ($strandFaculties) {
                return $strandFaculties->map(function ($faculty) {
                    return [
                        'id' => $faculty->id,
                        'name' => $faculty->firstname . ' ' . $faculty->lastname,
                        'firstname' => $faculty->firstname,
                        'lastname' => $faculty->lastname,
                        'email' => $faculty->email,
                        'role' => $faculty->role,
                        'assigned_strand_id' => $faculty->assigned_strand_id
                    ];
                });
            });

        // Debug: Log the faculty data to see what's happening
        Log::info('Faculties data:', [
            'total_faculties' => $faculties->count(),
            'faculties_with_strand' => $faculties->whereNotNull('assigned_strand_id')->count(),
            'facultiesByStrand_keys' => array_keys($facultiesByStrand->toArray()),
            'sample_faculty' => $faculties->first() ? $faculties->first()->toArray() : null
        ]);

        // Get sections filtered by active school year (with historical support)
        $sectionsQuery = Section::with(['strand', 'adviser', 'schoolYear']);

        if ($activeSchoolYear) {
            // Show sections for active school year AND legacy sections (NULL school_year_id)
            $sectionsQuery->where(function ($query) use ($activeSchoolYear) {
                $query->where('school_year_id', $activeSchoolYear->id)
                    ->orWhereNull('school_year_id');
            });
        } else {
            // If no active school year, show sections without school year assignment (legacy data)
            $sectionsQuery->whereNull('school_year_id');
        }

        $sections = $sectionsQuery->orderBy('section_name')
            ->get()
            ->map(function ($section) {
                return [
                    'id' => $section->id,
                    'section_name' => $section->section_name,
                    'year_level' => $section->year_level,
                    'strand' => $section->strand ? $section->strand->name : 'No Strand',
                    'strand_id' => $section->strand_id,
                    'adviser_name' => $section->adviser ? $section->adviser->firstname . ' ' . $section->adviser->lastname : 'No Adviser',
                    'adviser_id' => $section->adviser_id,
                    'school_year_id' => $section->school_year_id,
                    'school_year' => $section->schoolYear ? $section->schoolYear->year_start . '-' . $section->schoolYear->year_end : 'Legacy',
                ];
            });

        return Inertia::render('Registrar/RegistrarSections', [
            'sections' => $sections,
            'strands' => $strands,
            'faculties' => $faculties,
            'facultiesByStrand' => $facultiesByStrand,
            'activeSchoolYear' => $activeSchoolYear,
            'hasActiveSchoolYear' => $activeSchoolYear !== null
        ]);
    }

    // Subjects Management Method
    public function subjectsPage()
    {
        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Get all strands with their subjects (don't filter by school year for now since subjects are seeded without school_year_id)
        $strands = Strand::with(['subjects'])->get();

        // Get all faculties for teacher assignment
        $faculties = User::whereIn('role', ['faculty', 'coordinator'])
            ->select('id', 'firstname', 'lastname', 'email', 'role', 'assigned_strand_id')
            ->get();

        // Get faculties grouped by strand for filtering
        $facultiesByStrand = User::whereIn('role', ['faculty', 'coordinator'])
            ->whereNotNull('assigned_strand_id')
            ->with('assignedStrand')
            ->get()
            ->groupBy('assigned_strand_id')
            ->map(function ($strandFaculties) {
                return $strandFaculties->map(function ($faculty) {
                    return [
                        'id' => $faculty->id,
                        'name' => $faculty->firstname . ' ' . $faculty->lastname,
                        'firstname' => $faculty->firstname,
                        'lastname' => $faculty->lastname,
                        'email' => $faculty->email,
                        'role' => $faculty->role,
                        'assigned_strand_id' => $faculty->assigned_strand_id
                    ];
                });
            });

        // Debug: Log the faculty data to see what's happening
        Log::info('Faculties data:', [
            'total_faculties' => $faculties->count(),
            'faculties_with_strand' => $faculties->whereNotNull('assigned_strand_id')->count(),
            'facultiesByStrand_keys' => array_keys($facultiesByStrand->toArray()),
            'sample_faculty' => $faculties->first() ? $faculties->first()->toArray() : null
        ]);

        // Get all subjects with their strand and faculty information, grouped by semester
        $subjects = Subject::with(['strand', 'faculty'])
            ->orderBy('semester')
            ->orderBy('year_level')
            ->orderBy('name')
            ->get()
            ->map(function ($subject) use ($activeSchoolYear) {
                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'semester' => $subject->semester,
                    'semester_display' => $subject->semester == 1 ? '1st Semester (Aug-Dec)' : '2nd Semester (Jan-May)',
                    'year_level' => $subject->year_level,
                    'strand_name' => $subject->strand ? $subject->strand->name : 'No Strand',
                    'strand_id' => $subject->strand_id,
                    'faculty_name' => $subject->faculty ? $subject->faculty->firstname . ' ' . $subject->faculty->lastname : 'No Faculty',
                    'faculty_id' => $subject->faculty_id,
                    'school_year_id' => $subject->school_year_id,
                    'school_year' => $activeSchoolYear ? $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end : 'Not Assigned',
                    'current_semester' => $activeSchoolYear ? $activeSchoolYear->current_semester ?? 1 : 1,
                    'full_display' => "[" . ($subject->semester == 1 ? '1st Sem' : '2nd Sem') . "] " . $subject->code . " - " . $subject->name
                ];
            });

        return Inertia::render('Registrar/RegistrarSubjects', [
            'subjects' => $subjects,
            'strands' => $strands,
            'faculties' => $faculties,
            'facultiesByStrand' => $facultiesByStrand,
            'activeSchoolYear' => $activeSchoolYear,
            'hasActiveSchoolYear' => $activeSchoolYear !== null,
            'firstSemesterSubjects' => $subjects->where('semester', 1)->values(),
            'secondSemesterSubjects' => $subjects->where('semester', 2)->values()
        ]);
    }

    // Strands Management Page
    public function strandsPage()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $strands = Strand::orderBy('code')->get();

        return Inertia::render('Registrar/RegistrarClass', [
            'strands' => $strands,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    // School Years Management Page
    public function schoolYearsPage()
    {
        $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        return Inertia::render('Registrar/RegistrarSemester', [
            'schoolYears' => $schoolYears,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    // Semester Management Page
    public function semestersPage()
    {
        try {
            // Get all school years/semesters ordered by year and semester
            $schoolYears = SchoolYear::orderBy('year_start', 'desc')
                ->orderBy('year_end', 'desc')
                ->orderBy('semester')
                ->get();

            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            // Prepare semester data for display
            $semesters = $schoolYears->map(function ($schoolYear) {
                return [
                    'id' => $schoolYear->id,
                    'year_start' => $schoolYear->year_start,
                    'year_end' => $schoolYear->year_end,
                    'semester' => $schoolYear->semester,
                    'start_date' => $schoolYear->start_date,
                    'end_date' => $schoolYear->end_date,
                    'is_active' => $schoolYear->is_active,
                    'display_name' => $schoolYear->year_start . '-' . $schoolYear->year_end . ' ' . $schoolYear->semester
                ];
            });

            $activeSemester = $semesters->where('is_active', true)->first();
            $inactiveSemesters = $semesters->where('is_active', false);
            $totalSemesters = $semesters->count();

            return Inertia::render('Registrar/RegistrarSemester', [
                'schoolYears' => $schoolYears,
                'semesters' => $semesters,
                'activeSemester' => $activeSemester,
                'inactiveSemesters' => $inactiveSemesters,
                'totalSemesters' => $totalSemesters,
                'activeSchoolYear' => $activeSchoolYear,
                'allSchoolYears' => $schoolYears // For dropdown
            ]);

        } catch (\Exception $e) {
            Log::error('Error loading semesters page: ' . $e->getMessage());
            
            return Inertia::render('Registrar/RegistrarSemester', [
                'schoolYears' => [],
                'semesters' => [],
                'activeSemester' => null,
                'inactiveSemesters' => collect([]),
                'totalSemesters' => 0,
                'activeSchoolYear' => null,
                'allSchoolYears' => [],
                'error' => 'Failed to load semesters. Please try again.'
            ]);
        }
    }

    public function toggleSchoolYear($id)
    {
        try {
            $schoolYear = SchoolYear::findOrFail($id);

            if ($schoolYear->is_active) {
                // Deactivate the school year
                $schoolYear->update(['is_active' => false]);
                $message = 'School year deactivated successfully';
            } else {
                // Deactivate all other school years first
                SchoolYear::where('id', '!=', $id)->update(['is_active' => false]);

                // Activate this school year
                $schoolYear->update(['is_active' => true]);
                $message = 'School year activated successfully';
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to toggle school year status']);
        }
    }

    // School Year Creation Method
    public function storeSchoolYear(Request $request)
    {
        try {
            // Log the incoming request data for debugging
            Log::info('School year creation attempt', [
                'request_data' => $request->all()
            ]);

            $validatedData = $request->validate([
                'year_start' => 'required|integer|min:2020|max:2050',
                'year_end' => 'required|integer|min:2020|max:2050',
                'semester' => 'required|string|in:1st Semester,2nd Semester,Summer',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
            ]);

            Log::info('Validation passed', [
                'validated_data' => $validatedData
            ]);

            // Check for duplicate semester
            $existingSemester = SchoolYear::where('year_start', $validatedData['year_start'])
                ->where('year_end', $validatedData['year_end'])
                ->where('semester', $validatedData['semester'])
                ->first();

            if ($existingSemester) {
                Log::warning('Duplicate semester attempt', [
                    'existing_semester_id' => $existingSemester->id,
                    'attempted_data' => $validatedData
                ]);
                return redirect()->back()->with('error', 'A semester with this name and year already exists.');
            }

            // Prepare data for school year creation
            $schoolYearData = [
                'year_start' => $validatedData['year_start'],
                'year_end' => $validatedData['year_end'],
                'semester' => $validatedData['semester'],
                'start_date' => $validatedData['start_date'],
                'end_date' => $validatedData['end_date'],
                'is_active' => false,
            ];

            // Only include 'year' column if it exists in the database schema
            if (Schema::hasColumn('school_years', 'year')) {
                $schoolYearData['year'] = $validatedData['year_start'] . '-' . $validatedData['year_end'];
            }

            $schoolYear = SchoolYear::create($schoolYearData);

            Log::info('School year created successfully', [
                'school_year_id' => $schoolYear->id,
                'semester' => $schoolYear->semester,
                'year_range' => $schoolYear->year_start . '-' . $schoolYear->year_end
            ]);

            return redirect()->back()->with('success', 'Semester created successfully!');

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed for school year creation', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return redirect()->back()->withErrors($e->errors())->withInput();

        } catch (\Exception $e) {
            Log::error('Error creating school year', [
                'error_message' => $e->getMessage(),
                'error_line' => $e->getLine(),
                'error_file' => $e->getFile(),
                'request_data' => $request->all(),
                'stack_trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->with('error', 'Failed to create semester: ' . $e->getMessage());
        }
    }

    public function updateSchoolYear(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'year_start' => 'required|integer|min:2020|max:2050',
                'year_end' => 'required|integer|min:2020|max:2050|gt:year_start',
                'semester' => 'required|string|max:255',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after:start_date',
            ]);

            $schoolYear = SchoolYear::findOrFail($id);

            // Update the school year with validated data
            $schoolYear->update([
                'year_start' => $validated['year_start'],
                'year_end' => $validated['year_end'],
                'semester' => $validated['semester'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
            ]);

            return redirect()->back()->with('success', 'School year updated successfully');
        } catch (\Exception $e) {
            Log::error('Error updating school year: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update school year: ' . $e->getMessage());
        }
    }

    public function deleteSchoolYear($id)
    {
        try {
            $schoolYear = SchoolYear::findOrFail($id);

            // Check if this school year has any associated data that would prevent deletion
            $hasEnrollments = $schoolYear->enrollments()->count() > 0;
            $hasSubjects = $schoolYear->subjects()->count() > 0;

            if ($hasEnrollments || $hasSubjects) {
                return redirect()->back()->with('error', 
                    'Cannot delete this semester. It has associated enrollments or subjects. Please remove them first.');
            }

            // Prevent deletion of active school year
            if ($schoolYear->is_active) {
                return redirect()->back()->with('error', 
                    'Cannot delete an active semester. Please deactivate it first.');
            }

            $semesterName = $schoolYear->semester;
            $yearRange = $schoolYear->year_start . '-' . $schoolYear->year_end;
            
            $schoolYear->delete();

            Log::info('School year deleted successfully', [
                'school_year_id' => $id,
                'semester' => $semesterName,
                'year_range' => $yearRange
            ]);

            return redirect()->back()->with('success', 
                "Semester '{$semesterName} ({$yearRange})' deleted successfully!");

        } catch (\Exception $e) {
            Log::error('Error deleting school year: ' . $e->getMessage(), [
                'school_year_id' => $id,
                'error' => $e->getMessage()
            ]);

            return redirect()->back()->with('error', 'Failed to delete semester. Please try again.');
        }
    }

    // Strand Management Methods
    public function createStrand(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10',
        ]);

        // Check if strand with this code already exists
        $existingStrand = Strand::where('code', strtoupper($request->code))->first();
        if ($existingStrand) {
            return redirect()->back()->withErrors(['general' => 'A strand with this code already exists. Please choose a different code.']);
        }

        // Check if strand with this name already exists
        $existingName = Strand::where('name', $request->name)->first();
        if ($existingName) {
            return redirect()->back()->withErrors(['general' => 'A strand with this name already exists. Please choose a different name.']);
        }

        try {
            $strand = Strand::create([
                'name' => $request->name,
                'code' => strtoupper($request->code),
                'description' => $request->description ?? null,
            ]);

            return redirect()->back()->with('success', 'Strand created successfully!');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to create strand: ' . $e->getMessage()]);
        }
    }

    public function updateStrand(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:strands,code,' . $id,
        ]);

        try {
            $strand = Strand::findOrFail($id);
            $strand->update([
                'name' => $request->name,
                'code' => strtoupper($request->code),
                'description' => $request->description ?? null,
            ]);

            return redirect()->back()->with('success', 'Strand updated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to update strand: ' . $e->getMessage()]);
        }
    }

    public function deleteStrand($id)
    {
        try {
            $strand = Strand::findOrFail($id);

            // Check if strand has associated sections or subjects
            if ($strand->sections()->count() > 0 || $strand->subjects()->count() > 0) {
                return redirect()->back()->withErrors(['general' => 'Cannot delete strand. It has associated sections or subjects.']);
            }

            $strand->delete();

            return redirect()->back()->with('success', 'Strand deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to delete strand: ' . $e->getMessage()]);
        }
    }

    // Section Management Methods
    public function createSection(Request $request)
    {
        $request->validate([
            'section_name' => [
                'required',
                'string',
                'max:20',
                Rule::unique('sections')->where(function ($query) use ($request) {
                    return $query->where('strand_id', $request->strand_id)
                        ->where('year_level', $request->year_level);
                })
            ],
            'year_level' => 'required|integer|in:11,12',
            'strand_id' => 'required|exists:strands,id',
            'adviser_id' => [
                'nullable',
                'exists:users,id',
                Rule::unique('sections')->where(function ($query) use ($request) {
                    return $query->whereNotNull('adviser_id');
                })->ignore($request->id ?? null)
            ],
        ], [
            'section_name.unique' => 'A section with this name already exists for the selected strand and year level.',
            'adviser_id.unique' => 'This teacher is already assigned to another section.',
        ]);

        try {
            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            // Check if teacher is already assigned within the same school year
            if ($request->adviser_id) {
                $existingAssignment = Section::where('adviser_id', $request->adviser_id)
                    ->when($activeSchoolYear, function ($query) use ($activeSchoolYear) {
                        $query->where(function ($subQuery) use ($activeSchoolYear) {
                            $subQuery->where('school_year_id', $activeSchoolYear->id)
                                ->orWhereNull('school_year_id');
                        });
                    })
                    ->first();

                if ($existingAssignment) {
                    $teacher = User::find($request->adviser_id);
                    return redirect()->back()->withErrors([
                        'adviser_id' => "Teacher {$teacher->firstname} {$teacher->lastname} is already assigned to section {$existingAssignment->section_name}"
                    ]);
                }
            }

            $section = Section::create([
                'section_name' => $request->section_name,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
                'adviser_id' => $request->adviser_id,
                'school_year_id' => $activeSchoolYear ? $activeSchoolYear->id : null,
            ]);

            return redirect()->back()->with('success', 'Section created successfully!');
        } catch (\Exception $e) {
            Log::error('Section creation failed: ' . $e->getMessage());

            return redirect()->back()->withErrors([
                'general' => 'Failed to create section: ' . $e->getMessage()
            ]);
        }
    }

    public function updateSection(Request $request, $id)
    {
        $request->validate([
            'section_name' => 'required|string|max:20|unique:sections,section_name,' . $id,
            'year_level' => 'required|integer|in:11,12',
            'strand_id' => 'required|exists:strands,id',
            'adviser_id' => 'nullable|exists:users,id',
        ]);

        try {
            $section = Section::findOrFail($id);
            $section->update([
                'section_name' => $request->section_name,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
                'adviser_id' => $request->adviser_id,
            ]);

            return redirect()->back()->with('success', 'Section updated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to update section: ' . $e->getMessage()]);
        }
    }

    public function deleteSection($id)
    {
        try {
            $section = Section::findOrFail($id);

            // Check if section has enrolled students
            if ($section->enrollments()->count() > 0) {
                return redirect()->back()->withErrors(['general' => 'Cannot delete section. It has enrolled students.']);
            }

            $section->delete();

            return redirect()->back()->with('success', 'Section deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to delete section: ' . $e->getMessage()]);
        }
    }

    /**
     * Philippine SHS System: Get progression status
     */
    public function getProgressionStatus()
    {
        try {
            $progressionSchoolYear = SchoolYear::getProgressionAllowed();
            
            return response()->json([
                'progression_enabled' => $progressionSchoolYear ? true : false,
                'school_year' => $progressionSchoolYear ? [
                    'id' => $progressionSchoolYear->id,
                    'year' => $progressionSchoolYear->year,
                    'semester' => $progressionSchoolYear->semester
                ] : null,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'progression_enabled' => false,
                'error' => $e->getMessage(),
                'success' => false
            ], 500);
        }
    }


    // Semester Management Methods
    public function createSemester(Request $request)
    {
        $request->validate([
            'year_start' => 'required|integer|min:2020|max:2050',
            'year_end' => 'required|integer|min:2020|max:2050|gt:year_start',
            'semester' => 'required|integer|in:1,2',
        ]);

        try {
            // Check if semester already exists for this year
            $existingSemester = SchoolYear::where('year_start', $request->year_start)
                ->where('year_end', $request->year_end)
                ->where('semester', $request->semester)
                ->first();

            if ($existingSemester) {
                return redirect()->back()->withErrors(['general' => 'This semester already exists for the specified academic year.']);
            }

            $semester = SchoolYear::create([
                'year_start' => $request->year_start,
                'year_end' => $request->year_end,
                'semester' => $request->semester,
                'is_active' => false, // New semesters are inactive by default
            ]);

            return redirect()->back()->with('success', 'Semester created successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to create semester: ' . $e->getMessage()]);
        }
    }

    public function updateSemester(Request $request, $id)
    {
        $request->validate([
            'year_start' => 'required|integer|min:2020|max:2050',
            'year_end' => 'required|integer|min:2020|max:2050|gt:year_start',
            'semester' => 'required|integer|in:1,2',
        ]);

        try {
            $semester = SchoolYear::findOrFail($id);

            // Check if updated semester already exists (excluding current record)
            $existingSemester = SchoolYear::where('year_start', $request->year_start)
                ->where('year_end', $request->year_end)
                ->where('semester', $request->semester)
                ->where('id', '!=', $id)
                ->first();

            if ($existingSemester) {
                return redirect()->back()->withErrors(['general' => 'This semester already exists for the specified academic year.']);
            }

            $semester->update([
                'year_start' => $request->year_start,
                'year_end' => $request->year_end,
                'semester' => $request->semester,
            ]);

            return redirect()->back()->with('success', 'Semester updated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to update semester: ' . $e->getMessage()]);
        }
    }

    public function deleteSemester($id)
    {
        try {
            $semester = SchoolYear::findOrFail($id);

            // Check if semester is active
            if ($semester->is_active) {
                return redirect()->back()->withErrors(['general' => 'Cannot delete active semester. Please activate another semester first.']);
            }

            // Check if semester has subjects or enrollments
            if ($semester->subjects()->count() > 0 || $semester->enrollments()->count() > 0) {
                return redirect()->back()->withErrors(['general' => 'Cannot delete semester. It has associated subjects or enrollments.']);
            }

            $semester->delete();

            return redirect()->back()->with('success', 'Semester deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to delete semester: ' . $e->getMessage()]);
        }
    }

    // Dashboard Statistics Methods
    public function getDashboardStats()
    {
        try {
            $stats = [
                'students_count' => User::where('role', 'student')->count(),
                'faculty_count' => User::whereIn('role', ['faculty', 'coordinator'])->count(),
                'sections_count' => Section::count(),
                'classes_count' => ClassSchedule::count(),
                'coordinators_count' => User::where('role', 'coordinator')->count(),
                'strands_count' => Strand::count(),
                'subjects_count' => Subject::count(),
                'active_school_year' => SchoolYear::where('is_active', true)->first()
            ];

            return redirect()->back()->with('dashboard_stats', $stats);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to get dashboard stats: ' . $e->getMessage()]);
        }
    }

    /**
     * API endpoint for dashboard statistics
     */
    public function getDashboardStatsApi()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            // Get enrolled students count (those with approved enrollment status)
            $enrolledStudentsCount = Enrollment::where('status', 'approved')
                ->when($activeSchoolYear, function($query) use ($activeSchoolYear) {
                    return $query->where('school_year_id', $activeSchoolYear->id);
                })
                ->count();

            // Get pending enrollments count
            $pendingEnrollmentsCount = Enrollment::where('status', 'pending')
                ->when($activeSchoolYear, function($query) use ($activeSchoolYear) {
                    return $query->where('school_year_id', $activeSchoolYear->id);
                })
                ->count();

            $stats = [
                'totalStudents' => $enrolledStudentsCount,
                'pendingEnrollments' => $pendingEnrollmentsCount,
                'activeClasses' => ClassSchedule::where('is_active', true)
                    ->when($activeSchoolYear, function($query) use ($activeSchoolYear) {
                        return $query->where('school_year_id', $activeSchoolYear->id);
                    })
                    ->count(),
                'facultyMembers' => User::whereIn('role', ['faculty', 'coordinator'])
                    ->where('is_disabled', false)
                    ->count(),
                'activeSections' => Section::count(),
                'totalStrands' => Strand::count(),
                'activeSchoolYear' => $activeSchoolYear
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('getDashboardStatsApi error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get dashboard stats'
            ], 500);
        }
    }

    /**
     * API endpoint for enrolled students per strand data for charts
     */
    public function getEnrolledStudentsPerStrand()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found'
                ], 404);
            }

            // Get enrolled students grouped by strand
            $strandData = DB::table('enrollments')
                ->join('strands', 'enrollments.strand_id', '=', 'strands.id')
                ->where('enrollments.status', 'approved')
                ->where('enrollments.school_year_id', $activeSchoolYear->id)
                ->select(
                    'strands.code',
                    'strands.name',
                    DB::raw('COUNT(enrollments.id) as student_count')
                )
                ->groupBy('strands.id', 'strands.code', 'strands.name')
                ->orderBy('strands.code')
                ->get();

            // Also get all strands to show 0 counts for strands with no enrollments
            $allStrands = Strand::orderBy('code')->get();
            
            $chartData = [];
            foreach ($allStrands as $strand) {
                $enrollmentData = $strandData->firstWhere('code', $strand->code);
                $chartData[] = [
                    'strand' => $strand->code,
                    'name' => $strand->name,
                    'students' => $enrollmentData ? (int)$enrollmentData->student_count : 0
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $chartData,
                'total_enrolled' => $strandData->sum('student_count')
            ]);
        } catch (\Exception $e) {
            Log::error('getEnrolledStudentsPerStrand error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get strand enrollment data'
            ], 500);
        }
    }

    // Faculty Management Method
    public function facultyPage()
    {
        // Get all faculty and coordinators with session information
        $teachers = User::whereIn('role', ['faculty', 'coordinator'])
            ->select('id', 'firstname', 'lastname', 'email', 'role', 'is_coordinator', 'assigned_strand_id', 'is_disabled', 'updated_at', 'last_login_at')
            ->with('assignedStrand:id,name,code')
            ->orderBy('lastname')
            ->get()
            ->map(function ($user) {
                // Check if user has active session by looking at sessions table
                $isOnline = false;
                $lastLoginAt = null;
                
                // Use last_login_at as primary source for last activity
                $lastLoginAt = $user->last_login_at;
                
                try {
                    // Check for active sessions in the last 15 minutes
                    $activeSessionsCount = DB::table('sessions')
                        ->where('user_id', $user->id)
                        ->where('last_activity', '>', now()->subMinutes(15)->timestamp)
                        ->count();
                    
                    // Get the most recent session activity
                    $lastSession = DB::table('sessions')
                        ->where('user_id', $user->id)
                        ->orderBy('last_activity', 'desc')
                        ->first();
                    
                    // Determine online status based on active sessions OR recent login
                    $sessionBasedOnline = $activeSessionsCount > 0;
                    $recentLogin = false;
                    
                    if ($user->last_login_at) {
                        $loginTime = \Carbon\Carbon::parse($user->last_login_at);
                        $recentLogin = $loginTime->diffInMinutes(now()) <= 15;
                    }
                    
                    $isOnline = $sessionBasedOnline || $recentLogin;
                    
                    // Use session activity if more recent than last_login_at
                    if ($lastSession && $user->last_login_at) {
                        $sessionTime = \Carbon\Carbon::createFromTimestamp($lastSession->last_activity);
                        $loginTime = \Carbon\Carbon::parse($user->last_login_at);
                        
                        if ($sessionTime->gt($loginTime)) {
                            $lastLoginAt = $sessionTime;
                        }
                    } elseif ($lastSession && !$user->last_login_at) {
                        $lastLoginAt = \Carbon\Carbon::createFromTimestamp($lastSession->last_activity);
                    }
                    
                } catch (\Exception $e) {
                    // Fallback to last_login_at only
                    Log::warning('Sessions table not accessible, using last_login_at for user ' . $user->id . ': ' . $e->getMessage());
                    
                    if ($user->last_login_at) {
                        $loginTime = \Carbon\Carbon::parse($user->last_login_at);
                        $isOnline = $loginTime->diffInMinutes(now()) <= 15;
                        $lastLoginAt = $user->last_login_at;
                    } else {
                        // Final fallback to updated_at
                        $lastLoginAt = $user->updated_at;
                        if ($user->updated_at) {
                            $lastActivity = \Carbon\Carbon::parse($user->updated_at);
                            $isOnline = $lastActivity->diffInMinutes(now()) <= 15;
                        }
                    }
                }
                
                return [
                    'id' => $user->id,
                    'name' => trim($user->firstname . ' ' . $user->lastname),
                    'firstname' => $user->firstname,
                    'lastname' => $user->lastname,
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->is_coordinator ? 'coordinator' : 'faculty',
                    'is_coordinator' => $user->is_coordinator,
                    'is_disabled' => $user->is_disabled,
                    'assigned_strand_id' => $user->assigned_strand_id,
                    'assigned_strand' => $user->assignedStrand ? [
                        'id' => $user->assignedStrand->id,
                        'name' => $user->assignedStrand->name,
                        'code' => $user->assignedStrand->code
                    ] : null,
                    'last_login_at' => $lastLoginAt,
                    'is_online' => $isOnline && !$user->is_disabled
                ];
            });

        // Get all strands for assignment
        $strands = Strand::select('id', 'name', 'code')->orderBy('name')->get();

        // Get active school year status
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        return Inertia::render('Registrar/RegistrarFaculty', [
            'initialTeachers' => $teachers,
            'strands' => $strands,
            'hasActiveSchoolYear' => $activeSchoolYear !== null
        ]);
    }

    // Faculty Creation Method
    public function createFaculty(Request $request)
    {
        $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'middlename' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email',
            'assigned_strand_id' => 'nullable|exists:strands,id',
            'send_email' => 'boolean'
        ]);

        try {
            // Generate a random password
            $password = Str::random(12);

            // Create the faculty user
            $faculty = User::create([
                'firstname' => $request->firstname,
                'lastname' => $request->lastname,
                'middlename' => $request->middlename,
                'email' => $request->email,
                'password' => Hash::make($password),
                'role' => 'faculty',
                'is_coordinator' => false,
                'assigned_strand_id' => $request->assigned_strand_id,
                'email_verified_at' => now(),
            ]);

            $emailSent = false;

            // Send email if requested
            if ($request->send_email) {
                try {
                    Mail::send('emails.faculty_credentials', [
                        'name' => trim($faculty->firstname . ' ' . $faculty->lastname),
                        'email' => $faculty->email,
                        'password' => $password,
                        'login_url' => url('/login')
                    ], function ($message) use ($faculty) {
                        $message->to($faculty->email)
                            ->subject('ONSTS - Faculty Account Created')
                            ->from('onsts.registrar@gmail.com', 'ONSTS Registrar');
                    });
                    $emailSent = true;
                } catch (\Exception $e) {
                    Log::error('Failed to send faculty credentials email: ' . $e->getMessage());
                }
            }

            $message = 'Faculty account created successfully!';
            if ($request->send_email) {
                $message .= $emailSent ? ' Login credentials have been sent to their email.' : ' However, the email could not be sent.';
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to create faculty account: ' . $e->getMessage()]);
        }
    }

    // Faculty Status Toggle Method
    public function toggleFacultyStatus($id)
    {
        try {
            $faculty = User::findOrFail($id);

            // Debug: Log current state
            Log::info('Toggle Faculty Status - Before:', [
                'id' => $faculty->id,
                'name' => $faculty->firstname . ' ' . $faculty->lastname,
                'current_is_coordinator' => $faculty->is_coordinator,
                'role' => $faculty->role
            ]);

            // Ensure the user is faculty or coordinator
            if (!in_array($faculty->role, ['faculty', 'coordinator'])) {
                return redirect()->back()->withErrors(['general' => 'User is not a faculty member or coordinator.']);
            }

            // Toggle the coordinator status
            $newIsCoordinator = !$faculty->is_coordinator;

            // Debug: Log what we're trying to update
            Log::info('Toggle Faculty Status - Attempting Update:', [
                'new_is_coordinator' => $newIsCoordinator
            ]);

            $updateResult = $faculty->update([
                'is_coordinator' => $newIsCoordinator
            ]);

            // Debug: Log update result and verify change
            $faculty->refresh();
            Log::info('Toggle Faculty Status - After Update:', [
                'update_result' => $updateResult,
                'new_is_coordinator_value' => $faculty->is_coordinator,
                'update_successful' => $faculty->is_coordinator === $newIsCoordinator
            ]);

            $newStatus = $newIsCoordinator ? 'coordinator' : 'faculty';
            $statusText = $newIsCoordinator ? 'promoted to coordinator' : 'changed back to faculty';
            $message = "Faculty member {$faculty->firstname} {$faculty->lastname} has been {$statusText} successfully.";

            // If the user being updated is currently logged in, we need to update their session
            $currentUser = Auth::user();
            if ($currentUser && $currentUser->id === $faculty->id) {
                // Update the current user's session data
                Auth::login($faculty);
            }

            return redirect()->back()->with([
                'success' => $message,
                'new_status' => $newStatus,
                'updated_user' => [
                    'id' => $faculty->id,
                    'is_coordinator' => $faculty->is_coordinator,
                    'role' => $faculty->role
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Faculty status toggle failed: ' . $e->getMessage());
            return redirect()->back()->withErrors(['general' => 'Failed to update faculty status: ' . $e->getMessage()]);
        }
    }

    // Faculty Update Method
    public function updateFaculty(Request $request, $id)
    {
        $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'middlename' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'assigned_strand_id' => 'nullable|exists:strands,id',
        ]);

        try {
            $faculty = User::findOrFail($id);
            $faculty->update([
                'firstname' => $request->firstname,
                'lastname' => $request->lastname,
                'middlename' => $request->middlename,
                'email' => $request->email,
                'assigned_strand_id' => $request->assigned_strand_id,
            ]);

            return redirect()->back()->with('success', 'Faculty updated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to update faculty: ' . $e->getMessage()]);
        }
    }

    // Faculty Delete Method
    public function deleteFaculty($id)
    {
        try {
            $faculty = User::findOrFail($id);

            // Check if faculty has assigned sections or classes
            if ($faculty->sections()->count() > 0 || $faculty->classSchedules()->count() > 0) {
                return redirect()->back()->withErrors(['general' => 'Cannot delete faculty. They have assigned sections or classes.']);
            }

            $faculty->delete();

            return redirect()->back()->with('success', 'Faculty deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to delete faculty: ' . $e->getMessage()]);
        }
    }

    /**
     * Get subjects filtered by semester for schedule creation
     */
    public function getSubjectsBySemester($semester)
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $subjects = Subject::with(['strand', 'faculty'])
                ->where('semester', $semester)
                ->orderBy('year_level')
                ->orderBy('name')
                ->get()
                ->map(function ($subject) use ($activeSchoolYear) {
                    return [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                        'semester' => $subject->semester,
                        'semester_display' => $subject->semester == 1 ? '1st Semester (Aug-Dec)' : '2nd Semester (Jan-May)',
                        'year_level' => $subject->year_level,
                        'strand_name' => $subject->strand ? $subject->strand->name : 'No Strand',
                        'strand_id' => $subject->strand_id,
                        'faculty_name' => $subject->faculty ? $subject->faculty->firstname . ' ' . $subject->faculty->lastname : 'Unassigned',
                        'faculty_id' => $subject->faculty_id,
                        'full_display' => "[" . ($subject->semester == 1 ? '1st Sem' : '2nd Sem') . "] " . $subject->code . " - " . $subject->name,
                        'schedule_display' => $subject->code . " - " . $subject->name . " (" . ($subject->semester == 1 ? '1st Sem' : '2nd Sem') . ")"
                    ];
                });

            return response()->json([
                'success' => true,
                'subjects' => $subjects,
                'semester' => $semester,
                'semester_display' => $semester == 1 ? '1st Semester (Aug-Dec)' : '2nd Semester (Jan-May)'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching subjects: ' . $e->getMessage()
            ], 500);
        }
    }

    // Subject Management Methods
    public function createSubject(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20',
            'semester' => 'required|integer|in:1,2',
            'year_level' => 'required|integer|in:11,12',
            'strand_id' => 'required|exists:strands,id',
        ]);

        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            if (!$activeSchoolYear) {
                return redirect()->back()->withErrors(['general' => 'No active school year found. Please create and activate a school year first.']);
            }

            // Check if subject code already exists for this strand and school year
            $existingSubject = Subject::where('code', $request->code)
                ->where('strand_id', $request->strand_id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->first();

            if ($existingSubject) {
                return redirect()->back()->withErrors(['general' => 'A subject with this code already exists for the selected strand.']);
            }

            $subject = Subject::create([
                'name' => $request->name,
                'code' => $request->code,
                'semester' => $request->semester,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
                'school_year_id' => $activeSchoolYear->id,
            ]);

            return redirect()->back()->with('success', 'Subject created successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to create subject: ' . $e->getMessage()]);
        }
    }

    public function updateSubject(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:20',
            'semester' => 'required|integer|in:1,2',
            'year_level' => 'required|integer|in:11,12',
            'strand_id' => 'required|exists:strands,id',
        ]);

        try {
            $subject = Subject::findOrFail($id);
            $subject->update([
                'name' => $request->name,
                'code' => $request->code,
                'semester' => $request->semester,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
            ]);

            return redirect()->back()->with('success', 'Subject updated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to update subject: ' . $e->getMessage()]);
        }
    }

    public function deleteSubject($id)
    {
        try {
            $subject = Subject::findOrFail($id);

            // Check if subject has class schedules
            if ($subject->classSchedules()->count() > 0) {
                return redirect()->back()->withErrors(['general' => 'Cannot delete subject. It has associated class schedules.']);
            }

            $subject->delete();

            return redirect()->back()->with('success', 'Subject deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to delete subject: ' . $e->getMessage()]);
        }
    }

    // Deactivate Expired Semesters Method
    public function deactivateExpired()
    {
        try {
            // Get all active but expired school years
            $expiredSchoolYears = SchoolYear::getActiveExpired();

            if ($expiredSchoolYears->count() === 0) {
                return redirect()->back()->with('message', 'No expired active semesters found.');
            }

            // Deactivate all expired school years
            $count = $expiredSchoolYears->count();
            SchoolYear::whereIn('id', $expiredSchoolYears->pluck('id'))
                ->update(['is_active' => false]);

            Log::info("Deactivated {$count} expired school years", [
                'expired_school_years' => $expiredSchoolYears->pluck('id')->toArray()
            ]);

            return redirect()->back()->with('message', "Successfully deactivated {$count} expired semester(s).");
        } catch (\Exception $e) {
            Log::error('Error deactivating expired school years: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to deactivate expired semesters. Please try again.');
        }
    }

    // Get Semester Status with Timer Information
    public function getSemesterStatus($id = null)
    {
        try {
            $schoolYear = $id ? SchoolYear::findOrFail($id) : SchoolYear::getActive();

            if (!$schoolYear) {
                return response()->json(['error' => 'No school year found'], 404);
            }

            $now = now();
            $endDate = $schoolYear->end_date ? \Carbon\Carbon::parse($schoolYear->end_date) : null;

            $status = [
                'id' => $schoolYear->id,
                'is_active' => $schoolYear->is_active,
                'is_expired' => $schoolYear->isExpired(),
                'end_date' => $endDate ? $endDate->toDateString() : null,
                'end_datetime' => $endDate ? $endDate->toISOString() : null,
                'days_remaining' => $endDate ? $now->diffInDays($endDate, false) : null,
                'hours_remaining' => $endDate ? $now->diffInHours($endDate, false) : null,
                'minutes_remaining' => $endDate ? $now->diffInMinutes($endDate, false) : null,
                'seconds_remaining' => $endDate ? $now->diffInSeconds($endDate, false) : null,
                'time_remaining' => $endDate ? [
                    'days' => max(0, $now->diffInDays($endDate, false)),
                    'hours' => max(0, $now->diff($endDate)->format('%H')),
                    'minutes' => max(0, $now->diff($endDate)->format('%I')),
                    'seconds' => max(0, $now->diff($endDate)->format('%S'))
                ] : null
            ];

            return response()->json($status);
        } catch (\Exception $e) {
            Log::error('Error getting semester status: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get semester status'], 500);
        }
    }

    // Auto-deactivate expired semesters (can be called via cron job)
    public function autoDeactivateExpired()
    {
        try {
            // Get all active but expired school years
            $expiredSchoolYears = SchoolYear::getActiveExpired();

            if ($expiredSchoolYears->count() > 0) {
                $count = $expiredSchoolYears->count();
                SchoolYear::whereIn('id', $expiredSchoolYears->pluck('id'))
                    ->update(['is_active' => false]);

                Log::info("Auto-deactivated {$count} expired school years", [
                    'expired_school_years' => $expiredSchoolYears->pluck('id')->toArray()
                ]);

                return redirect()->back()->with([
                    'success' => true,
                    'message' => "Auto-deactivated {$count} expired semester(s)",
                    'count' => $count
                ]);
            }

            return redirect()->back()->with([
                'success' => true,
                'message' => 'No expired active semesters found',
                'count' => 0
            ]);
        } catch (\Exception $e) {
            Log::error('Error auto-deactivating expired school years: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to auto-deactivate expired semesters');
        }
    }

    // Fix subjects without school year assignment
    public function fixSubjectsSchoolYear()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return redirect()->back()->with('error', 'No active school year found');
            }

            $updated = Subject::whereNull('school_year_id')
                ->update(['school_year_id' => $activeSchoolYear->id]);

            return redirect()->back()->with('success', "Fixed {$updated} subjects - assigned to {$activeSchoolYear->semester}");
        } catch (\Exception $e) {
            Log::error('Error fixing subjects school year: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to fix subjects: ' . $e->getMessage());
        }
    }

    /**
     * Philippine SHS System: Create full academic year (both semesters)
     */
    public function createFullAcademicYear(Request $request)
    {
        
        $request->validate([
            'year_start' => 'required|integer|min:2020|max:2050',
            'year_end' => 'required|integer|min:2020|max:2050',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'enrollment_start' => 'required|date',
            'enrollment_end' => 'required|date|after:enrollment_start'
        ]);

        // Parse dates
        $startDate = \Carbon\Carbon::parse($request->start_date);
        $endDate = \Carbon\Carbon::parse($request->end_date);
        $enrollmentStart = \Carbon\Carbon::parse($request->enrollment_start);
        $enrollmentEnd = \Carbon\Carbon::parse($request->enrollment_end);
        
        // Validate 10-month duration for Full Academic Year
        $durationInMonths = $startDate->diffInMonths($endDate);
        
        if ($durationInMonths < 10) {
            return redirect()->back()->withErrors([
                'end_date' => 'Full Academic Year must be at least 10 months duration. Current duration: ' . $durationInMonths . ' months.'
            ]);
        }
        
        if ($durationInMonths > 11) {
            return redirect()->back()->withErrors([
                'end_date' => 'Full Academic Year cannot exceed 11 months duration. Current duration: ' . $durationInMonths . ' months.'
            ]);
        }

        // Validate enrollment period (1-2 weeks)
        $enrollmentDays = $enrollmentStart->diffInDays($enrollmentEnd);
        
        if ($enrollmentDays < 7) {
            return redirect()->back()->withErrors([
                'enrollment_end' => 'Enrollment period must be at least 1 week (7 days). Current period: ' . $enrollmentDays . ' days.'
            ]);
        }
        
        if ($enrollmentDays > 14) {
            return redirect()->back()->withErrors([
                'enrollment_end' => 'Enrollment period cannot exceed 2 weeks (14 days). Current period: ' . $enrollmentDays . ' days.'
            ]);
        }
        
        // Weekend validation temporarily removed for testing
        // if ($startDate->dayOfWeek === 0 || $startDate->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'start_date' => 'Full Academic Year start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }
        // 
        // if ($endDate->dayOfWeek === 0 || $endDate->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'end_date' => 'Full Academic Year end date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }

        // Weekend restrictions for enrollment dates temporarily removed for testing
        // if ($enrollmentStart->dayOfWeek === 0 || $enrollmentStart->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'enrollment_start' => 'Enrollment start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }
        // 
        // if ($enrollmentEnd->dayOfWeek === 0 || $enrollmentEnd->dayOfWeek === 6) {
        //     return redirect()->back()->withErrors([
        //         'enrollment_end' => 'Enrollment end date cannot be on a weekend. Please select a weekday (Monday - Friday).'
        //     ]);
        // }

        try {
            DB::beginTransaction();

            // Check if school year already exists
            $existingSchoolYear = SchoolYear::where('year_start', $request->year_start)
                ->where('year_end', $request->year_end)
                ->where('semester', 'Full Academic Year')
                ->first();

            if ($existingSchoolYear) {
                DB::rollBack();
                return redirect()->back()->withErrors([
                    'error' => "Full Academic Year {$request->year_start}-{$request->year_end} already exists. Please use a different year range or update the existing school year."
                ]);
            }

            // Deactivate all other school years first
            SchoolYear::where('is_active', true)->update([
                'is_active' => false,
                'is_current_academic_year' => false
            ]);

            // Create single Full Academic Year entry
            $academicYear = SchoolYear::create([
                'year_start' => $request->year_start,
                'year_end' => $request->year_end,
                'semester' => 'Full Academic Year',
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'is_active' => true,
                'enrollment_open' => true,
                'enrollment_start' => $request->enrollment_start,
                'enrollment_end' => $request->enrollment_end,
                'is_current_academic_year' => true,
                'allow_grade_progression' => true
            ]);

            DB::commit();

            return redirect()->back()->with('success', 
                "Full Academic Year {$request->year_start}-{$request->year_end} created successfully!"
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors([
                'error' => 'Failed to create full academic year: ' . $e->getMessage()
            ]);
        }
    }

    // Grade Approval System Methods

    /**
     * Display pending grades for approval
     */
    public function pendingGrades()
    {
        $user = Auth::user();
        
        // ✅ FIXED: Get grades that are actually pending approval
        $pendingGrades = \App\Models\Grade::with([
            'student', 
            'faculty', 
            'subject', 
            'class.section'
        ])
        ->where('approval_status', 'pending_approval')  // ✅ FIXED: Proper approval status
        ->whereNotNull('submitted_for_approval_at')     // ✅ FIXED: Must be submitted
        ->orderBy('submitted_for_approval_at', 'desc')  // ✅ FIXED: Order by submission date
        ->paginate(20);

        return Inertia::render('Registrar/PendingGrades', [
            'pendingGrades' => $pendingGrades,
            'auth' => ['user' => $user]
        ]);
    }

    /**
     * Approve a grade
     */
    public function approveGrade(Request $request, $gradeId)
    {
        $request->validate([
            'approval_notes' => 'nullable|string|max:500'
        ]);

        try {
            $grade = \App\Models\Grade::findOrFail($gradeId);
            $user = Auth::user();

            // Ensure only registrar can approve
            if ($user->role !== 'registrar') {
                return back()->withErrors(['error' => 'Unauthorized to approve grades.']);
            }

            $grade->approve($user->id, $request->approval_notes);

            Log::info('Grade approved', [
                'grade_id' => $gradeId,
                'approved_by' => $user->id,
                'student_id' => $grade->student_id,
                'subject_id' => $grade->subject_id
            ]);

            return back()->with('success', 'Grade approved successfully.');

        } catch (\Exception $e) {
            Log::error('Failed to approve grade: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to approve grade.']);
        }
    }

    /**
     * Reject a grade
     */
    public function rejectGrade(Request $request, $gradeId)
    {
        $request->validate([
            'approval_notes' => 'required|string|max:500'
        ]);

        try {
            $grade = \App\Models\Grade::findOrFail($gradeId);
            $user = Auth::user();

            // Ensure only registrar can reject
            if ($user->role !== 'registrar') {
                return back()->withErrors(['error' => 'Unauthorized to reject grades.']);
            }

            $grade->reject($user->id, $request->approval_notes);

            Log::info('Grade rejected', [
                'grade_id' => $gradeId,
                'rejected_by' => $user->id,
                'student_id' => $grade->student_id,
                'subject_id' => $grade->subject_id,
                'reason' => $request->approval_notes
            ]);

            return back()->with('success', 'Grade rejected successfully.');

        } catch (\Exception $e) {
            Log::error('Failed to reject grade: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to reject grade.']);
        }
    }

    /**
     * Bulk approve grades
     */
    public function bulkApproveGrades(Request $request)
    {
        $request->validate([
            'grade_ids' => 'required|array',
            'grade_ids.*' => 'exists:grades,id',
            'approval_notes' => 'nullable|string|max:500'
        ]);

        try {
            $user = Auth::user();
            
            if ($user->role !== 'registrar') {
                return back()->withErrors(['error' => 'Unauthorized to approve grades.']);
            }

            $approvedCount = 0;
            foreach ($request->grade_ids as $gradeId) {
                $grade = \App\Models\Grade::find($gradeId);
                if ($grade && $grade->isPendingApproval()) {
                    $grade->approve($user->id, $request->approval_notes);
                    $approvedCount++;
                }
            }

            Log::info('Bulk grade approval', [
                'approved_count' => $approvedCount,
                'approved_by' => $user->id
            ]);

            return back()->with('success', "Successfully approved {$approvedCount} grades.");

        } catch (\Exception $e) {
            Log::error('Failed to bulk approve grades: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to approve grades.']);
        }
    }

    /**
     * Bulk reject grades
     */
    public function bulkRejectGrades(Request $request)
    {
        $request->validate([
            'grade_ids' => 'required|array',
            'grade_ids.*' => 'exists:grades,id',
            'approval_notes' => 'required|string|max:500'
        ]);

        try {
            $user = Auth::user();
            
            if ($user->role !== 'registrar') {
                return back()->withErrors(['error' => 'Unauthorized to reject grades.']);
            }

            $rejectedCount = 0;
            foreach ($request->grade_ids as $gradeId) {
                $grade = \App\Models\Grade::find($gradeId);
                if ($grade && $grade->isPendingApproval()) {
                    $grade->reject($user->id, $request->approval_notes);
                    $rejectedCount++;
                }
            }

            Log::info('Bulk grade rejection', [
                'rejected_count' => $rejectedCount,
                'rejected_by' => $user->id
            ]);

            return back()->with('success', "Successfully rejected {$rejectedCount} grades.");

        } catch (\Exception $e) {
            Log::error('Failed to bulk reject grades: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to reject grades.']);
        }
    }

    /**
     * Approve all grades for a specific student
     */
    public function approveStudentGrades(Request $request, $studentId)
    {
        $request->validate([
            'approval_notes' => 'nullable|string|max:500'
        ]);

        try {
            $user = Auth::user();
            
            if ($user->role !== 'registrar') {
                return response()->json(['error' => 'Unauthorized to approve grades.'], 403);
            }

            // Get all pending grades for this student
            $pendingGrades = \App\Models\Grade::where('student_id', $studentId)
                ->where('status', 'pending_approval')
                ->get();

            if ($pendingGrades->isEmpty()) {
                return response()->json(['error' => 'No pending grades found for this student.'], 404);
            }

            $approvedCount = 0;
            foreach ($pendingGrades as $grade) {
                $grade->approve($user->id, $request->approval_notes);
                $approvedCount++;
            }

            Log::info('Student grades bulk approval', [
                'student_id' => $studentId,
                'approved_count' => $approvedCount,
                'approved_by' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => "Successfully approved {$approvedCount} grades for student.",
                'approved_count' => $approvedCount
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to approve student grades: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to approve student grades.'], 500);
        }
    }

    /**
     * Reject all grades for a specific student
     */
    public function rejectStudentGrades(Request $request, $studentId)
    {
        $request->validate([
            'approval_notes' => 'required|string|max:500'
        ]);

        try {
            $user = Auth::user();
            
            if ($user->role !== 'registrar') {
                return response()->json(['error' => 'Unauthorized to reject grades.'], 403);
            }

            // Get all pending grades for this student
            $pendingGrades = \App\Models\Grade::where('student_id', $studentId)
                ->where('status', 'pending_approval')
                ->get();

            if ($pendingGrades->isEmpty()) {
                return response()->json(['error' => 'No pending grades found for this student.'], 404);
            }

            $rejectedCount = 0;
            foreach ($pendingGrades as $grade) {
                $grade->reject($user->id, $request->approval_notes);
                $rejectedCount++;
            }

            Log::info('Student grades bulk rejection', [
                'student_id' => $studentId,
                'rejected_count' => $rejectedCount,
                'rejected_by' => $user->id,
                'reason' => $request->approval_notes
            ]);

            return response()->json([
                'success' => true,
                'message' => "Successfully rejected {$rejectedCount} grades for student.",
                'rejected_count' => $rejectedCount
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to reject student grades: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to reject student grades.'], 500);
        }
    }

    /**
     * Get students with pending grades grouped by student
     */
    public function getStudentsWithPendingGrades()
    {
        try {
            $studentsWithGrades = DB::table('grades')
                ->join('users', 'grades.student_id', '=', 'users.id')
                ->join('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('sections', 'student_personal_info.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('grades.status', 'pending_approval')
                ->select([
                    'users.id as student_id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'student_personal_info.lrn',
                    'student_personal_info.grade_level',
                    'sections.section_name',
                    'strands.name as strand_name',
                    DB::raw('COUNT(grades.id) as pending_grades_count'),
                    DB::raw('MIN(grades.created_at) as earliest_submission'),
                    DB::raw('MAX(grades.updated_at) as latest_submission')
                ])
                ->groupBy([
                    'users.id', 'users.firstname', 'users.lastname', 'users.email',
                    'student_personal_info.lrn', 'student_personal_info.grade_level',
                    'sections.section_name', 'strands.name'
                ])
                ->orderBy('latest_submission', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'students' => $studentsWithGrades
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get students with pending grades: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch student data.'], 500);
        }
    }

    /**
     * ✅ NEW: Registrar-only grade editing method
     */
    public function editGrade(Request $request, $gradeId)
    {
        $request->validate([
            'first_quarter' => 'nullable|numeric|min:0|max:100',
            'second_quarter' => 'nullable|numeric|min:0|max:100',
            'third_quarter' => 'nullable|numeric|min:0|max:100',
            'fourth_quarter' => 'nullable|numeric|min:0|max:100',
            'remarks' => 'nullable|string|max:1000',
            'registrar_notes' => 'required|string|max:500' // Required for audit trail
        ]);

        try {
            $user = Auth::user();
            
            if ($user->role !== 'registrar') {
                return response()->json(['error' => 'Unauthorized. Only registrar can edit grades.'], 403);
            }

            $grade = \App\Models\Grade::findOrFail($gradeId);

            // Calculate new semester grade
            $quarters = array_filter([
                $request->first_quarter,
                $request->second_quarter,
                $request->third_quarter,
                $request->fourth_quarter
            ], function($grade) {
                return $grade !== null && $grade > 0;
            });
            
            $semesterGrade = count($quarters) > 0 ? round(array_sum($quarters) / count($quarters), 2) : null;

            // Update grade with registrar notes
            $grade->update([
                'first_quarter' => $request->first_quarter,
                'second_quarter' => $request->second_quarter,
                'third_quarter' => $request->third_quarter,
                'fourth_quarter' => $request->fourth_quarter,
                'semester_grade' => $semesterGrade,
                'remarks' => $request->remarks,
                'approval_notes' => $request->registrar_notes,
                'approved_by' => $user->id,
                'approved_at' => now(),
                'approval_status' => 'approved',
                'status' => 'approved'
            ]);

            Log::info('Grade edited by registrar', [
                'grade_id' => $gradeId,
                'registrar_id' => $user->id,
                'student_id' => $grade->student_id,
                'subject_id' => $grade->subject_id,
                'old_semester_grade' => $grade->getOriginal('semester_grade'),
                'new_semester_grade' => $semesterGrade,
                'registrar_notes' => $request->registrar_notes
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Grade updated successfully by registrar.',
                'grade' => $grade->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to edit grade: ' . $e->getMessage(), [
                'grade_id' => $gradeId,
                'registrar_id' => $user->id ?? null
            ]);
            
            return response()->json(['error' => 'Failed to update grade.'], 500);
        }
    }

    /**
     * Display settings page
     */
    public function settingsPage()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        // Auto-set enrollment dates if they don't exist
        if ($activeSchoolYear && (!$activeSchoolYear->enrollment_start || !$activeSchoolYear->enrollment_end)) {
            $startDate = now();
            $endDate = now()->addDays(30);
            
            $activeSchoolYear->update([
                'enrollment_start' => $startDate,
                'enrollment_end' => $endDate,
                'enrollment_open' => true
            ]);
            
            Log::info('Auto-set enrollment dates for active school year', [
                'school_year_id' => $activeSchoolYear->id,
                'enrollment_start' => $startDate,
                'enrollment_end' => $endDate
            ]);
            
            // Refresh the model
            $activeSchoolYear = $activeSchoolYear->fresh();
        }
        
        // Get enrollment settings from active school year
        $enrollmentSettings = [
            'enrollment_open' => $activeSchoolYear ? $activeSchoolYear->enrollment_open : false,
            'enrollment_start' => $activeSchoolYear ? $activeSchoolYear->enrollment_start : null,
            'enrollment_end' => $activeSchoolYear ? $activeSchoolYear->enrollment_end : null,
        ];

        return Inertia::render('Registrar/RegistrarSettings', [
            'activeSchoolYear' => $activeSchoolYear,
            'enrollmentSettings' => $enrollmentSettings
        ]);
    }

    /**
     * Toggle enrollment open/close status
     */
    public function toggleEnrollment()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return redirect()->back()->withErrors([
                    'general' => 'No active school year found. Please activate a school year first.'
                ]);
            }

            // Auto-set enrollment dates if they don't exist
            if (!$activeSchoolYear->enrollment_start || !$activeSchoolYear->enrollment_end) {
                $startDate = now();
                $endDate = now()->addDays(30);
                
                $activeSchoolYear->update([
                    'enrollment_start' => $startDate,
                    'enrollment_end' => $endDate
                ]);
                
                Log::info('Auto-set enrollment dates during toggle', [
                    'school_year_id' => $activeSchoolYear->id,
                    'enrollment_start' => $startDate,
                    'enrollment_end' => $endDate
                ]);
            }

            // Toggle the enrollment_open status
            $newStatus = !$activeSchoolYear->enrollment_open;
            $activeSchoolYear->update(['enrollment_open' => $newStatus]);

            Log::info('Enrollment status toggled', [
                'school_year_id' => $activeSchoolYear->id,
                'year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                'old_status' => !$newStatus,
                'new_status' => $newStatus,
                'toggled_by' => Auth::id()
            ]);

            $message = $newStatus 
                ? 'Enrollment has been opened for new Grade 11 students.' 
                : 'Enrollment has been closed for new Grade 11 students.';

            return redirect()->back()->with('success', $message);

        } catch (\Exception $e) {
            Log::error('Error toggling enrollment status: ' . $e->getMessage());
            return redirect()->back()->withErrors([
                'general' => 'Failed to update enrollment status: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Toggle coordinator COR printing permission
     */
    public function toggleCoordinatorCorPrint()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return redirect()->back()->withErrors([
                    'general' => 'No active school year found. Please activate a school year first.'
                ]);
            }

            // Get current status before toggle
            $oldStatus = $activeSchoolYear->allow_coordinator_cor_print;
            
            // Toggle the allow_coordinator_cor_print status
            $newStatus = !$oldStatus;
            
            Log::info('BEFORE Toggle - Coordinator COR printing status', [
                'school_year_id' => $activeSchoolYear->id,
                'current_status' => $oldStatus,
                'will_change_to' => $newStatus
            ]);
            
            $activeSchoolYear->update(['allow_coordinator_cor_print' => $newStatus]);
            
            // Refresh the model to get the updated value
            $activeSchoolYear->refresh();
            
            Log::info('AFTER Toggle - Coordinator COR printing status', [
                'school_year_id' => $activeSchoolYear->id,
                'database_status' => $activeSchoolYear->allow_coordinator_cor_print,
                'expected_status' => $newStatus,
                'toggle_successful' => $activeSchoolYear->allow_coordinator_cor_print === $newStatus,
                'toggled_by' => Auth::id()
            ]);

            $message = $newStatus 
                ? 'Coordinator COR printing has been enabled.' 
                : 'Coordinator COR printing has been disabled.';

            return redirect()->back()->with('success', $message);

        } catch (\Exception $e) {
            Log::error('Error toggling coordinator COR printing permission: ' . $e->getMessage());
            return redirect()->back()->withErrors([
                'general' => 'Failed to update coordinator COR printing permission: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Reports Page
     */
    public function reportsPage()
    {
        return Inertia::render('Registrar/RegistrarReports');
    }

    /**
     * Get filter options for reports
     */
    public function getReportFilterOptions()
    {
        try {
            $schoolYears = SchoolYear::select('id', 'year_start', 'year_end', 'semester')
                ->orderBy('year_start', 'desc')
                ->get();

            $sections = Section::select('id', 'section_name')
                ->orderBy('section_name')
                ->get();

            $strands = Strand::select('id', 'code', 'name')
                ->orderBy('code')
                ->get();

            $faculty = User::select('id', 'firstname', 'lastname')
                ->whereIn('role', ['faculty', 'coordinator'])
                ->orderBy('firstname')
                ->get();

            return response()->json([
                'success' => true,
                'schoolYears' => $schoolYears,
                'sections' => $sections,
                'strands' => $strands,
                'faculty' => $faculty
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching report filter options: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load filter options'
            ], 500);
        }
    }

    /**
     * Generate report based on filters
     */
    public function generateReport(Request $request)
    {
        try {
            $type = $request->get('type', 'students');
            $filters = $request->only(['schoolYear', 'semester', 'section', 'strand', 'faculty', 'gradeLevel']);
            $search = $request->get('search', '');

            if ($type === 'students') {
                return $this->generateStudentReport($filters, $search);
            } elseif ($type === 'grades') {
                return $this->generateGradesReport($filters, $search);
            }

            return response()->json([
                'success' => false,
                'message' => 'Invalid report type'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Error generating report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report'
            ], 500);
        }
    }

    /**
     * Generate student list report
     */
    private function generateStudentReport($filters, $search)
    {
        try {
            // Enhanced query to show all students with proper relationships
            $query = DB::table('users')
                ->leftJoin('enrollments', 'users.id', '=', 'enrollments.student_id')
                ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                ->leftJoin('strands', function($join) {
                    $join->on('enrollments.strand_id', '=', 'strands.id')
                         ->orOn('enrollments.first_strand_choice_id', '=', 'strands.id');
                })
                ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                ->leftJoin('transferee_previous_schools', 'users.id', '=', 'transferee_previous_schools.student_id')
                ->select(
                    'users.id as user_id',
                    'users.firstname',
                    'users.lastname', 
                    'users.email',
                    'users.student_type',
                    'student_personal_info.grade_level',
                    'sections.section_name',
                    'strands.code as strand_code',
                    'strands.name as strand_name',
                    DB::raw("CASE 
                        WHEN school_years.year_start IS NOT NULL AND school_years.year_end IS NOT NULL 
                        THEN CONCAT(school_years.year_start, '-', school_years.year_end, ' (', COALESCE(school_years.semester, 'N/A'), ')') 
                        ELSE 'N/A' 
                    END as school_year"),
                    DB::raw("COALESCE(enrollments.status, 'not_enrolled') as status"),
                    'enrollments.enrollment_date',
                    'transferee_previous_schools.last_school as previous_school',
                    'enrollments.id as enrollment_id'
                )
                ->where('users.role', 'student');

            // Apply filters only if they have values - use whereHas for better filtering
            if (!empty($filters['schoolYear']) && $filters['schoolYear'] !== '') {
                $query->where('enrollments.school_year_id', $filters['schoolYear']);
            }

            if (!empty($filters['section']) && $filters['section'] !== '') {
                $query->where('enrollments.assigned_section_id', $filters['section']);
            }

            if (!empty($filters['strand']) && $filters['strand'] !== '') {
                $query->where(function($q) use ($filters) {
                    $q->where('enrollments.strand_id', $filters['strand'])
                      ->orWhere('enrollments.first_strand_choice_id', $filters['strand']);
                });
            }

            if (!empty($filters['gradeLevel']) && $filters['gradeLevel'] !== '') {
                $query->where('student_personal_info.grade_level', $filters['gradeLevel']);
            }

            // Apply search
            if (!empty($search) && $search !== '') {
                $query->where(function($q) use ($search) {
                    $q->where('users.firstname', 'like', "%{$search}%")
                      ->orWhere('users.lastname', 'like', "%{$search}%")
                      ->orWhere('users.email', 'like', "%{$search}%");
                    
                    // Only search in sections/strands if they exist
                    if (Schema::hasTable('sections')) {
                        $q->orWhere('sections.section_name', 'like', "%{$search}%");
                    }
                    if (Schema::hasTable('strands')) {
                        $q->orWhere('strands.name', 'like', "%{$search}%");
                    }
                });
            }

            // Add debugging information
            $hasFilters = !empty(array_filter($filters)) || !empty($search);
            
            // Get results with proper ordering
            $students = $query->orderBy('users.lastname')->get();
            
            // If no results and no filters applied, get all students as fallback
            if ($students->isEmpty() && !$hasFilters) {
                Log::info('No students found with joins, trying fallback query');
                $students = DB::table('users')
                    ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                    ->select(
                        'users.id as user_id',
                        'users.firstname',
                        'users.lastname', 
                        'users.email',
                        'users.student_type',
                        'student_personal_info.grade_level',
                        DB::raw("'N/A' as section_name"),
                        DB::raw("'N/A' as strand_code"),
                        DB::raw("'N/A' as strand_name"),
                        DB::raw("'N/A' as school_year"),
                        DB::raw("'not_enrolled' as status"),
                        DB::raw("NULL as enrollment_date"),
                        DB::raw("NULL as previous_school"),
                        DB::raw("NULL as enrollment_id")
                    )
                    ->where('users.role', 'student')
                    ->orderBy('users.lastname')
                    ->get();
            }

            // Log detailed query information for debugging
            Log::info('Student report query executed', [
                'filters_applied' => $filters,
                'search_term' => $search,
                'has_filters' => $hasFilters,
                'result_count' => $students->count(),
                'total_students_in_db' => DB::table('users')->where('role', 'student')->count(),
                'sample_students' => $students->take(3)->toArray(),
                'query_method_used' => $students->isEmpty() && !$hasFilters ? 'fallback' : 'main'
            ]);

            // Calculate statistics
            $statistics = [
                'totalStudents' => $students->count(),
                'enrolledStudents' => $students->where('status', 'enrolled')->count(),
                'pendingStudents' => $students->where('status', 'pending')->count(),
                'rejectedStudents' => $students->where('status', 'rejected')->count(),
                'approvedStudents' => $students->where('status', 'approved')->count(),
                'notEnrolledStudents' => $students->where('status', 'not_enrolled')->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $students,
                'statistics' => $statistics,
                'debug_info' => [
                    'query_executed' => true,
                    'filters_applied' => $hasFilters,
                    'total_db_students' => DB::table('users')->where('role', 'student')->count()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in generateStudentReport: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            // Return a simple fallback response
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'data' => [],
                'statistics' => [
                    'totalStudents' => 0,
                    'enrolledStudents' => 0,
                    'pendingStudents' => 0,
                    'rejectedStudents' => 0
                ]
            ]);
        }
    }

    /**
     * Generate grades report
     */
    private function generateGradesReport($filters, $search)
    {
        try {
            // Check if grades table exists
            if (!Schema::hasTable('grades')) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'statistics' => [
                        'totalGrades' => 0,
                        'passedGrades' => 0,
                        'failedGrades' => 0,
                        'averageGrade' => 0,
                        'transfereeGrades' => 0,
                        'regularGrades' => 0
                    ]
                ]);
            }

            // Get regular grades from current enrollment
            $regularGradesQuery = DB::table('grades')
                ->join('users', 'grades.student_id', '=', 'users.id')
                ->leftJoin('class', 'grades.class_id', '=', 'class.id')
                ->leftJoin('subjects', 'class.subject_id', '=', 'subjects.id')
                ->leftJoin('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('school_years', 'grades.school_year_id', '=', 'school_years.id')
                ->leftJoin('users as faculty', 'class.faculty_id', '=', 'faculty.id')
                ->select(
                    DB::raw("CONCAT(COALESCE(users.firstname, ''), ' ', COALESCE(users.lastname, '')) as student_name"),
                    DB::raw("COALESCE(subjects.name, 'Unknown Subject') as subject_name"),
                    DB::raw("COALESCE(sections.section_name, 'N/A') as section_name"),
                    DB::raw("CONCAT(COALESCE(faculty.firstname, ''), ' ', COALESCE(faculty.lastname, '')) as faculty_name"),
                    'grades.semester',
                    'grades.semester_grade',
                    'grades.approval_status',
                    'grades.created_at',
                    DB::raw("'regular' as grade_type"),
                    DB::raw("NULL as previous_school")
                )
                ->where('users.role', 'student');

            // Get transferee credited subjects (transferee_grades) - only if table exists
            $transfereeGrades = collect([]);
            if (Schema::hasTable('transferee_credited_subjects')) {
                $transfereeGradesQuery = DB::table('transferee_credited_subjects')
                    ->join('users', 'transferee_credited_subjects.student_id', '=', 'users.id')
                    ->join('subjects', 'transferee_credited_subjects.subject_id', '=', 'subjects.id')
                    ->leftJoin('transferee_previous_schools', 'transferee_credited_subjects.student_id', '=', 'transferee_previous_schools.student_id')
                    ->select(
                        DB::raw("CONCAT(users.firstname, ' ', users.lastname) as student_name"),
                        'subjects.name as subject_name',
                        DB::raw("'Transferee' as section_name"),
                        DB::raw("'Previous School' as faculty_name"),
                        'transferee_credited_subjects.semester',
                        'transferee_credited_subjects.grade as semester_grade',
                        DB::raw("'approved' as approval_status"),
                        'transferee_credited_subjects.created_at',
                        DB::raw("'transferee' as grade_type"),
                        'transferee_previous_schools.last_school as previous_school'
                    )
                    ->where('users.role', 'student');
                
                $transfereeGrades = $transfereeGradesQuery->get();
            }

            // Get regular grades
            $regularGrades = $regularGradesQuery->get();
            
            // Merge the collections
            $allGrades = $regularGrades->merge($transfereeGrades);

            // Simple processing for now
            $processedGrades = $allGrades->map(function($grade) {
                return [
                    'student_name' => $grade->student_name,
                    'subject_name' => $grade->subject_name,
                    'section_name' => $grade->section_name,
                    'faculty_name' => $grade->faculty_name ?? 'N/A',
                    'first_sem_avg' => $grade->semester === '1st' ? $grade->semester_grade : null,
                    'second_sem_avg' => $grade->semester === '2nd' ? $grade->semester_grade : null,
                    'final_grade' => $grade->semester_grade,
                    'remarks' => $grade->semester_grade >= 75 ? 'Passed' : 'Failed',
                    'grade_source' => $grade->grade_type === 'transferee' ? 'Transferee Credit' : 'Regular',
                    'previous_school' => $grade->previous_school ?? null
                ];
            });

            // Calculate statistics
            $statistics = [
                'totalGrades' => $processedGrades->count(),
                'passedGrades' => $processedGrades->where('final_grade', '>=', 75)->count(),
                'failedGrades' => $processedGrades->where('final_grade', '<', 75)->count(),
                'averageGrade' => $processedGrades->where('final_grade', '!=', null)->avg('final_grade'),
                'transfereeGrades' => $processedGrades->where('grade_source', 'like', '%Transferee%')->count(),
                'regularGrades' => $processedGrades->where('grade_source', 'Regular')->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $processedGrades->values()->all(),
                'statistics' => $statistics
            ]);

        } catch (\Exception $e) {
            Log::error('Error in generateGradesReport: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'data' => [],
                'statistics' => [
                    'totalGrades' => 0,
                    'passedGrades' => 0,
                    'failedGrades' => 0,
                    'averageGrade' => 0,
                    'transfereeGrades' => 0,
                    'regularGrades' => 0
                ]
            ]);
        }
    }

    /**
     * Export report to PDF or Excel
     */
    public function exportReport(Request $request)
    {
        try {
            $type = $request->get('type', 'students');
            $format = $request->get('format', 'xlsx');
            $filters = $request->only(['schoolYear', 'semester', 'section', 'strand', 'faculty', 'gradeLevel']);
            $search = $request->get('search', '');

            // Generate the report data
            if ($type === 'students') {
                $reportResponse = $this->generateStudentReport($filters, $search);
            } elseif ($type === 'grades') {
                $reportResponse = $this->generateGradesReport($filters, $search);
            } else {
                return response()->json(['error' => 'Invalid report type'], 400);
            }

            $reportData = json_decode($reportResponse->getContent(), true);
            
            if (!$reportData['success']) {
                return response()->json(['error' => 'Failed to generate report data'], 500);
            }

            $data = $reportData['data'];

            if ($format === 'xlsx') {
                return $this->exportToExcel($data, $type);
            } elseif ($format === 'pdf') {
                return $this->exportToPdf($data, $type);
            }

            return response()->json(['error' => 'Invalid export format'], 400);

        } catch (\Exception $e) {
            Log::error('Error exporting report: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to export report'], 500);
        }
    }

    /**
     * Export data to Excel format
     */
    private function exportToExcel($data, $type)
    {
        $filename = $type . '_report_' . date('Y-m-d') . '.xlsx';
        
        if ($type === 'students') {
            $headers = [
                'Student Name', 'Email', 'Student Type', 'Grade Level', 'Section', 'Strand', 'School Year', 'Status', 'Previous School', 'Enrollment Date'
            ];
            
            $csvContent = implode(',', $headers) . "\n";
            
            foreach ($data as $student) {
                $row = [
                    $student['firstname'] . ' ' . $student['lastname'],
                    $student['email'],
                    $student['student_type'] === 'transferee' ? 'Transferee' : 'Regular',
                    'Grade ' . $student['grade_level'],
                    $student['section_name'] ?? 'N/A',
                    ($student['strand_code'] ?? '') . ' - ' . ($student['strand_name'] ?? ''),
                    $student['school_year'],
                    ucfirst($student['status']),
                    $student['previous_school'] ?? 'N/A',
                    $student['enrollment_date'] ?? 'N/A'
                ];
                $csvContent .= '"' . implode('","', $row) . '"' . "\n";
            }
        } else {
            $headers = [
                'Student Name', 'Subject', 'Section', 'Faculty', '1st Sem AVG', '2nd Sem AVG', 'Final Grade', 'Grade Source', 'Previous School', 'Remarks'
            ];
            
            $csvContent = implode(',', $headers) . "\n";
            
            foreach ($data as $grade) {
                $row = [
                    $grade['student_name'],
                    $grade['subject_name'],
                    $grade['section_name'] ?? 'N/A',
                    $grade['faculty_name'] ?? 'N/A',
                    $grade['first_sem_avg'] ?? 'N/A',
                    $grade['second_sem_avg'] ?? 'N/A',
                    $grade['final_grade'] ?? 'N/A',
                    $grade['grade_source'] ?? 'Regular',
                    $grade['previous_school'] ?? 'N/A',
                    $grade['remarks']
                ];
                $csvContent .= '"' . implode('","', $row) . '"' . "\n";
            }
        }

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    }

    /**
     * Export data to PDF format
     */
    private function exportToPdf($data, $type)
    {
        $filename = $type . '_report_' . date('Y-m-d') . '.pdf';
        
        // For now, return CSV format as PDF generation requires additional libraries
        // This can be enhanced with libraries like DomPDF or TCPDF
        return $this->exportToExcel($data, $type);
    }

    /**
     * Fix enrollment and class assignment issues
     */
    public function fixEnrollmentIssues()
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found'
                ]);
            }

            $results = [
                'fixed_enrollments' => 0,
                'created_class_details' => 0,
                'created_missing_classes' => 0,
                'issues_found' => []
            ];

            // Step 1: Find enrollments without assigned sections
            $enrollmentsWithoutSections = DB::table('enrollments')
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('status', 'enrolled')
                ->whereNull('assigned_section_id')
                ->get();

            Log::info('Found enrollments without sections', [
                'count' => $enrollmentsWithoutSections->count(),
                'enrollments' => $enrollmentsWithoutSections->pluck('id')->toArray()
            ]);

            foreach ($enrollmentsWithoutSections as $enrollment) {
                // Try to find a matching section
                $matchingSection = DB::table('sections')
                    ->where('strand_id', $enrollment->strand_id)
                    ->where('school_year_id', $activeSchoolYear->id)
                    ->first();

                if ($matchingSection) {
                    // Update enrollment with section assignment
                    DB::table('enrollments')
                        ->where('id', $enrollment->id)
                        ->update(['assigned_section_id' => $matchingSection->id]);

                    $results['fixed_enrollments']++;

                    Log::info('Fixed enrollment section assignment', [
                        'enrollment_id' => $enrollment->id,
                        'student_id' => $enrollment->student_id,
                        'section_id' => $matchingSection->id,
                        'section_name' => $matchingSection->section_name
                    ]);
                } else {
                    $results['issues_found'][] = "No matching section found for enrollment {$enrollment->id} with strand {$enrollment->strand_id}";
                }
            }

            // Step 2: Find all enrolled students and ensure they have class_details
            $allEnrolledStudents = DB::table('enrollments')
                ->where('school_year_id', $activeSchoolYear->id)
                ->where('status', 'enrolled')
                ->whereNotNull('assigned_section_id')
                ->get();

            Log::info('Processing enrolled students for class_details', [
                'count' => $allEnrolledStudents->count()
            ]);

            foreach ($allEnrolledStudents as $enrollment) {
                // Check if student has class_details
                $hasClassDetails = DB::table('class_details')
                    ->where('enrollment_id', $enrollment->id)
                    ->exists();

                if (!$hasClassDetails) {
                    // Create class_details for this enrollment
                    $classSchedules = DB::table('class')
                        ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                        ->where('class.section_id', $enrollment->assigned_section_id)
                        ->where('class.school_year_id', $activeSchoolYear->id)
                        ->where('subjects.strand_id', $enrollment->strand_id)
                        ->where('class.is_active', true)
                        ->select('class.id as class_id')
                        ->get();

                    if ($classSchedules->count() > 0) {
                        foreach ($classSchedules as $class) {
                            DB::table('class_details')->updateOrInsert(
                                [
                                    'class_id' => $class->class_id,
                                    'enrollment_id' => $enrollment->id
                                ],
                                [
                                    'student_id' => $enrollment->student_id,
                                    'section_id' => $enrollment->assigned_section_id,
                                    'is_enrolled' => true,
                                    'enrolled_at' => now(),
                                    'created_at' => now(),
                                    'updated_at' => now()
                                ]
                            );
                            $results['created_class_details']++;
                        }

                        Log::info('Created class_details for enrollment', [
                            'enrollment_id' => $enrollment->id,
                            'student_id' => $enrollment->student_id,
                            'class_details_created' => $classSchedules->count()
                        ]);
                    } else {
                        $results['issues_found'][] = "No classes found for enrollment {$enrollment->id} in section {$enrollment->assigned_section_id} with strand {$enrollment->strand_id}";
                    }
                }
            }

            // Step 3: Check for missing class records and create them if needed
            $sections = DB::table('sections')
                ->where('school_year_id', $activeSchoolYear->id)
                ->get();

            foreach ($sections as $section) {
                $strandSubjects = DB::table('subjects')
                    ->where('strand_id', $section->strand_id)
                    ->get();

                foreach ($strandSubjects as $subject) {
                    $classExists = DB::table('class')
                        ->where('section_id', $section->id)
                        ->where('subject_id', $subject->id)
                        ->where('school_year_id', $activeSchoolYear->id)
                        ->exists();

                    if (!$classExists) {
                        // Find a faculty member who can teach this subject
                        $faculty = DB::table('users')
                            ->where('role', 'faculty')
                            ->first();

                        if ($faculty) {
                            DB::table('class')->insert([
                                'section_id' => $section->id,
                                'subject_id' => $subject->id,
                                'faculty_id' => $faculty->id,
                                'school_year_id' => $activeSchoolYear->id,
                                'day_of_week' => 'Monday',
                                'start_time' => '08:00:00',
                                'duration' => 120,
                                'end_time' => '10:00:00',
                                'semester' => 1,
                                'school_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end,
                                'is_active' => true,
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);

                            $results['created_missing_classes']++;

                            Log::info('Created missing class record', [
                                'section_id' => $section->id,
                                'subject_id' => $subject->id,
                                'faculty_id' => $faculty->id
                            ]);
                        }
                    }
                }
            }

            $message = "Fixed {$results['fixed_enrollments']} enrollments, created {$results['created_class_details']} class detail records, and {$results['created_missing_classes']} missing class records.";
            
            if (!empty($results['issues_found'])) {
                $message .= " Issues found: " . implode('; ', $results['issues_found']);
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'results' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Error fixing enrollment issues: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fixing enrollment issues: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Faculty Assignment Management Methods
     * Following HCI Principle 2: Match between system and real world - Role-based assignments
     */
    
    /**
     * Get faculty assignments data
     */
    public function getFacultyAssignments(Request $request)
    {
        try {
            $schoolYearId = $request->input('school_year_id');
            
            if (!$schoolYearId) {
                return response()->json(['error' => 'School year ID is required'], 400);
            }
            
            // Get adviser assignments
            $adviserAssignments = Section::where('school_year_id', $schoolYearId)
                ->whereNotNull('adviser_id')
                ->with(['adviser', 'strand'])
                ->get()
                ->map(function($section) {
                    $studentCount = Enrollment::where('assigned_section_id', $section->id)
                        ->whereIn('status', ['enrolled', 'approved'])
                        ->count();
                        
                    return [
                        'id' => $section->id,
                        'faculty_id' => $section->adviser_id,
                        'faculty_name' => $section->adviser->firstname . ' ' . $section->adviser->lastname,
                        'section_id' => $section->id,
                        'section_name' => $section->section_name,
                        'strand_name' => $section->strand->name ?? 'N/A',
                        'student_count' => $studentCount,
                        'assignment_type' => 'adviser'
                    ];
                });
            
            // Get teaching assignments
            $teachingAssignments = ClassSchedule::where('school_year_id', $schoolYearId)
                ->where('is_active', true)
                ->with(['faculty', 'subject', 'section'])
                ->get()
                ->groupBy('faculty_id')
                ->map(function($assignments, $facultyId) {
                    $faculty = $assignments->first()->faculty;
                    $subjects = $assignments->pluck('subject.name')->toArray();
                    
                    return [
                        'id' => $facultyId,
                        'faculty_id' => $facultyId,
                        'faculty_name' => $faculty->firstname . ' ' . $faculty->lastname,
                        'subject_count' => count($subjects),
                        'subjects' => $subjects,
                        'assignment_type' => 'teaching'
                    ];
                })
                ->values();
            
            return response()->json([
                'adviser_assignments' => $adviserAssignments,
                'teaching_assignments' => $teachingAssignments
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting faculty assignments: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load assignments'], 500);
        }
    }
    
    /**
     * Assign faculty as section adviser
     * Following HCI Principle 5: Error prevention - Validate assignments
     */
    public function assignAdviser(Request $request)
    {
        try {
            $validated = $request->validate([
                'faculty_id' => 'required|exists:users,id',
                'section_id' => 'required|exists:sections,id',
                'school_year_id' => 'required|exists:school_years,id'
            ]);
            
            // Check if faculty exists and has correct role
            $faculty = User::where('id', $validated['faculty_id'])
                ->where('role', 'faculty')
                ->first();
                
            if (!$faculty) {
                return response()->json(['error' => 'Faculty member not found'], 404);
            }
            
            // Check if section already has an adviser
            $section = Section::find($validated['section_id']);
            if ($section->adviser_id) {
                return response()->json([
                    'error' => 'Section already has an adviser assigned. Please remove the current adviser first.'
                ], 400);
            }
            
            // Check if faculty is already an adviser for another section in the same school year
            $existingAdviserAssignment = Section::where('school_year_id', $validated['school_year_id'])
                ->where('adviser_id', $validated['faculty_id'])
                ->first();
                
            if ($existingAdviserAssignment) {
                return response()->json([
                    'error' => 'Faculty member is already an adviser for section ' . $existingAdviserAssignment->section_name
                ], 400);
            }
            
            DB::beginTransaction();
            
            // Assign adviser to section
            $section->adviser_id = $validated['faculty_id'];
            $section->save();
            
            DB::commit();
            
            Log::info('Adviser assigned successfully', [
                'faculty_id' => $validated['faculty_id'],
                'section_id' => $validated['section_id'],
                'assigned_by' => Auth::id()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Faculty member assigned as adviser successfully',
                'assignment' => [
                    'faculty_name' => $faculty->firstname . ' ' . $faculty->lastname,
                    'section_name' => $section->section_name
                ]
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error assigning adviser: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to assign adviser'], 500);
        }
    }
    
    /**
     * Assign teaching subjects to faculty (up to 4 subjects)
     * Following HCI Principle 5: Error prevention - Limit to 4 subjects
     */
    public function assignTeaching(Request $request)
    {
        try {
            $validated = $request->validate([
                'faculty_id' => 'required|exists:users,id',
                'subject_ids' => 'required|array|max:4',
                'subject_ids.*' => 'exists:subjects,id',
                'section_id' => 'required|exists:sections,id',
                'school_year_id' => 'required|exists:school_years,id'
            ]);
            
            // Check if faculty exists
            $faculty = User::where('id', $validated['faculty_id'])
                ->where('role', 'faculty')
                ->first();
                
            if (!$faculty) {
                return response()->json(['error' => 'Faculty member not found'], 404);
            }
            
            // Check current teaching load (should not exceed 4 subjects)
            $currentAssignments = ClassSchedule::where('faculty_id', $validated['faculty_id'])
                ->where('school_year_id', $validated['school_year_id'])
                ->where('is_active', true)
                ->count();
                
            if ($currentAssignments + count($validated['subject_ids']) > 4) {
                return response()->json([
                    'error' => 'Faculty member would exceed maximum of 4 subject assignments. Current: ' . $currentAssignments
                ], 400);
            }
            
            DB::beginTransaction();
            
            $createdAssignments = [];
            
            foreach ($validated['subject_ids'] as $subjectId) {
                // Check if this subject is already assigned to this faculty in this section
                $existingAssignment = ClassSchedule::where('faculty_id', $validated['faculty_id'])
                    ->where('subject_id', $subjectId)
                    ->where('section_id', $validated['section_id'])
                    ->where('school_year_id', $validated['school_year_id'])
                    ->first();
                    
                if ($existingAssignment) {
                    continue; // Skip if already assigned
                }
                
                // Create class schedule entry
                $schedule = ClassSchedule::create([
                    'faculty_id' => $validated['faculty_id'],
                    'subject_id' => $subjectId,
                    'section_id' => $validated['section_id'],
                    'school_year_id' => $validated['school_year_id'],
                    'day_of_week' => 'Monday', // Default - can be updated later
                    'start_time' => '08:00:00', // Default - can be updated later
                    'end_time' => '10:00:00', // Default - can be updated later
                    'semester' => 1, // Default - can be updated later
                    'is_active' => true
                ]);
                
                $createdAssignments[] = $schedule;
            }
            
            DB::commit();
            
            Log::info('Teaching assignments created successfully', [
                'faculty_id' => $validated['faculty_id'],
                'subject_count' => count($createdAssignments),
                'assigned_by' => Auth::id()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Teaching assignments created successfully',
                'assignments_created' => count($createdAssignments),
                'faculty_name' => $faculty->firstname . ' ' . $faculty->lastname
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error assigning teaching subjects: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to assign teaching subjects'], 500);
        }
    }
    
    /**
     * Remove adviser assignment
     */
    public function removeAdviser(Request $request)
    {
        try {
            $validated = $request->validate([
                'assignment_id' => 'required|exists:sections,id'
            ]);
            
            $section = Section::find($validated['assignment_id']);
            
            if (!$section->adviser_id) {
                return response()->json(['error' => 'Section does not have an adviser assigned'], 400);
            }
            
            DB::beginTransaction();
            
            $section->adviser_id = null;
            $section->save();
            
            DB::commit();
            
            Log::info('Adviser assignment removed', [
                'section_id' => $section->id,
                'removed_by' => Auth::id()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Adviser assignment removed successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error removing adviser assignment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to remove adviser assignment'], 500);
        }
    }
    
    /**
     * Remove teaching assignments
     */
    public function removeTeaching(Request $request)
    {
        try {
            $validated = $request->validate([
                'assignment_id' => 'required|exists:users,id' // Faculty ID
            ]);
            
            DB::beginTransaction();
            
            // Remove all teaching assignments for this faculty
            $removedCount = ClassSchedule::where('faculty_id', $validated['assignment_id'])
                ->where('is_active', true)
                ->update(['is_active' => false]);
            
            DB::commit();
            
            Log::info('Teaching assignments removed', [
                'faculty_id' => $validated['assignment_id'],
                'removed_count' => $removedCount,
                'removed_by' => Auth::id()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Teaching assignments removed successfully',
                'removed_count' => $removedCount
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error removing teaching assignments: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to remove teaching assignments'], 500);
        }
    }

}
