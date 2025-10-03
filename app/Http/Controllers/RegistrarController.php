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
                'class.room',
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
                'sections' => Section::with(['strand', 'teacher'])->orderBy('section_name')->get(),
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
        $sections = Section::with(['strand', 'teacher'])->orderBy('section_name')->get();

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

        // Weekend Validation (Saturday = 6, Sunday = 0)
        $startDate = \Carbon\Carbon::parse($validated['start_date']);
        $endDate = \Carbon\Carbon::parse($validated['end_date']);
        
        if ($startDate->dayOfWeek === 0 || $startDate->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'start_date' => 'Start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }
        
        if ($endDate->dayOfWeek === 0 || $endDate->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'end_date' => 'End date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }

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

        // Weekend Validation (Saturday = 6, Sunday = 0)
        $startDate = \Carbon\Carbon::parse($validated['start_date']);
        $endDate = \Carbon\Carbon::parse($validated['end_date']);
        
        if ($startDate->dayOfWeek === 0 || $startDate->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'start_date' => 'Summer start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }
        
        if ($endDate->dayOfWeek === 0 || $endDate->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'end_date' => 'Summer end date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }

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
        $sections = Section::with(['strand', 'teacher'])
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
                    'teacher_id' => $section->teacher_id,
                    'teacher_name' => $section->teacher ? $section->teacher->name : 'No Teacher Assigned',
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
        $sections = Section::with(['strand', 'teacher'])->orderBy('section_name')->get();

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
                    'room' => $schedule->room ?? 'TBA',
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

    // Students Management Method
    public function studentsPage()
    {
        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        Log::info('Active school year for students query', [
            'school_year' => $activeSchoolYear ? $activeSchoolYear->toArray() : null
        ]);
        
        if (!$activeSchoolYear) {
            return Inertia::render('Registrar/RegistrarStudents', [
                'students' => collect([]),
                'allowFacultyCorPrint' => true,
                'auth' => [
                    'user' => Auth::user()
                ]
            ]);
        }

        // Get all students with their enrollment data
        $students = DB::table('enrollments')
            ->join('student_personal_info', 'enrollments.student_id', '=', 'student_personal_info.id')
            ->join('users', 'student_personal_info.user_id', '=', 'users.id')
            ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
            ->leftJoin('strands', 'enrollments.strand_id', '=', 'strands.id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->where('enrollments.student_id', '>', 0) // Exclude invalid student_id = 0
            ->select([
                'student_personal_info.id',
                'student_personal_info.user_id',
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
                'enrollments.status as enrollment_status'
            ])
            ->get();

        // Debug: Log the query results
        Log::info('Students query results', [
            'count' => $students->count(),
            'students' => $students->toArray()
        ]);

        // Get all students with enrollment records (regardless of specific status)
        // Since we removed the approved students tab, we'll show all enrolled students
        $enrolledStudents = $students; // Show all students with enrollment records
        $allStudents = $students;

        return Inertia::render('Registrar/RegistrarStudents', [
            'enrolledStudents' => $enrolledStudents->map(function($student) {
                return [
                    'id' => $student->id,
                    'user_id' => $student->user_id,
                    'name' => ($student->firstname ?? '') . ' ' . ($student->lastname ?? ''),
                    'firstname' => $student->firstname ?? '',
                    'lastname' => $student->lastname ?? '',
                    'email' => $student->email ?? '',
                    'student_id' => $student->lrn ?? 'N/A',
                    'lrn' => $student->lrn ?? 'N/A',
                    'birthdate' => $student->birthdate ?? 'N/A',
                    'grade_level' => $student->grade_level ?? 11,
                    'section' => $student->section_name ?? 'Unassigned',
                    'section_name' => $student->section_name ?? 'Unassigned',
                    'strand' => $student->strand_code ?? 'N/A',
                    'strand_name' => $student->strand_code ?? 'N/A',
                    'strand_code' => $student->strand_code ?? 'N/A',
                    'enrollment_status' => $student->enrollment_status ?? 'unknown',
                ];
            })->values(),
            'strands' => Strand::orderBy('name')->get(),
            'sections' => Section::with('strand')->orderBy('section_name')->get(),
            'allowFacultyCorPrint' => (bool)($activeSchoolYear->allow_faculty_cor_print ?? true),
            'auth' => [
                'user' => Auth::user()
            ]
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
        $sectionsQuery = Section::with(['strand', 'teacher', 'schoolYear']);

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
                    'teacher_name' => $section->teacher ? $section->teacher->firstname . ' ' . $section->teacher->lastname : 'No Teacher',
                    'teacher_id' => $section->teacher_id,
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
            'teacher_id' => [
                'nullable',
                'exists:users,id',
                Rule::unique('sections')->where(function ($query) use ($request) {
                    return $query->whereNotNull('teacher_id');
                })->ignore($request->id ?? null)
            ],
        ], [
            'section_name.unique' => 'A section with this name already exists for the selected strand and year level.',
            'teacher_id.unique' => 'This teacher is already assigned to another section.',
        ]);

        try {
            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();

            // Check if teacher is already assigned within the same school year
            if ($request->teacher_id) {
                $existingAssignment = Section::where('teacher_id', $request->teacher_id)
                    ->when($activeSchoolYear, function ($query) use ($activeSchoolYear) {
                        $query->where(function ($subQuery) use ($activeSchoolYear) {
                            $subQuery->where('school_year_id', $activeSchoolYear->id)
                                ->orWhereNull('school_year_id');
                        });
                    })
                    ->first();

                if ($existingAssignment) {
                    $teacher = User::find($request->teacher_id);
                    return redirect()->back()->withErrors([
                        'teacher_id' => "Teacher {$teacher->firstname} {$teacher->lastname} is already assigned to section {$existingAssignment->section_name}"
                    ]);
                }
            }

            $section = Section::create([
                'section_name' => $request->section_name,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
                'teacher_id' => $request->teacher_id,
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
            'teacher_id' => 'nullable|exists:users,id',
        ]);

        try {
            $section = Section::findOrFail($id);
            $section->update([
                'section_name' => $request->section_name,
                'year_level' => $request->year_level,
                'strand_id' => $request->strand_id,
                'teacher_id' => $request->teacher_id,
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

    public function updateStudent(Request $request, $id)
    {
        $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'middlename' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
        ]);

        try {
            $student = User::findOrFail($id);
            $student->update([
                'firstname' => $request->firstname,
                'lastname' => $request->lastname,
                'middlename' => $request->middlename,
                'email' => $request->email,
            ]);

            return redirect()->back()->with('success', 'Student updated successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to update student: ' . $e->getMessage()]);
        }
    }

    public function deleteStudent($id)
    {
        try {
            $student = User::findOrFail($id);

            // Check if student has enrollments
            if ($student->enrollments()->count() > 0) {
                return redirect()->back()->withErrors(['general' => 'Cannot delete student. They have enrollment records.']);
            }

            $student->delete();

            return redirect()->back()->with('success', 'Student deleted successfully');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => 'Failed to delete student: ' . $e->getMessage()]);
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
                'email_verified_at' => now()
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

            return redirect()->back()->with([
                'success' => $message,
                'new_status' => $newStatus
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
        
        if ($startDate->dayOfWeek === 0 || $startDate->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'start_date' => 'Full Academic Year start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }
        
        if ($endDate->dayOfWeek === 0 || $endDate->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'end_date' => 'Full Academic Year end date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }

        // Validate weekend restrictions for enrollment dates
        if ($enrollmentStart->dayOfWeek === 0 || $enrollmentStart->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'enrollment_start' => 'Enrollment start date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }
        
        if ($enrollmentEnd->dayOfWeek === 0 || $enrollmentEnd->dayOfWeek === 6) {
            return redirect()->back()->withErrors([
                'enrollment_end' => 'Enrollment end date cannot be on a weekend. Please select a weekday (Monday - Friday).'
            ]);
        }

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
        
        // Get all pending grades with relationships
        $pendingGrades = \App\Models\Grade::with([
            'student.user', 
            'faculty', 
            'subject', 
            'class.section'
        ])
        ->pendingApproval()
        ->orderBy('submitted_for_approval_at', 'desc')
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
     * Display settings page
     */
    public function settingsPage()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
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

}
