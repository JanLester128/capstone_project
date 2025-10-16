<?php

namespace App\Http\Controllers;

use App\Models\FacultyLoad;
use App\Models\User;
use App\Models\SchoolYear;
use App\Models\ClassSchedule;
use App\Models\Subject;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class FacultyLoadController extends Controller
{
    /**
     * Display faculty load management page for registrar.
     */
    public function index()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return redirect()->back()->with('error', 'No active school year found. Please create and activate a school year first.');
        }

        // Get all faculty members with their current loads
        $faculty = User::whereIn('role', ['faculty', 'coordinator'])
                      ->with(['currentFacultyLoad', 'classes' => function ($query) use ($activeSchoolYear) {
                          $query->where('school_year_id', $activeSchoolYear->id)
                                ->where('is_active', true)
                                ->with(['subject', 'section']);
                      }])
                      ->get()
                      ->map(function ($user) use ($activeSchoolYear) {
                          $load = $user->currentFacultyLoad;
                          $classCount = $user->classes->count();
                          
                          return [
                              'id' => $user->id,
                              'firstname' => $user->firstname,
                              'lastname' => $user->lastname,
                              'email' => $user->email,
                              'role' => $user->role,
                              'is_coordinator' => $user->is_coordinator,
                              'current_loads' => $classCount,
                              'max_loads' => $load ? $load->max_loads : 5,
                              'remaining_loads' => $load ? $load->remaining_loads : (5 - $classCount),
                              'is_overloaded' => $classCount > ($load ? $load->max_loads : 5),
                              'utilization_percentage' => $load ? $load->utilization_percentage : ($classCount > 0 ? ($classCount / 5) * 100 : 0),
                              'classes' => $user->classes->map(function ($class) {
                                  return [
                                      'id' => $class->id,
                                      'subject_name' => $class->subject->name,
                                      'section_name' => $class->section->section_name,
                                      'day_of_week' => $class->day_of_week,
                                      'start_time' => $class->start_time,
                                      'end_time' => $class->end_time,
                                      'semester' => $class->semester,
                                  ];
                              }),
                          ];
                      });

        // Get available subjects and sections for assignment
        $subjects = Subject::with('strand')->get();
        $sections = Section::with('strand')->get();

        return Inertia::render('Registrar/FacultyLoadManagement', [
            'faculty' => $faculty,
            'subjects' => $subjects,
            'sections' => $sections,
            'activeSchoolYear' => $activeSchoolYear,
            'loadPolicy' => [
                'max_loads_per_faculty' => 5,
                'allowed_load_types' => [
                    'Single subject with multiple sections (up to 5)',
                    'Multiple subjects across different sections (total not exceeding 5)'
                ]
            ]
        ]);
    }

    /**
     * Assign a new load to faculty member.
     */
    public function assignLoad(Request $request)
    {
        $request->validate([
            'faculty_id' => 'required|exists:users,id',
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'required|exists:sections,id',
            'day_of_week' => 'required|string',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'semester' => 'required|string',
        ]);

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year found.'], 400);
        }

        // Check if faculty exists and is valid
        $faculty = User::whereIn('role', ['faculty', 'coordinator'])
                      ->where('id', $request->faculty_id)
                      ->first();
        
        if (!$faculty) {
            return response()->json(['error' => 'Invalid faculty member selected.'], 400);
        }

        // Get or create faculty load record
        $facultyLoad = FacultyLoad::firstOrCreate([
            'faculty_id' => $request->faculty_id,
            'school_year_id' => $activeSchoolYear->id,
        ], [
            'total_loads' => 0,
            'max_loads' => 5,
            'assigned_by' => Auth::id(),
            'assigned_at' => now(),
        ]);

        // Check if faculty would exceed load limit
        $currentLoads = ClassSchedule::where('faculty_id', $request->faculty_id)
                                 ->where('school_year_id', $activeSchoolYear->id)
                                 ->where('is_active', true)
                                 ->count();

        if ($currentLoads >= $facultyLoad->max_loads) {
            return response()->json([
                'error' => "Faculty member has reached maximum load limit of {$facultyLoad->max_loads} classes. Cannot assign more loads.",
                'current_loads' => $currentLoads,
                'max_loads' => $facultyLoad->max_loads,
            ], 400);
        }

        // Check for schedule conflicts
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
            return response()->json([
                'error' => 'Schedule conflict detected. Faculty member already has a class at this time.',
            ], 400);
        }

        // Check if this exact class assignment already exists
        $existingClass = ClassSchedule::where('faculty_id', $request->faculty_id)
                                  ->where('subject_id', $request->subject_id)
                                  ->where('section_id', $request->section_id)
                                  ->where('school_year_id', $activeSchoolYear->id)
                                  ->where('is_active', true)
                                  ->first();

        if ($existingClass) {
            return response()->json([
                'error' => 'This faculty member is already assigned to this subject and section.',
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Create the class assignment
            $class = ClassSchedule::create([
                'faculty_id' => $request->faculty_id,
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id,
                'school_year_id' => $activeSchoolYear->id,
                'day_of_week' => $request->day_of_week,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'duration' => $this->calculateDuration($request->start_time, $request->end_time),
                'semester' => $request->semester,
                'is_active' => true,
            ]);

            // Update faculty load count
            $facultyLoad->updateLoadCount();

            DB::commit();

            Log::info('Faculty load assigned successfully', [
                'faculty_id' => $request->faculty_id,
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id,
                'assigned_by' => Auth::id(),
                'class_id' => $class->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Load assigned successfully to faculty member.',
                'class' => $class->load(['subject', 'section']),
                'faculty_load' => $facultyLoad->fresh(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to assign faculty load', [
                'error' => $e->getMessage(),
                'faculty_id' => $request->faculty_id,
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id,
            ]);

            return response()->json([
                'error' => 'Failed to assign load. Please try again.',
            ], 500);
        }
    }

    /**
     * Remove a load from faculty member.
     */
    public function removeLoad(Request $request, $classId)
    {
        $class = ClassSchedule::findOrFail($classId);
        
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if ($class->school_year_id !== $activeSchoolYear->id) {
            return response()->json(['error' => 'Cannot modify loads from inactive school years.'], 400);
        }

        try {
            DB::beginTransaction();

            // Get faculty load record
            $facultyLoad = FacultyLoad::where('faculty_id', $class->faculty_id)
                                    ->where('school_year_id', $activeSchoolYear->id)
                                    ->first();

            // Delete the class
            $class->delete();

            // Update faculty load count if record exists
            if ($facultyLoad) {
                $facultyLoad->updateLoadCount();
            }

            DB::commit();

            Log::info('Faculty load removed successfully', [
                'class_id' => $classId,
                'faculty_id' => $class->faculty_id,
                'removed_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Load removed successfully from faculty member.',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to remove faculty load', [
                'error' => $e->getMessage(),
                'class_id' => $classId,
            ]);

            return response()->json([
                'error' => 'Failed to remove load. Please try again.',
            ], 500);
        }
    }

    /**
     * Update faculty load limits.
     */
    public function updateLoadLimit(Request $request, $facultyId)
    {
        $request->validate([
            'max_loads' => 'required|integer|min:1|max:10',
        ]);

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year found.'], 400);
        }

        $facultyLoad = FacultyLoad::firstOrCreate([
            'faculty_id' => $facultyId,
            'school_year_id' => $activeSchoolYear->id,
        ], [
            'total_loads' => 0,
            'assigned_by' => Auth::id(),
            'assigned_at' => now(),
        ]);

        $facultyLoad->max_loads = $request->max_loads;
        $facultyLoad->checkOverload();

        Log::info('Faculty load limit updated', [
            'faculty_id' => $facultyId,
            'new_max_loads' => $request->max_loads,
            'updated_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Load limit updated successfully.',
            'faculty_load' => $facultyLoad,
        ]);
    }

    /**
     * Get faculty schedule conflicts.
     */
    public function checkScheduleConflicts(Request $request)
    {
        $request->validate([
            'faculty_id' => 'required|exists:users,id',
            'day_of_week' => 'required|string',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
        ]);

        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        $conflicts = ClassSchedule::where('faculty_id', $request->faculty_id)
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
                              ->with(['subject', 'section'])
                              ->get();

        return response()->json([
            'has_conflicts' => $conflicts->count() > 0,
            'conflicts' => $conflicts,
        ]);
    }

    /**
     * Calculate duration in minutes between two times.
     */
    private function calculateDuration($startTime, $endTime)
    {
        $start = \Carbon\Carbon::createFromFormat('H:i', $startTime);
        $end = \Carbon\Carbon::createFromFormat('H:i', $endTime);
        
        return $end->diffInMinutes($start);
    }
}
