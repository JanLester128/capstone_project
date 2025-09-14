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
use Inertia\Inertia;

class ScheduleController extends Controller
{
    /**
     * Display schedule management page for registrar
     */
    public function index()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $currentYear = $activeSchoolYear ? 
            ($activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end) : 
            date('Y') . '-' . (date('Y') + 1);

        // Get ALL schedules without any filtering to debug
        $schedules = ClassSchedule::with([
            'section.strand', 
            'subject' => function($query) {
                $query->select('id', 'name', 'code', 'strand_id', 'semester');
            },
            'faculty' => function($query) {
                $query->select('id', 'firstname', 'lastname', 'email');
            },
            'schoolYear'
        ])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        \Log::info('Schedule Management Debug:', [
            'active_school_year' => $activeSchoolYear ? $activeSchoolYear->toArray() : null,
            'total_schedules_in_db' => ClassSchedule::count(),
            'fetched_schedules_count' => $schedules->count(),
            'schedule_details' => $schedules->map(function($schedule) {
                return [
                    'id' => $schedule->id,
                    'subject' => $schedule->subject ? $schedule->subject->name : 'No Subject',
                    'faculty' => $schedule->faculty ? $schedule->faculty->firstname . ' ' . $schedule->faculty->lastname : 'No Faculty',
                    'section' => $schedule->section ? $schedule->section->section_name : 'No Section',
                    'day' => $schedule->day_of_week,
                    'time' => $schedule->start_time . ' - ' . $schedule->end_time,
                    'school_year_id' => $schedule->school_year_id
                ];
            })->toArray()
        ]);

        $subjects = Subject::get();
        $faculties = \App\Models\User::whereIn('role', ['faculty', 'coordinator'])->get();
        $sections = \App\Models\Section::with(['strand', 'teacher'])->orderBy('section_name')->get();
        $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();
        $strands = \App\Models\Strand::orderBy('name')->get();

        return Inertia::render('Registrar/ScheduleManagement', [
            'schedules' => $schedules,
            'subjects' => $subjects,
            'faculties' => $faculties,
            'sections' => $sections,
            'schoolYears' => $schoolYears,
            'strands' => $strands,
            'currentSchoolYear' => $currentYear,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    /**
     * Create a new class schedule
     */
    public function store(Request $request)
    {
        \Log::info('ScheduleController store method called', [
            'request_data' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'required|exists:users,id',
            'day_of_week' => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'duration' => 'required|integer|in:60,90,120',
            'semester' => 'required|in:1st Semester,2nd Semester',
            'school_year' => 'required|string',
            'room' => 'nullable|string|max:255'
        ]);

        \Log::info('Validation passed', ['validated_data' => $validated]);

        // Convert school_year string to school_year_id
        $schoolYearParts = explode('-', $validated['school_year']);
        if (count($schoolYearParts) !== 2) {
            \Log::error('Invalid school year format', ['school_year' => $validated['school_year']]);
            return back()->withErrors(['school_year' => 'School year must be in format YYYY-YYYY']);
        }

        $yearStart = (int)$schoolYearParts[0];
        $yearEnd = (int)$schoolYearParts[1];

        $schoolYear = \App\Models\SchoolYear::where('year_start', $yearStart)
            ->where('year_end', $yearEnd)
            ->first();

        if (!$schoolYear) {
            // Create the school year if it doesn't exist
            \Log::info('Creating new school year', ['year_start' => $yearStart, 'year_end' => $yearEnd]);
            $schoolYear = \App\Models\SchoolYear::create([
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'semester' => '1st Semester',
                'is_active' => true,
                'current_semester' => 1,
                'start_date' => $yearStart . '-08-01',
                'end_date' => $yearStart . '-12-31'
            ]);
        }

        $validated['school_year_id'] = $schoolYear->id;
        unset($validated['school_year']); // Remove the string version

        \Log::info('School year converted', ['school_year_id' => $validated['school_year_id']]);

        // Validate time constraints (7:30 AM to 4:30 PM)
        $startTime = strtotime($validated['start_time']);
        $endTime = strtotime($validated['end_time']);
        $earliestTime = strtotime('07:30');
        $latestTime = strtotime('16:30');

        if ($startTime < $earliestTime || $endTime > $latestTime) {
            \Log::warning('Time constraint violation', [
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time']
            ]);
            return back()->withErrors(['schedule' => 'Class times must be between 7:30 AM and 4:30 PM']);
        }

        // Check for faculty conflicts
        $conflicts = $this->checkScheduleConflicts($validated);
        
        if (!empty($conflicts)) {
            \Log::warning('Schedule conflicts detected', ['conflicts' => $conflicts]);
            return back()->withErrors(['schedule' => 'Schedule conflicts detected: ' . implode(', ', $conflicts)]);
        }

        try {
            \Log::info('Creating schedule with data:', $validated);
            $schedule = ClassSchedule::create($validated);
            \Log::info('Schedule created successfully:', ['id' => $schedule->id]);
            
            return redirect()->route('registrar.schedules.index')->with('success', 'Class schedule created successfully');
        } catch (\Exception $e) {
            \Log::error('Failed to create schedule:', [
                'error' => $e->getMessage(),
                'data' => $validated
            ]);
            return back()->withErrors(['schedule' => 'Failed to create schedule: ' . $e->getMessage()]);
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
            'faculty_id' => 'required|exists:users,id',
            'day_of_week' => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
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
            \Log::error('Invalid school year format', ['school_year' => $validated['school_year']]);
            return back()->withErrors(['school_year' => 'School year must be in format YYYY-YYYY']);
        }

        $yearStart = (int)$schoolYearParts[0];
        $yearEnd = (int)$schoolYearParts[1];

        $schoolYear = \App\Models\SchoolYear::where('year_start', $yearStart)
            ->where('year_end', $yearEnd)
            ->first();

        if (!$schoolYear) {
            // Create the school year if it doesn't exist
            \Log::info('Creating new school year', ['year_start' => $yearStart, 'year_end' => $yearEnd]);
            $schoolYear = \App\Models\SchoolYear::create([
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
                'semester' => '1st Semester',
                'is_active' => true,
                'current_semester' => 1,
                'start_date' => $yearStart . '-08-01',
                'end_date' => $yearStart . '-12-31'
            ]);
        }

        $validated['school_year_id'] = $schoolYear->id;
        unset($validated['school_year']); // Remove the string version

        // Validate time constraints (7:30 AM to 4:30 PM)
        $startTime = strtotime($validated['start_time']);
        $endTime = strtotime($validated['end_time']);
        $earliestTime = strtotime('07:30');
        $latestTime = strtotime('16:30');

        if ($startTime < $earliestTime || $endTime > $latestTime) {
            return back()->withErrors(['schedule' => 'Class times must be between 7:30 AM and 4:30 PM']);
        }

        // Check for faculty conflicts (excluding current schedule)
        $conflicts = $this->checkScheduleConflicts($validated, $schedule->id);
        
        if (!empty($conflicts)) {
            return back()->withErrors(['schedule' => 'Schedule conflicts detected: ' . implode(', ', $conflicts)]);
        }

        try {
            \Log::info('Updating schedule with data:', $validated);
            $schedule->update($validated);
            \Log::info('Schedule updated successfully:', ['id' => $schedule->id]);
            
            return redirect()->route('registrar.schedules.index')->with('success', 'Class schedule updated successfully');
        } catch (\Exception $e) {
            \Log::error('Failed to update schedule:', [
                'error' => $e->getMessage(),
                'data' => $validated
            ]);
            return back()->withErrors(['schedule' => 'Failed to update schedule: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete a class schedule
     */
    public function destroy(ClassSchedule $schedule)
    {
        $schedule->delete();
        return redirect()->route('registrar.schedules.index')->with('success', 'Class schedule deleted successfully');
    }

    /**
     * Bulk assign subjects to sections
     */
    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'faculty_id' => 'required|exists:users,id',
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
            \Log::error('Invalid school year format', ['school_year' => $validated['school_year']]);
            return back()->withErrors(['school_year' => 'School year must be in format YYYY-YYYY']);
        }

        $yearStart = (int)$schoolYearParts[0];
        $yearEnd = (int)$schoolYearParts[1];

        $schoolYear = \App\Models\SchoolYear::where('year_start', $yearStart)
            ->where('year_end', $yearEnd)
            ->first();

        if (!$schoolYear) {
            // Create the school year if it doesn't exist
            \Log::info('Creating new school year', ['year_start' => $yearStart, 'year_end' => $yearEnd]);
            $schoolYear = \App\Models\SchoolYear::create([
                'year_start' => $yearStart,
                'year_end' => $yearEnd,
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
        
        // Validate all schedules first
        foreach ($validated['schedules'] as $scheduleData) {
            $fullScheduleData = array_merge($scheduleData, [
                'section_id' => $validated['section_id'],
                'subject_id' => $validated['subject_id'],
                'faculty_id' => $validated['faculty_id'],
                'school_year_id' => $validated['school_year_id']
            ]);
            
            $conflicts = $this->checkScheduleConflicts($fullScheduleData);
            if (!empty($conflicts)) {
                return back()->withErrors(['schedule' => 'Schedule conflicts detected for ' . $scheduleData['day_of_week'] . ': ' . implode(', ', $conflicts)]);
            }
        }

        // Create all schedules if no conflicts
        foreach ($validated['schedules'] as $scheduleData) {
            try {
                \Log::info('Creating schedule with data:', $scheduleData);
                $createdSchedule = ClassSchedule::create([
                    'section_id' => $validated['section_id'],
                    'subject_id' => $validated['subject_id'],
                    'faculty_id' => $validated['faculty_id'],
                    'day_of_week' => $scheduleData['day_of_week'],
                    'start_time' => $scheduleData['start_time'],
                    'end_time' => $scheduleData['end_time'],
                    'duration' => $scheduleData['duration'],
                    'school_year_id' => $validated['school_year_id']
                ]);
                \Log::info('Schedule created successfully:', ['id' => $createdSchedule->id]);
                
                $createdSchedules[] = $createdSchedule;
            } catch (\Exception $e) {
                \Log::error('Failed to create schedule:', [
                    'error' => $e->getMessage(),
                    'data' => $scheduleData
                ]);
                return back()->withErrors(['schedule' => 'Failed to create schedule: ' . $e->getMessage()]);
            }
        }

        $count = count($createdSchedules);
        $faculty = User::find($validated['faculty_id']);
        $subject = Subject::find($validated['subject_id']);
        
        $facultyName = $faculty ? "{$faculty->firstname} {$faculty->lastname}" : "Faculty";
        $subjectName = $subject ? $subject->name : "Subject";
        
        return redirect()->route('registrar.schedules.index')->with('success', "Successfully assigned {$subjectName} to {$facultyName} for {$count} schedules");
    }

    /**
     * Get student schedule (for student dashboard)
     */
    public function getStudentSchedule($studentId)
    {
        try {
            // Get student using raw query to avoid model issues
            $student = \DB::table('student_personal_info')
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
                $schedules = \DB::table('class')
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
            \Log::error('Error fetching student schedule: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student schedule'
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
                
                // Try H:i:s format first, then H:i format
                try {
                    $scheduleStart = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleStartTime);
                } catch (\Exception $e) {
                    try {
                        $scheduleStart = \Carbon\Carbon::createFromFormat('H:i', $scheduleStartTime);
                    } catch (\Exception $e2) {
                        \Log::warning('Invalid start time format: ' . $scheduleStartTime);
                        return false;
                    }
                }
                
                try {
                    $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleEndTime);
                } catch (\Exception $e) {
                    try {
                        $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i', $scheduleEndTime);
                    } catch (\Exception $e2) {
                        \Log::warning('Invalid end time format: ' . $scheduleEndTime);
                        return false;
                    }
                }
                
                // Check for time overlap: schedules conflict if they overlap at any point
                return $startTime->lt($scheduleEnd) && $endTime->gt($scheduleStart);
            });
            
        if ($conflictingSchedules->isNotEmpty()) {
            foreach ($conflictingSchedules as $conflictSchedule) {
                $subjectName = $conflictSchedule->subject ? $conflictSchedule->subject->subject_name : 'Unknown Subject';
                $sectionName = $conflictSchedule->section ? $conflictSchedule->section->section_name : 'Unknown Section';
                $strandName = $conflictSchedule->section && $conflictSchedule->section->strand 
                    ? $conflictSchedule->section->strand->strand_name 
                    : 'Unknown Strand';
                
                $conflicts[] = "Faculty is already scheduled for {$subjectName} ({$sectionName} - {$strandName}) from {$conflictSchedule->start_time} to {$conflictSchedule->end_time}";
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
                            return false;
                        }
                    }
                    
                    try {
                        $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i:s', $scheduleEndTime);
                    } catch (\Exception $e) {
                        try {
                            $scheduleEnd = \Carbon\Carbon::createFromFormat('H:i', $scheduleEndTime);
                        } catch (\Exception $e2) {
                            return false;
                        }
                    }
                    
                    return $startTime->lt($scheduleEnd) && $endTime->gt($scheduleStart);
                });
                
            if ($roomConflicts->isNotEmpty()) {
                foreach ($roomConflicts as $roomConflict) {
                    $facultyName = $roomConflict->faculty ? $roomConflict->faculty->name : 'Unknown Faculty';
                    $subjectName = $roomConflict->subject ? $roomConflict->subject->subject_name : 'Unknown Subject';
                    
                    $conflicts[] = "Room {$data['room']} is already occupied by {$facultyName} for {$subjectName} from {$roomConflict->start_time} to {$roomConflict->end_time}";
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
        
        \Log::info('Schedule Data Check:', [
            'total_schedules' => $totalSchedules,
            'schedules_without_section' => $schedulesWithoutSection,
            'schedules_with_section' => $totalSchedules - $schedulesWithoutSection
        ]);

        if ($schedulesWithoutSection > 0) {
            \Log::warning('Found schedules without section assignments', [
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
}
