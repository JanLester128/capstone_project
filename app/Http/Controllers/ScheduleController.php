<?php

namespace App\Http\Controllers;

use App\Models\ClassSchedule;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Student;
use App\Models\User;
use App\Models\Strand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    /**
     * Display schedule management page for registrar
     */
    public function index()
    {
        // Philippine SHS System: Use current academic year for schedule display (always visible)
        $currentAcademicYear = SchoolYear::getCurrentAcademicYear() ?? SchoolYear::where('is_active', true)->first();
        $currentYear = $currentAcademicYear ? 
            ($currentAcademicYear->year_start . '-' . $currentAcademicYear->year_end) : 
            date('Y') . '-' . (date('Y') + 1);

        // Get schedules filtered by active school year (with historical support)
        $schedulesQuery = ClassSchedule::with([
            'section.strand', 
            'subject' => function($query) {
                $query->select('id', 'name', 'code', 'strand_id', 'semester');
            },
            'faculty' => function($query) {
                $query->select('id', 'firstname', 'lastname', 'email');
            },
            'schoolYear'
        ]);

        if ($currentAcademicYear) {
            // Show schedules for current academic year only
            $schedulesQuery->where('school_year_id', $currentAcademicYear->id);
        } else {
            // If no current academic year, show schedules without school year assignment (legacy data)
            $schedulesQuery->whereNull('school_year_id');
        }

        $schedules = $schedulesQuery->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        Log::info('Schedule Management Debug:', [
            'current_academic_year' => $currentAcademicYear ? $currentAcademicYear->toArray() : null,
            'total_schedules_in_db' => ClassSchedule::count(),
            'fetched_schedules_count' => $schedules->count(),
            'schedule_details' => $schedules->map(function($schedule) {
                return [
                    'id' => $schedule->id,
                    'subject' => $schedule->subject ? $schedule->subject->name : 'No Subject',
                    'faculty' => $schedule->faculty ? $schedule->faculty->firstname . ' ' . $schedule->faculty->lastname : 'No Faculty',
                    'section' => $schedule->section ? $schedule->section->section_name : 'No Section',
                    'school_year' => $schedule->schoolYear ? $schedule->schoolYear->year_start . '-' . $schedule->schoolYear->year_end : 'Legacy',
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time
                ];
            })
        ]);

        // Get subjects filtered by current academic year (include legacy subjects with NULL school_year_id)
        $subjects = Subject::with('strand')
            ->when($currentAcademicYear, function($query) use ($currentAcademicYear) {
                $query->where(function($subQuery) use ($currentAcademicYear) {
                    $subQuery->where('school_year_id', $currentAcademicYear->id)
                             ->orWhereNull('school_year_id');
                });
            })
            ->orderBy('name')
            ->get();

        $faculties = User::whereIn('role', ['faculty', 'coordinator'])->orderBy('lastname')->get();
        
        // Get sections filtered by current academic year
        $sections = Section::with(['strand', 'teacher'])
            ->when($currentAcademicYear, function($query) use ($currentAcademicYear) {
                $query->where('school_year_id', $currentAcademicYear->id);
            })
            ->orderBy('section_name')
            ->get();
            
        $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();
        $strands = Strand::orderBy('name')->get();

        return Inertia::render('Registrar/ScheduleManagement', [
            'schedules' => $schedules,
            'subjects' => $subjects,
            'faculties' => $faculties,
            'sections' => $sections,
            'schoolYears' => $schoolYears,
            'strands' => $strands,
            'currentSchoolYear' => $currentYear,
            'activeSchoolYear' => $currentAcademicYear,
            'swal' => session('swal')
        ]);
    }

    /**
     * Create a new class schedule
     */
    public function store(Request $request)
    {
        Log::info('ScheduleController store method called', [
            'request_data' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'nullable|exists:users,id', // Allow null faculty
            'grade_level' => 'required|string|in:11,12',
            'day_of_week' => 'required|string|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'duration' => 'required|integer|in:60,90,120',
            'semester' => 'required|in:1st Semester,2nd Semester',
            'school_year' => 'required|string',
            'room' => 'nullable|string|max:255'
        ]);

        Log::info('Validation passed', ['validated_data' => $validated]);

        // Convert school_year string to school_year_id
        $schoolYearParts = explode('-', $validated['school_year']);
        if (count($schoolYearParts) !== 2) {
            Log::error('Invalid school year format', ['school_year' => $validated['school_year']]);
            return back()->withErrors(['school_year' => 'School year must be in format YYYY-YYYY']);
        }

        $yearStart = (int)$schoolYearParts[0];
        $yearEnd = (int)$schoolYearParts[1];

        $schoolYear = \App\Models\SchoolYear::where('year_start', $yearStart)
            ->where('year_end', $yearEnd)
            ->first();

        if (!$schoolYear) {
            // Create the school year if it doesn't exist
            Log::info('Creating new school year', ['year_start' => $yearStart, 'year_end' => $yearEnd]);
            $schoolYear = \App\Models\SchoolYear::create([
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'year' => $yearStart . '-' . $yearEnd, // Add the missing year field
                'semester' => '1st Semester',
                'is_active' => true,
                'current_semester' => 1,
                'start_date' => $yearStart . '-08-01',
                'end_date' => $yearStart . '-12-31'
            ]);
        }

        $validated['school_year_id'] = $schoolYear->id;
        unset($validated['school_year']); // Remove the string version

        Log::info('School year converted', ['school_year_id' => $validated['school_year_id']]);

        // Check for duplicate subject/day/section combination
        Log::info('Checking for duplicate schedule', [
            'section_id' => $validated['section_id'],
            'subject_id' => $validated['subject_id'],
            'day_of_week' => $validated['day_of_week'],
            'school_year_id' => $validated['school_year_id'],
            'semester' => $validated['semester']
        ]);

        $duplicateSchedule = ClassSchedule::where('section_id', $validated['section_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->where('school_year_id', $validated['school_year_id'])
            ->where('semester', $validated['semester'])
            ->with(['subject', 'section'])
            ->first();

        Log::info('Duplicate check result', [
            'duplicate_found' => $duplicateSchedule ? true : false,
            'duplicate_schedule_id' => $duplicateSchedule ? $duplicateSchedule->id : null,
            'existing_schedules_count' => ClassSchedule::where('section_id', $validated['section_id'])
                ->where('subject_id', $validated['subject_id'])
                ->where('day_of_week', $validated['day_of_week'])
                ->count()
        ]);

        if ($duplicateSchedule) {
            $subjectName = $duplicateSchedule->subject ? $duplicateSchedule->subject->name : 'Unknown Subject';
            $sectionName = $duplicateSchedule->section ? $duplicateSchedule->section->section_name : 'Unknown Section';
            
            Log::warning('Duplicate subject/day/section combination detected', [
                'section_id' => $validated['section_id'],
                'subject_id' => $validated['subject_id'],
                'day_of_week' => $validated['day_of_week'],
                'existing_schedule_id' => $duplicateSchedule->id,
                'subject_name' => $subjectName,
                'section_name' => $sectionName
            ]);
            
            return back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => 'Duplicate Schedule Detected!',
                    'text' => "The subject '{$subjectName}' is already scheduled for section '{$sectionName}' on {$validated['day_of_week']}. Please choose a different day or subject.",
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        }

        // Validate time constraints with corrected time slots (4 periods per day)
        $validTimeSlots = [
            '07:30' => '08:00', // Flag Ceremony
            '08:00' => '10:00', // 1st Period
            '10:30' => '12:30', // 2nd Period  
            '13:30' => '15:30', // 3rd Period
            '15:30' => '16:30', // 4th Period
        ];

        $startTime = $validated['start_time'];
        $endTime = $validated['end_time'];
        
        // Check if the time slot is valid
        $isValidTimeSlot = false;
        foreach ($validTimeSlots as $validStart => $validEnd) {
            if ($startTime === $validStart && $endTime === $validEnd) {
                $isValidTimeSlot = true;
                break;
            }
        }

        if (!$isValidTimeSlot) {
            Log::warning('Invalid time slot', [
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time']
            ]);
            return back()->withErrors(['schedule' => 'Please select a valid time slot. Available slots: 7:30am-8:00am (Flag Ceremony), 8:00am-10:00am (1st Period), 10:30am-12:30pm (2nd Period), 1:30pm-3:30pm (3rd Period), 3:30pm-4:30pm (4th Period)']);
        }

        // Check daily schedule limit (maximum 4 periods per day per section)
        $dailyScheduleCount = ClassSchedule::where('section_id', $validated['section_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->where('school_year_id', $validated['school_year_id'])
            ->whereNotIn('start_time', ['07:30:00']) // Exclude flag ceremony from count
            ->count();

        if ($dailyScheduleCount >= 4) {
            Log::warning('Daily schedule limit exceeded', [
                'section_id' => $validated['section_id'],
                'day_of_week' => $validated['day_of_week'],
                'current_count' => $dailyScheduleCount
            ]);
            return back()->withErrors(['schedule' => 'Maximum 4 class periods per day allowed for each section.']);
        }

        // Check teacher schedule limit only if faculty is assigned (4 schedules max per teacher)
        if (!empty($validated['faculty_id'])) {
            $teacherScheduleCount = ClassSchedule::where('faculty_id', $validated['faculty_id'])
                ->where('school_year_id', $validated['school_year_id'])
                ->count();
            
            if ($teacherScheduleCount >= 4) {
                $faculty = User::find($validated['faculty_id']);
                $facultyName = $faculty ? "{$faculty->firstname} {$faculty->lastname}" : 'Selected Faculty';
                
                Log::warning('Teacher schedule limit exceeded', [
                    'faculty_id' => $validated['faculty_id'],
                    'faculty_name' => $facultyName,
                    'current_schedules' => $teacherScheduleCount
                ]);
                
                return back()->with([
                    'swal' => [
                        'type' => 'warning',
                        'title' => 'Teacher Schedule Limit Reached',
                        'text' => "{$facultyName} is already assigned to 4 schedules, which is the maximum limit. Please choose a different teacher or remove one of their existing schedule assignments.",
                        'icon' => 'warning',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }
        }

        // Check for faculty conflicts only if faculty is assigned
        if (!empty($validated['faculty_id'])) {
            $conflicts = $this->checkScheduleConflicts($validated);
            
            if (!empty($conflicts)) {
                Log::warning('Schedule conflicts detected', ['conflicts' => $conflicts]);
                
                return back()->with([
                    'swal' => [
                        'type' => 'error',
                        'title' => 'Schedule Conflict!',
                        'text' => implode('\n\n', $conflicts),
                        'icon' => 'error',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }
        }

        try {
            Log::info('Creating schedule with data:', $validated);
            $schedule = ClassSchedule::create($validated);
            Log::info('Schedule created successfully:', ['id' => $schedule->id]);
            
            $successMessage = !empty($validated['faculty_id']) 
                ? 'Class schedule created successfully'
                : 'Class schedule created successfully (no faculty assigned yet)';
            
            return redirect()->route('registrar.schedules.index')->with([
                'swal' => [
                    'type' => 'success',
                    'title' => 'Success!',
                    'text' => $successMessage,
                    'icon' => 'success',
                    'timer' => 3000,
                    'showConfirmButton' => false
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create schedule:', [
                'error' => $e->getMessage(),
                'data' => $validated
            ]);
            
            // Check if it's a duplicate entry error
            $errorMessage = $e->getMessage();
            $isDuplicateError = strpos($errorMessage, 'Duplicate entry') !== false || strpos($errorMessage, '1062') !== false;
            
            $swalMessage = $isDuplicateError 
                ? 'A schedule already exists for this section at the same time and day. Please choose a different time slot or check existing schedules.'
                : 'Failed to create schedule. Please try again or contact support if the problem persists.';
            
            return back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => $isDuplicateError ? 'Duplicate Schedule!' : 'Error!',
                    'text' => $swalMessage,
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        }
    }

    /**
     * Update an existing class schedule
     */
    public function update(Request $request, ClassSchedule $schedule)
    {
        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'nullable|exists:users,id', // Allow null faculty
            'grade_level' => 'required|string|in:11,12',
            'day_of_week' => 'required|string|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'duration' => 'required|integer|in:60,90,120',
            'semester' => 'required|in:1st Semester,2nd Semester',
            'school_year' => 'required|string',
            'room' => 'nullable|string|max:255'
        ]);

        // Convert school_year string to school_year_id
        $schoolYearParts = explode('-', $validated['school_year']);
        if (count($schoolYearParts) !== 2) {
            Log::error('Invalid school year format', ['school_year' => $validated['school_year']]);
            return back()->withErrors(['school_year' => 'School year must be in format YYYY-YYYY']);
        }

        $yearStart = (int)$schoolYearParts[0];
        $yearEnd = (int)$schoolYearParts[1];

        $schoolYear = \App\Models\SchoolYear::where('year_start', $yearStart)
            ->where('year_end', $yearEnd)
            ->first();

        if (!$schoolYear) {
            // Create the school year if it doesn't exist
            Log::info('Creating new school year', ['year_start' => $yearStart, 'year_end' => $yearEnd]);
            $schoolYear = \App\Models\SchoolYear::create([
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'year' => $yearStart . '-' . $yearEnd, // Add the missing year field
                'semester' => '1st Semester',
                'is_active' => true,
                'current_semester' => 1,
                'start_date' => $yearStart . '-08-01',
                'end_date' => $yearStart . '-12-31'
            ]);
        }

        $validated['school_year_id'] = $schoolYear->id;
        unset($validated['school_year']); // Remove the string version

        // Check for duplicate subject/day/section combination (excluding current schedule)
        Log::info('Checking for duplicate schedule', [
            'section_id' => $validated['section_id'],
            'subject_id' => $validated['subject_id'],
            'day_of_week' => $validated['day_of_week'],
            'school_year_id' => $validated['school_year_id'],
            'semester' => $validated['semester']
        ]);

        $duplicateSchedule = ClassSchedule::where('section_id', $validated['section_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->where('school_year_id', $validated['school_year_id'])
            ->where('semester', $validated['semester'])
            ->where('id', '!=', $schedule->id) // Exclude current schedule being edited
            ->with(['subject', 'section'])
            ->first();

        Log::info('Duplicate check result', [
            'duplicate_found' => $duplicateSchedule ? true : false,
            'duplicate_schedule_id' => $duplicateSchedule ? $duplicateSchedule->id : null,
            'existing_schedules_count' => ClassSchedule::where('section_id', $validated['section_id'])
                ->where('subject_id', $validated['subject_id'])
                ->where('day_of_week', $validated['day_of_week'])
                ->count()
        ]);

        if ($duplicateSchedule) {
            $subjectName = $duplicateSchedule->subject ? $duplicateSchedule->subject->name : 'Unknown Subject';
            $sectionName = $duplicateSchedule->section ? $duplicateSchedule->section->section_name : 'Unknown Section';
            
            Log::warning('Duplicate subject/day/section combination detected during update', [
                'section_id' => $validated['section_id'],
                'subject_id' => $validated['subject_id'],
                'day_of_week' => $validated['day_of_week'],
                'existing_schedule_id' => $duplicateSchedule->id,
                'current_schedule_id' => $schedule->id,
                'subject_name' => $subjectName,
                'section_name' => $sectionName
            ]);
            
            return back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => 'Duplicate Schedule Detected!',
                    'text' => "The subject '{$subjectName}' is already scheduled for section '{$sectionName}' on {$validated['day_of_week']}. Please choose a different day or subject.",
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        }

        // Validate time constraints with corrected time slots (4 periods per day)
        $validTimeSlots = [
            '07:30' => '08:00', // Flag Ceremony
            '08:00' => '10:00', // 1st Period
            '10:30' => '12:30', // 2nd Period  
            '13:30' => '15:30', // 3rd Period
            '15:30' => '16:30', // 4th Period
        ];

        $startTime = $validated['start_time'];
        $endTime = $validated['end_time'];
        
        // Check if the time slot is valid
        $isValidTimeSlot = false;
        foreach ($validTimeSlots as $validStart => $validEnd) {
            if ($startTime === $validStart && $endTime === $validEnd) {
                $isValidTimeSlot = true;
                break;
            }
        }

        if (!$isValidTimeSlot) {
            Log::warning('Invalid time slot', [
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time']
            ]);
            return back()->withErrors(['schedule' => 'Please select a valid time slot. Available slots: 7:30am-8:00am (Flag Ceremony), 8:00am-10:00am (1st Period), 10:30am-12:30pm (2nd Period), 1:30pm-3:30pm (3rd Period), 3:30pm-4:30pm (4th Period)']);
        }

        // Check daily schedule limit (maximum 4 periods per day per section)
        $dailyScheduleCount = ClassSchedule::where('section_id', $validated['section_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->where('school_year_id', $validated['school_year_id'])
            ->whereNotIn('start_time', ['07:30:00']) // Exclude flag ceremony from count
            ->count();

        if ($dailyScheduleCount >= 4) {
            Log::warning('Daily schedule limit exceeded', [
                'section_id' => $validated['section_id'],
                'day_of_week' => $validated['day_of_week'],
                'current_count' => $dailyScheduleCount
            ]);
            return back()->withErrors(['schedule' => 'Maximum 4 class periods per day allowed for each section.']);
        }

        // Check teacher schedule limit only if faculty is assigned (4 schedules max per teacher) - exclude current schedule
        if (!empty($validated['faculty_id'])) {
            $teacherScheduleCount = ClassSchedule::where('faculty_id', $validated['faculty_id'])
                ->where('school_year_id', $validated['school_year_id'])
                ->where('id', '!=', $schedule->id) // Exclude current schedule being edited
                ->count();
            
            if ($teacherScheduleCount >= 4) {
                $faculty = User::find($validated['faculty_id']);
                $facultyName = $faculty ? "{$faculty->firstname} {$faculty->lastname}" : 'Selected Faculty';
                
                Log::warning('Teacher schedule limit exceeded during update', [
                    'faculty_id' => $validated['faculty_id'],
                    'faculty_name' => $facultyName,
                    'current_schedules' => $teacherScheduleCount
                ]);
                
                return back()->with([
                    'swal' => [
                        'type' => 'warning',
                        'title' => 'Teacher Schedule Limit Reached',
                        'text' => "{$facultyName} would be assigned to more than 4 schedules with this change. Please choose a different teacher or remove one of their existing schedule assignments.",
                        'icon' => 'warning',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }
        }

        // Check for faculty conflicts only if faculty is assigned (excluding current schedule)
        if (!empty($validated['faculty_id'])) {
            $conflicts = $this->checkScheduleConflicts($validated, $schedule->id);
            
            if (!empty($conflicts)) {
                return back()->with([
                    'swal' => [
                        'type' => 'error',
                        'title' => 'Schedule Conflict!',
                        'text' => implode('\n\n', $conflicts),
                        'icon' => 'error',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }
        }

        try {
            Log::info('Updating schedule with data:', $validated);
            $schedule->update($validated);
            Log::info('Schedule updated successfully:', ['id' => $schedule->id]);
            
            $successMessage = !empty($validated['faculty_id']) 
                ? 'Class schedule updated successfully'
                : 'Class schedule updated successfully (no faculty assigned)';
            
            return redirect()->route('registrar.schedules.index')->with([
                'swal' => [
                    'type' => 'success',
                    'title' => 'Success!',
                    'text' => $successMessage,
                    'icon' => 'success',
                    'timer' => 3000,
                    'showConfirmButton' => false
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update schedule:', [
                'error' => $e->getMessage(),
                'data' => $validated
            ]);
            return back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => 'Error!',
                    'text' => 'Failed to update schedule. Please try again or contact support if the problem persists.',
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        }
    }

    /**
     * Delete a class schedule
     */
    public function destroy(ClassSchedule $schedule)
    {
        $schedule->delete();
        return redirect()->route('registrar.schedules.index')->with([
            'swal' => [
                'type' => 'success',
                'title' => 'Success!',
                'text' => 'Class schedule deleted successfully',
                'icon' => 'success',
                'timer' => 3000,
                'showConfirmButton' => false
            ]
        ]);
    }

    /**
     * Bulk assign subjects to sections
     */
    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'nullable|exists:users,id', // Allow null faculty
            'school_year' => 'required|string',
            'schedules' => 'required|array|min:1',
            'schedules.*.day_of_week' => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i|after:start_time',
            'schedules.*.duration' => 'required|integer|in:60,90,120'
        ]);

        // Convert school_year string to school_year_id
        $schoolYearParts = explode('-', $validated['school_year']);
        if (count($schoolYearParts) !== 2) {
            Log::error('Invalid school year format', ['school_year' => $validated['school_year']]);
            return back()->withErrors(['school_year' => 'School year must be in format YYYY-YYYY']);
        }

        $yearStart = (int)$schoolYearParts[0];
        $yearEnd = (int)$schoolYearParts[1];

        $schoolYear = \App\Models\SchoolYear::where('year_start', $yearStart)
            ->where('year_end', $yearEnd)
            ->first();

        if (!$schoolYear) {
            // Create the school year if it doesn't exist
            Log::info('Creating new school year', ['year_start' => $yearStart, 'year_end' => $yearEnd]);
            $schoolYear = \App\Models\SchoolYear::create([
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'year' => $yearStart . '-' . $yearEnd, // Add the missing year field
                'semester' => '1st Semester',
                'is_active' => true,
                'current_semester' => 1,
                'start_date' => $yearStart . '-08-01',
                'end_date' => $yearStart . '-12-31'
            ]);
        }

        $validated['school_year_id'] = $schoolYear->id;
        unset($validated['school_year']); // Remove the string version

        $createdSchedules = [];
        
        // Validate all schedules first - check for duplicates and conflicts
        foreach ($validated['schedules'] as $scheduleData) {
            $fullScheduleData = array_merge($scheduleData, [
                'section_id' => $validated['section_id'],
                'subject_id' => $validated['subject_id'],
                'faculty_id' => $validated['faculty_id'],
                'school_year_id' => $validated['school_year_id'],
                'semester' => '1st Semester' // Default semester for bulk assign
            ]);
            
            // Check for duplicate subject/day/section combination
            Log::info('Checking for duplicate schedule', [
                'section_id' => $validated['section_id'],
                'subject_id' => $validated['subject_id'],
                'day_of_week' => $scheduleData['day_of_week'],
                'school_year_id' => $validated['school_year_id'],
                'semester' => $validated['semester']
            ]);

            $duplicateSchedule = ClassSchedule::where('section_id', $validated['section_id'])
                ->where('subject_id', $validated['subject_id'])
                ->where('day_of_week', $scheduleData['day_of_week'])
                ->where('school_year_id', $validated['school_year_id'])
                ->where('semester', $validated['semester'])
                ->with(['subject', 'section'])
                ->first();

            Log::info('Duplicate check result', [
                'duplicate_found' => $duplicateSchedule ? true : false,
                'duplicate_schedule_id' => $duplicateSchedule ? $duplicateSchedule->id : null,
                'existing_schedules_count' => ClassSchedule::where('section_id', $validated['section_id'])
                    ->where('subject_id', $validated['subject_id'])
                    ->where('day_of_week', $scheduleData['day_of_week'])
                    ->count()
            ]);

            if ($duplicateSchedule) {
                $subjectName = $duplicateSchedule->subject ? $duplicateSchedule->subject->name : 'Unknown Subject';
                $sectionName = $duplicateSchedule->section ? $duplicateSchedule->section->section_name : 'Unknown Section';
                
                Log::warning('Duplicate subject/day/section combination detected', [
                    'section_id' => $validated['section_id'],
                    'subject_id' => $validated['subject_id'],
                    'day_of_week' => $scheduleData['day_of_week'],
                    'existing_schedule_id' => $duplicateSchedule->id,
                    'subject_name' => $subjectName,
                    'section_name' => $sectionName
                ]);
                
                return back()->with([
                    'swal' => [
                        'type' => 'error',
                        'title' => 'Duplicate Schedule Detected!',
                        'text' => "The subject '{$subjectName}' is already scheduled for section '{$sectionName}' on {$scheduleData['day_of_week']}. Please choose a different day or subject.",
                        'icon' => 'error',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }
            
            // Check for faculty conflicts only if faculty is assigned
            if (!empty($validated['faculty_id'])) {
                $conflicts = $this->checkScheduleConflicts($fullScheduleData);
                if (!empty($conflicts)) {
                    return back()->with([
                        'swal' => [
                            'type' => 'error',
                            'title' => 'Schedule Conflict!',
                            'text' => implode('\n\n', $conflicts),
                            'icon' => 'error',
                            'confirmButtonText' => 'OK'
                        ]
                    ]);
                }
            }
        }

        // Create all schedules if no conflicts
        foreach ($validated['schedules'] as $scheduleData) {
            try {
                Log::info('Creating schedule with data:', $scheduleData);
                $createdSchedule = ClassSchedule::create([
                    'section_id' => $validated['section_id'],
                    'subject_id' => $validated['subject_id'],
                    'faculty_id' => $validated['faculty_id'],
                    'day_of_week' => $scheduleData['day_of_week'],
                    'start_time' => $scheduleData['start_time'],
                    'end_time' => $scheduleData['end_time'],
                    'duration' => $scheduleData['duration'],
                    'school_year_id' => $validated['school_year_id'],
                    'semester' => '1st Semester' // Default semester
                ]);
                Log::info('Schedule created successfully:', ['id' => $createdSchedule->id]);
                
                $createdSchedules[] = $createdSchedule;
            } catch (\Exception $e) {
                Log::error('Failed to create schedule:', [
                    'error' => $e->getMessage(),
                    'data' => $scheduleData
                ]);
                return back()->with([
                    'swal' => [
                        'type' => 'error',
                        'title' => 'Error!',
                        'text' => 'Failed to create schedule. Please try again or contact support if the problem persists.',
                        'icon' => 'error',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }
        }

        $count = count($createdSchedules);
        $faculty = !empty($validated['faculty_id']) ? User::find($validated['faculty_id']) : null;
        $subject = Subject::find($validated['subject_id']);
        
        $facultyName = $faculty ? "{$faculty->firstname} {$faculty->lastname}" : "No Faculty";
        $subjectName = $subject ? $subject->name : "Subject";
        
        $successMessage = $faculty 
            ? "Successfully assigned {$subjectName} to {$facultyName} for {$count} schedules"
            : "Successfully created {$count} schedules for {$subjectName} (no faculty assigned yet)";
        
        return redirect()->route('registrar.schedules.index')->with([
            'swal' => [
                'type' => 'success',
                'title' => 'Success!',
                'text' => $successMessage,
                'icon' => 'success',
                'timer' => 3000,
                'showConfirmButton' => false
            ]
        ]);
    }

    /**
     * Get student schedule (for student dashboard)
     */
    public function getStudentSchedule($studentId)
    {
        try {
            // Get student using raw query to avoid model issues
            $student = DB::table('student_personal_info')
                ->join('users', 'student_personal_info.user_id', '=', 'users.id')
                ->leftJoin('sections', 'student_personal_info.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'student_personal_info.strand_id', '=', 'strands.id')
                ->where('student_personal_info.id', $studentId)
                ->select([
                    'student_personal_info.*',
                    'users.firstname',
                    'users.lastname',
                    'sections.name as section_name',
                    'strands.name as strand_name'
                ])
                ->first();
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }
            
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$currentSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found'
                ], 404);
            }
            
            // Get class schedules for the student's section
            $sectionSchedules = [];
            if ($student->section_id) {
                $schedules = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->join('users', 'class.faculty_id', '=', 'users.id')
                    ->join('sections', 'class.section_id', '=', 'sections.id')
                    ->where('class.section_id', $student->section_id)
                    ->where('class.school_year_id', $currentSchoolYear->id)
                    ->select([
                        'class.*',
                        'subjects.name as subject_name',
                        'subjects.code as subject_code',
                        'users.firstname as faculty_firstname',
                        'users.lastname as faculty_lastname',
                        'sections.name as section_name'
                    ])
                    ->orderBy('class.day_of_week')
                    ->orderBy('class.start_time')
                    ->get()
                    ->groupBy('day_of_week');
                    
                $sectionSchedules = $schedules;
            }
        
            return response()->json([
                'success' => true,
                'schedules' => $sectionSchedules,
                'student' => [
                    'name' => $student->firstname . ' ' . $student->lastname,
                    'lrn' => $student->lrn ?? 'N/A',
                    'grade_level' => $student->grade_level ?? 'Grade 11',
                    'strand' => $student->strand_name ?? 'Not Assigned',
                    'section' => $student->section_name ?? 'Not Assigned'
                ],
                'semester' => $currentSchoolYear->semester ?? '1st Semester',
                'school_year' => $currentSchoolYear ? $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end : '2024-2025',
                'enrollment_status' => $student->enrollment_status ?? 'pending'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching student schedule: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student schedule'
            ], 500);
        }
    }

    /**
     * Get schedules for a specific section and strand
     */
    public function getSchedulesBySectionAndStrand($sectionId, $strandId)
    {
        Log::info('getSchedulesBySectionAndStrand called', [
            'section_id' => $sectionId,
            'strand_id' => $strandId
        ]);

        try {
            // Philippine SHS System: Use current academic year for schedule display
            $currentAcademicYear = SchoolYear::getCurrentAcademicYear() ?? SchoolYear::where('is_active', true)->first();
            
            Log::info('Current academic year found', [
                'school_year' => $currentAcademicYear ? $currentAcademicYear->toArray() : null
            ]);
            
            if (!$currentAcademicYear) {
                Log::warning('No active school year found');
                return response()->json([
                    'schedules' => [],
                    'message' => 'No active school year found',
                    'success' => false
                ], 200);
            }

            // Validate section and strand exist
            $section = DB::table('sections')->where('id', $sectionId)->first();
            $strand = DB::table('strands')->where('id', $strandId)->first();
            
            if (!$section) {
                Log::warning('Section not found', ['section_id' => $sectionId]);
                return response()->json([
                    'schedules' => [],
                    'message' => 'Section not found',
                    'success' => false
                ], 404);
            }
            
            if (!$strand) {
                Log::warning('Strand not found', ['strand_id' => $strandId]);
                return response()->json([
                    'schedules' => [],
                    'message' => 'Strand not found',
                    'success' => false
                ], 404);
            }
            
            Log::info('Section and strand lookup', [
                'section' => $section,
                'strand' => $strand
            ]);

            // Check if there are any class records for this section
            $classRecordsForSection = DB::table('class')->where('section_id', $sectionId)->get();
            Log::info('Class records for section', [
                'section_id' => $sectionId,
                'class_records_count' => $classRecordsForSection->count()
            ]);

            // Get schedules for the section and strand with improved query
            $query = DB::table('class')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('users', 'class.faculty_id', '=', 'users.id')
                ->join('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'subjects.strand_id', '=', 'strands.id')
                ->where('class.section_id', $sectionId)
                ->where('class.school_year_id', $currentAcademicYear->id)
                ->where(function($subQuery) use ($strandId) {
                    $subQuery->where('subjects.strand_id', $strandId)
                             ->orWhere('sections.strand_id', $strandId);
                });
                
            Log::info('Query SQL', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);

            $schedules = $query->select([
                    'class.*',
                    'subjects.code as subject_code',
                    'subjects.name as subject_name',
                    'subjects.year_level',
                    'subjects.semester',
                    'users.firstname as faculty_firstname',
                    'users.lastname as faculty_lastname',
                    'sections.section_name',
                    'strands.name as strand_name',
                    'strands.code as strand_code'
                ])
                ->orderBy('class.day_of_week')
                ->orderBy('class.start_time')
                ->get();

            Log::info('Query executed', [
                'schedules_count' => $schedules->count(),
                'schedules_sample' => $schedules->take(2)->toArray()
            ]);

            // Format schedules for frontend consumption
            $formattedSchedules = $schedules->map(function($schedule) {
                return [
                    'id' => $schedule->id,
                    'subject_code' => $schedule->subject_code,
                    'subject_name' => $schedule->subject_name,
                    'faculty_firstname' => $schedule->faculty_firstname,
                    'faculty_lastname' => $schedule->faculty_lastname,
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'room' => $schedule->room ?? 'TBA',
                    'duration' => $schedule->duration,
                    'semester' => $schedule->semester,
                    'year_level' => $schedule->year_level,
                    'section_name' => $schedule->section_name,
                    'strand_name' => $schedule->strand_name ?? 'Unknown',
                    'strand_code' => $schedule->strand_code ?? 'N/A'
                ];
            });

            return response()->json([
                'schedules' => $formattedSchedules,
                'section_id' => $sectionId,
                'strand_id' => $strandId,
                'school_year' => $currentAcademicYear->year_start . '-' . $currentAcademicYear->year_end,
                'semester' => $currentAcademicYear->semester,
                'success' => true,
                'message' => $schedules->count() > 0 ? 'Schedules found' : 'No schedules found for this section and strand',
                'debug' => [
                    'current_academic_year_id' => $currentAcademicYear->id,
                    'section_found' => !!$section,
                    'strand_found' => !!$strand,
                    'class_records_for_section' => $classRecordsForSection->count(),
                    'query_conditions' => [
                        'section_id' => $sectionId,
                        'strand_id' => $strandId,
                        'school_year_id' => $currentAcademicYear->id
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching schedules by section and strand: ' . $e->getMessage(), [
                'exception' => $e->getTraceAsString(),
                'section_id' => $sectionId,
                'strand_id' => $strandId
            ]);
            
            return response()->json([
                'schedules' => [],
                'success' => false,
                'error' => 'Failed to fetch schedules',
                'message' => 'An error occurred while fetching class schedules. Please try again.',
                'debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Check for schedule conflicts
     */
    private function checkScheduleConflicts($data, $excludeId = null)
    {
        $conflicts = [];
        
        // Calculate end time from start time and duration
        $startTime = \Carbon\Carbon::createFromFormat('H:i', $data['start_time']);
        $endTime = \Carbon\Carbon::createFromFormat('H:i', $data['end_time']);
        
        // Check section conflicts - prevent same section from having overlapping schedules
        $sectionConflicts = ClassSchedule::where('section_id', $data['section_id'])
            ->where('day_of_week', $data['day_of_week'])
            ->where('school_year_id', $data['school_year_id'])
            ->where('semester', $data['semester'])
            ->when($excludeId, function ($query, $excludeId) {
                return $query->where('id', '!=', $excludeId);
            })
            ->with(['subject', 'faculty', 'section.strand'])
            ->get()
            ->filter(function ($schedule) use ($startTime, $endTime) {
                // Handle different time formats from database
                $scheduleStartTime = $schedule->start_time;
                $scheduleEndTime = $schedule->end_time;
                
                // Try H:i:s format first, then H:i format
                try {
                    $scheduleStart = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleStartTime);
                } catch (\Exception $e) {
                    try {
                        $scheduleStart = \Carbon\Carbon::createFromFormat('H:i', $scheduleStartTime);
                    } catch (\Exception $e2) {
                        Log::warning('Invalid start time format: ' . $scheduleStartTime);
                        return false;
                    }
                }
                
                try {
                    $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleEndTime);
                } catch (\Exception $e) {
                    try {
                        $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i', $scheduleEndTime);
                    } catch (\Exception $e2) {
                        Log::warning('Invalid end time format: ' . $scheduleEndTime);
                        return false;
                    }
                }
                
                // Check for time overlap: schedules conflict if they overlap at any point
                return $startTime->lt($scheduleEnd) && $endTime->gt($scheduleStart);
            });
            
        if ($sectionConflicts->isNotEmpty()) {
            foreach ($sectionConflicts as $conflictSchedule) {
                $subjectName = $conflictSchedule->subject ? $conflictSchedule->subject->name : 'Unknown Subject';
                $facultyName = $conflictSchedule->faculty ? ($conflictSchedule->faculty->firstname . ' ' . $conflictSchedule->faculty->lastname) : 'Unknown Faculty';
                $sectionName = $conflictSchedule->section ? $conflictSchedule->section->section_name : 'Unknown Section';
                
                $conflicts[] = "SECTION CONFLICT: Section {$sectionName} already has {$subjectName} with {$facultyName} from {$conflictSchedule->start_time} to {$conflictSchedule->end_time} on {$data['day_of_week']}";
            }
        }
        
        // Check faculty conflicts - prevent same faculty from being scheduled at overlapping times
        $conflictingSchedules = ClassSchedule::where('faculty_id', $data['faculty_id'])
            ->where('day_of_week', $data['day_of_week'])
            ->where('school_year_id', $data['school_year_id'])
            ->where('semester', $data['semester'])
            ->when($excludeId, function ($query, $excludeId) {
                return $query->where('id', '!=', $excludeId);
            })
            ->with(['subject', 'section.strand']) // Load related data for detailed conflict info
            ->get()
            ->filter(function ($schedule) use ($startTime, $endTime) {
                // Handle different time formats from database
                $scheduleStartTime = $schedule->start_time;
                $scheduleEndTime = $schedule->end_time;
                
                try {
                    $scheduleStart = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleStartTime);
                } catch (\Exception $e) {
                    try {
                        $scheduleStart = \Carbon\Carbon::createFromFormat('H:i', $scheduleStartTime);
                    } catch (\Exception $e2) {
                        Log::warning('Invalid start time format: ' . $scheduleStartTime);
                        return false;
                    }
                }
                
                try {
                    $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleEndTime);
                } catch (\Exception $e) {
                    try {
                        $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i', $scheduleEndTime);
                    } catch (\Exception $e2) {
                        Log::warning('Invalid end time format: ' . $scheduleEndTime);
                        return false;
                    }
                }
                
                return $startTime->lt($scheduleEnd) && $endTime->gt($scheduleStart);
            });
            
        if ($conflictingSchedules->isNotEmpty()) {
            foreach ($conflictingSchedules as $conflictSchedule) {
                $subjectName = $conflictSchedule->subject ? $conflictSchedule->subject->name : 'Unknown Subject';
                $sectionName = $conflictSchedule->section ? $conflictSchedule->section->section_name : 'Unknown Section';
                $strandName = $conflictSchedule->section && $conflictSchedule->section->strand 
                    ? $conflictSchedule->section->strand->name 
                    : 'Unknown Strand';
                
                $conflicts[] = "FACULTY CONFLICT: Faculty is already scheduled for {$subjectName} ({$sectionName} - {$strandName}) from {$conflictSchedule->start_time} to {$conflictSchedule->end_time} on {$data['day_of_week']}";
            }
        }
        
        // Additional check: Room conflicts (same room, same time, same day)
        if (!empty($data['room'])) {
            $roomConflicts = ClassSchedule::where('room', $data['room'])
                ->where('day_of_week', $data['day_of_week'])
                ->where('school_year_id', $data['school_year_id'])
                ->where('semester', $data['semester'])
                ->when($excludeId, function ($query, $excludeId) {
                    return $query->where('id', '!=', $excludeId);
                })
                ->with(['subject', 'section.strand', 'faculty'])
                ->get()
                ->filter(function ($schedule) use ($startTime, $endTime) {
                    // Handle different time formats from database
                    $scheduleStartTime = $schedule->start_time;
                    $scheduleEndTime = $schedule->end_time;
                    
                    try {
                        $scheduleStart = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleStartTime);
                    } catch (\Exception $e) {
                        try {
                            $scheduleStart = \Carbon\Carbon::createFromFormat('H:i', $scheduleStartTime);
                        } catch (\Exception $e2) {
                            Log::warning('Invalid start time format: ' . $scheduleStartTime);
                            return false;
                        }
                    }
                    
                    try {
                        $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleEndTime);
                    } catch (\Exception $e) {
                        try {
                            $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i', $scheduleEndTime);
                        } catch (\Exception $e2) {
                            Log::warning('Invalid end time format: ' . $scheduleEndTime);
                            return false;
                        }
                    }
                    
                    return $startTime->lt($scheduleEnd) && $endTime->gt($scheduleStart);
                });
                
            if ($roomConflicts->isNotEmpty()) {
                foreach ($roomConflicts as $roomConflict) {
                    $facultyName = $roomConflict->faculty ? $roomConflict->faculty->name : 'Unknown Faculty';
                    $subjectName = $roomConflict->subject ? $roomConflict->subject->name : 'Unknown Subject';
                    
                    $conflicts[] = "ROOM CONFLICT: Room {$data['room']} is already occupied by {$facultyName} for {$subjectName} from {$roomConflict->start_time} to {$roomConflict->end_time} on {$data['day_of_week']}";
                }
            }
        }
        
        return $conflicts;
    }

    /**
     * Check and fix existing schedules that might be missing section_id values
     */
    public function checkScheduleData()
    {
        $schedulesWithoutSection = ClassSchedule::whereNull('section_id')->count();
        $totalSchedules = ClassSchedule::count();
        
        Log::info('Schedule Data Check:', [
            'total_schedules' => $totalSchedules,
            'schedules_without_section' => $schedulesWithoutSection,
            'schedules_with_section' => $totalSchedules - $schedulesWithoutSection
        ]);

        if ($schedulesWithoutSection > 0) {
            Log::warning('Found schedules without section assignments', [
                'count' => $schedulesWithoutSection,
                'schedule_ids' => ClassSchedule::whereNull('section_id')->pluck('id')->toArray()
            ]);
        }

        return response()->json([
            'total_schedules' => $totalSchedules,
            'schedules_without_section' => $schedulesWithoutSection,
            'schedules_with_section' => $totalSchedules - $schedulesWithoutSection,
            'needs_fix' => $schedulesWithoutSection > 0
        ]);
    }

    /**
     * Bulk create schedules
     */
    public function bulkCreate(Request $request)
    {
        try {
            $request->validate([
                'schedules' => 'required|array',
                'schedules.*.section_id' => 'required|exists:sections,id',
                'schedules.*.subject_id' => 'required|exists:subjects,id',
                'schedules.*.faculty_id' => 'required|exists:users,id',
                'schedules.*.day_of_week' => 'required|string',
                'schedules.*.start_time' => 'required|date_format:H:i',
                'schedules.*.end_time' => 'required|date_format:H:i',
                'schedules.*.duration' => 'required|integer|min:1',
                // Note: notifications parameter removed
            ]);

            $schedules = $request->input('schedules');
            // Note: notifications suppression removed
            
            // Get current academic year
            $currentAcademicYear = SchoolYear::getCurrentAcademicYear() ?? SchoolYear::where('is_active', true)->first();
            
            if (!$currentAcademicYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found. Please create and activate a school year first.'
                ], 400);
            }

            $createdSchedules = [];
            $errors = [];

            DB::beginTransaction();

            foreach ($schedules as $index => $scheduleData) {
                try {
                    // Prepare data for conflict checking
                    $conflictCheckData = [
                        'faculty_id' => $scheduleData['faculty_id'],
                        'section_id' => $scheduleData['section_id'],
                        'day_of_week' => $scheduleData['day_of_week'],
                        'start_time' => $scheduleData['start_time'],
                        'end_time' => $scheduleData['end_time'],
                        'school_year_id' => $currentAcademicYear->id,
                        'semester' => $currentAcademicYear->current_semester ?? 1,
                        'room' => $scheduleData['room'] ?? null
                    ];

                    // Check for conflicts before creating
                    $conflicts = $this->checkScheduleConflicts($conflictCheckData);

                    if (!empty($conflicts)) {
                        $errors[] = [
                            'index' => $index,
                            'message' => 'Schedule conflict detected',
                            'conflicts' => $conflicts
                        ];
                        continue;
                    }

                    // Create the schedule
                    $schedule = ClassSchedule::create([
                        'section_id' => $scheduleData['section_id'],
                        'subject_id' => $scheduleData['subject_id'],
                        'faculty_id' => $scheduleData['faculty_id'],
                        'day_of_week' => $scheduleData['day_of_week'],
                        'start_time' => $scheduleData['start_time'],
                        'end_time' => $scheduleData['end_time'],
                        'duration' => $scheduleData['duration'],
                        'school_year_id' => $currentAcademicYear->id,
                        'semester' => $currentAcademicYear->current_semester ?? 1,
                        'room' => $scheduleData['room'] ?? null
                    ]);

                    $createdSchedules[] = $schedule;

                } catch (\Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'message' => 'Failed to create schedule: ' . $e->getMessage()
                    ];
                }
            }

            if (!empty($errors)) {
                DB::rollBack();
                
                // Return Inertia response with error data
                return back()->with([
                    'swal' => [
                        'type' => 'error',
                        'title' => 'Schedule Creation Failed',
                        'text' => 'Some schedules could not be created due to conflicts or errors. Please review and try again.',
                        'icon' => 'error',
                        'confirmButtonText' => 'OK'
                    ]
                ]);
            }

            DB::commit();

            // Return Inertia response with success message
            $scheduleCount = count($createdSchedules);
            $scheduleText = $scheduleCount === 1 ? 'schedule' : 'schedules';
            
            return back()->with([
                'swal' => [
                    'type' => 'success',
                    'title' => 'Schedules Created Successfully!',
                    'text' => "Successfully created {$scheduleCount} {$scheduleText} for the selected teacher.",
                    'icon' => 'success',
                    'confirmButtonText' => 'OK',
                    'timer' => 3000,
                    'timerProgressBar' => true
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => 'Validation Failed',
                    'text' => 'Please check your input data and try again.',
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk schedule creation failed: ' . $e->getMessage());
            
            return back()->with([
                'swal' => [
                    'type' => 'error',
                    'title' => 'Creation Failed',
                    'text' => 'Failed to create schedules. Please try again.',
                    'icon' => 'error',
                    'confirmButtonText' => 'OK'
                ]
            ]);
        }
    }
}
