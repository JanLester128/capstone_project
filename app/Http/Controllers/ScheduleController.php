<?php

namespace App\Http\Controllers;

use App\Models\ClassSchedule;
use App\Models\Subject;
use App\Models\Section;
use App\Models\User;
use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    /**
     * Display schedule management page.
     */
    public function index()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return redirect()->back()->with('error', 'No active school year found. Please create and activate a school year first.');
        }

        // Get all schedules with relationships
        $schedules = ClassSchedule::with(['subject', 'section.strand', 'faculty', 'schoolYear'])
                              ->where('school_year_id', $activeSchoolYear->id)
                              ->where('is_active', true)
                              ->orderBy('day_of_week')
                              ->orderBy('start_time')
                              ->get();

        // Get data for dropdowns
        $subjects = Subject::with('strand')->orderBy('name')->get();
        $sections = Section::with('strand')->orderBy('section_name')->get();
        $faculty = User::whereIn('role', ['faculty', 'coordinator'])->orderBy('firstname')->get();
        $strands = \App\Models\Strand::orderBy('name')->get();

        return Inertia::render('Registrar/ScheduleManagement', [
            'schedules' => $schedules,
            'subjects' => $subjects,
            'sections' => $sections,
            'faculty' => $faculty,
            'strands' => $strands,
            'activeSchoolYear' => $activeSchoolYear,
        ]);
    }

    /**
     * Store a new schedule.
     */
    public function store(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'required|exists:sections,id',
            'faculty_id' => 'required|exists:users,id',
            'day_of_week' => 'required|string',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'semester' => 'required|string',
        ]);

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year found.'], 400);
        }

        try {
            // Check for conflicts
            $conflict = ClassSchedule::where('faculty_id', $request->faculty_id)
                                 ->where('school_year_id', $activeSchoolYear->id)
                                 ->where('day_of_week', $request->day_of_week)
                                 ->where('is_active', true)
                                 ->where(function ($query) use ($request) {
                                     $query->whereBetween('start_time', [$request->start_time, $request->end_time])
                                           ->orWhereBetween('end_time', [$request->start_time, $request->end_time])
                                           ->orWhere(function ($q) use ($request) {
                                               $q->where('start_time', '<=', $request->start_time)
                                                 ->where('end_time', '>=', $request->end_time);
                                           });
                                 })
                                 ->exists();

            if ($conflict) {
                return response()->json(['error' => 'Schedule conflict detected.'], 400);
            }

            $schedule = ClassSchedule::create([
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id,
                'faculty_id' => $request->faculty_id,
                'school_year_id' => $activeSchoolYear->id,
                'day_of_week' => $request->day_of_week,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'duration' => $this->calculateDuration($request->start_time, $request->end_time),
                'semester' => $request->semester,
                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Schedule created successfully.',
                'schedule' => $schedule->load(['subject', 'section', 'faculty']),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create schedule', [
                'error' => $e->getMessage(),
                'request_data' => $request->all(),
            ]);

            return response()->json(['error' => 'Failed to create schedule.'], 500);
        }
    }

    /**
     * Update a schedule.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'required|exists:sections,id',
            'faculty_id' => 'required|exists:users,id',
            'day_of_week' => 'required|string',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'semester' => 'required|string',
        ]);

        try {
            $schedule = ClassSchedule::findOrFail($id);

            // Check for conflicts (excluding current schedule)
            $conflict = ClassSchedule::where('faculty_id', $request->faculty_id)
                                 ->where('school_year_id', $schedule->school_year_id)
                                 ->where('day_of_week', $request->day_of_week)
                                 ->where('is_active', true)
                                 ->where('id', '!=', $id)
                                 ->where(function ($query) use ($request) {
                                     $query->whereBetween('start_time', [$request->start_time, $request->end_time])
                                           ->orWhereBetween('end_time', [$request->start_time, $request->end_time])
                                           ->orWhere(function ($q) use ($request) {
                                               $q->where('start_time', '<=', $request->start_time)
                                                 ->where('end_time', '>=', $request->end_time);
                                           });
                                 })
                                 ->exists();

            if ($conflict) {
                return response()->json(['error' => 'Schedule conflict detected.'], 400);
            }

            $schedule->update([
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id,
                'faculty_id' => $request->faculty_id,
                'day_of_week' => $request->day_of_week,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'duration' => $this->calculateDuration($request->start_time, $request->end_time),
                'semester' => $request->semester,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Schedule updated successfully.',
                'schedule' => $schedule->load(['subject', 'section', 'faculty']),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update schedule', [
                'error' => $e->getMessage(),
                'schedule_id' => $id,
            ]);

            return response()->json(['error' => 'Failed to update schedule.'], 500);
        }
    }

    /**
     * Delete a schedule.
     */
    public function destroy($id)
    {
        try {
            $schedule = ClassSchedule::findOrFail($id);
            $schedule->delete();

            return response()->json([
                'success' => true,
                'message' => 'Schedule deleted successfully.',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete schedule', [
                'error' => $e->getMessage(),
                'schedule_id' => $id,
            ]);

            return response()->json(['error' => 'Failed to delete schedule.'], 500);
        }
    }

    /**
     * Check for schedule conflicts.
     */
    public function checkConflicts(Request $request)
    {
        $request->validate([
            'faculty_id' => 'required|exists:users,id',
            'day_of_week' => 'required|string',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'exclude_id' => 'nullable|exists:class,id',
        ]);

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        $query = ClassSchedule::where('faculty_id', $request->faculty_id)
                          ->where('school_year_id', $activeSchoolYear->id)
                          ->where('day_of_week', $request->day_of_week)
                          ->where('is_active', true)
                          ->where(function ($query) use ($request) {
                              $query->whereBetween('start_time', [$request->start_time, $request->end_time])
                                    ->orWhereBetween('end_time', [$request->start_time, $request->end_time])
                                    ->orWhere(function ($q) use ($request) {
                                        $q->where('start_time', '<=', $request->start_time)
                                          ->where('end_time', '>=', $request->end_time);
                                    });
                          });

        if ($request->exclude_id) {
            $query->where('id', '!=', $request->exclude_id);
        }

        $conflicts = $query->with(['subject', 'section'])->get();

        return response()->json([
            'has_conflicts' => $conflicts->count() > 0,
            'conflicts' => $conflicts,
        ]);
    }

    /**
     * Calculate duration in minutes.
     */
    private function calculateDuration($startTime, $endTime)
    {
        $start = \Carbon\Carbon::createFromFormat('H:i', $startTime);
        $end = \Carbon\Carbon::createFromFormat('H:i', $endTime);
        
        return $end->diffInMinutes($start);
    }
}
