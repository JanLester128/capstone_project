<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\Strand;
use App\Models\SchoolYear;
use App\Models\ClassSchedule;
use App\Models\Student;
use App\Models\Section;
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
        $user = Auth::user();
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
        $user = Auth::user();
        
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
        $user = Auth::user();
        
        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        // Initialize empty collections
        $schedules = collect([]);
        $students = collect([]);
        
        if ($activeSchoolYear && $user) {
            try {
                // Get schedules where this faculty is assigned
                $schedules = ClassSchedule::with(['section.strand', 'subject', 'faculty'])
                    ->where('faculty_id', $user->id)
                    ->where('school_year_id', $activeSchoolYear->id)
                    ->get();
                
                // Get students enrolled in faculty's sections
                $sectionIds = $schedules->pluck('section_id')->filter()->unique();
                if ($sectionIds->isNotEmpty()) {
                    $students = Student::with(['section.strand'])
                        ->whereIn('section_id', $sectionIds)
                        ->where('school_year_id', $activeSchoolYear->id)
                        ->get();
                }
            } catch (\Exception $e) {
                // Log error and continue with empty collections
                Log::error('Error fetching faculty grades data: ' . $e->getMessage());
            }
        }
        
        return Inertia::render('Faculty/Faculty_Grades', [
            'schedules' => $schedules,
            'students' => $students,
            'user' => $user,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    /**
     * Display student assignment page showing enrolled students by section
     */
    public function studentsPage(Request $request)
    {
        $user = $request->user();
        
        // Get all sections with their strands
        $sections = Section::with(['strand'])->orderBy('section_name')->get();
        
        // Get all enrolled students with their section and enrollment data
        $enrolledStudents = Student::with(['section', 'section.strand', 'user'])
            ->whereHas('enrollments', function($query) {
                $query->where('status', 'enrolled');
            })
            ->get()
            ->map(function($student) {
                return [
                    'id' => $student->id,
                    'student_id' => $student->student_id,
                    'firstname' => $student->firstname,
                    'lastname' => $student->lastname,
                    'email' => $student->user ? $student->user->email : null,
                    'grade_level' => $student->grade_level,
                    'section' => $student->section ? [
                        'id' => $student->section->id,
                        'section_name' => $student->section->section_name,
                        'strand' => $student->section->strand ? [
                            'code' => $student->section->strand->code,
                            'name' => $student->section->strand->name
                        ] : null
                    ] : null
                ];
            });

        return Inertia::render('Faculty/Faculty_Students', [
            'auth' => [
                'user' => $user
            ],
            'sections' => $sections,
            'enrolledStudents' => $enrolledStudents
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
