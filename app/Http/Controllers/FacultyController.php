<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Strand;
// Removed Faculty model - using unified authentication

class FacultyController extends Controller
{
    /**
     * Get faculty status for the authenticated user
     */
    public function getStatus(Request $request)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['faculty', 'coordinator'])) {
            return back()->withErrors(['error' => 'Unauthorized access']);
        }

        return redirect()->back()->with([
            'status' => $user->role,
            'is_coordinator' => $user->role === 'coordinator'
        ]);
    }

    /**
     * Show faculty profile page with user data
     */
    public function profilePage()
    {
        $user = auth()->user();
        $assignedStrand = null;
        
        // Get assigned strand if user has one
        if ($user->assigned_strand_id) {
            $assignedStrand = Strand::find($user->assigned_strand_id);
        }
        
        return Inertia::render('Faculty/Faculty_Profile', [
            'user' => $user,
            'isCoordinator' => $user->role === 'coordinator',
            'assignedStrand' => $assignedStrand
        ]);
    }

    /**
     * Show faculty schedule page with schedule data
     */
    public function schedulePage()
    {
        $user = auth()->user();
        
        // Fetch all schedules for this faculty member with proper relationships
        $schedules = \App\Models\ClassSchedule::where('faculty_id', $user->id)
            ->with([
                'subject' => function($query) {
                    $query->select('id', 'name', 'code', 'strand_id', 'semester');
                },
                'subject.strand' => function($query) {
                    $query->select('id', 'name', 'code');
                },
                'section' => function($query) {
                    $query->select('id', 'section_name', 'year_level', 'strand_id');
                },
                'schoolYear' => function($query) {
                    $query->select('id', 'year_start', 'year_end', 'start_date', 'end_date');
                },
                'faculty' => function($query) {
                    $query->select('id', 'firstname', 'lastname', 'email');
                }
            ])
            ->select('id', 'section_id', 'subject_id', 'faculty_id', 'school_year_id', 'day_of_week', 'start_time', 'end_time', 'duration', 'semester', 'room', 'is_active')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();
        
        return Inertia::render('Faculty/Faculty_Schedule', [
            'classSchedules' => $schedules,
            'user' => $user
        ]);
    }

    /**
     * Show faculty grades page with classes and students data
     */
    public function gradesPage()
    {
        $user = auth()->user();
        $classes = [];
        $students = [];
        
        // TODO: Fetch faculty classes and enrolled students
        // $classes = ClassSchedule::where('faculty_id', $user->id)->get();
        // $students = Student::whereHas('enrollments', function($q) use ($user) {
        //     $q->whereIn('class_id', ClassSchedule::where('faculty_id', $user->id)->pluck('id'));
        // })->get();
        
        return Inertia::render('Faculty/Faculty_Grades', [
            'classes' => $classes,
            'students' => $students,
            'user' => $user
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
