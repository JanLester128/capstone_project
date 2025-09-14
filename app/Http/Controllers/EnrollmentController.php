<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Strand;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\ClassSchedule;
use App\Models\ClassDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class EnrollmentController extends Controller
{
    /**
     * Show enrollment form for students
     */
    public function create()
    {
        $strands = Strand::all();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        return Inertia::render('Student/EnrollmentForm', [
            'strands' => $strands,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    /**
     * Store student pre-enrollment submission
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'middlename' => 'nullable|string|max:255',
            'lrn' => 'required|string|max:12|unique:enrollments,lrn',
            'email' => 'required|email|unique:enrollments,email',
            'phone' => 'nullable|string|max:15',
            'birthdate' => 'required|date',
            'birthplace' => 'required|string|max:255',
            'sex' => 'required|in:Male,Female',
            'religion' => 'nullable|string|max:255',
            'address' => 'required|string',
            'age' => 'required|integer|min:15|max:25',
            'mother_tongue' => 'nullable|string|max:255',
            'is_ip_community' => 'boolean',
            'is_4ps' => 'boolean',
            'pwd_id' => 'nullable|string|max:255',
            'grade_level' => 'required|in:Grade 11,Grade 12',
            'last_school_attended' => 'required|string|max:255',
            'last_grade_completed' => 'required|string|max:255',
            'last_school_year' => 'required|string|max:255',
            'first_strand_choice' => 'required|exists:strands,id',
            'second_strand_choice' => 'nullable|exists:strands,id',
            'third_strand_choice' => 'nullable|exists:strands,id',
            'student_photo' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'psa_birth_certificate' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
            'report_card' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
        ]);

        // Handle file uploads
        if ($request->hasFile('student_photo')) {
            $validated['student_photo'] = $request->file('student_photo')->store('enrollment_documents', 'public');
        }

        if ($request->hasFile('psa_birth_certificate')) {
            $validated['psa_birth_certificate'] = $request->file('psa_birth_certificate')->store('enrollment_documents', 'public');
        }

        if ($request->hasFile('report_card')) {
            $validated['report_card'] = $request->file('report_card')->store('enrollment_documents', 'public');
        }

        // Add user and school year
        $validated['user_id'] = Auth::id();
        $validated['school_year_id'] = SchoolYear::where('is_active', true)->first()->id;
        $validated['submitted_at'] = now();

        Enrollment::create($validated);

        return redirect()->route('student.dashboard')->with('success', 'Enrollment application submitted successfully!');
    }

    /**
     * Show coordinator enrollment management page
     */
    public function coordinatorIndex()
    {
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        $pendingEnrollments = Enrollment::with(['firstStrandChoice', 'secondStrandChoice', 'thirdStrandChoice'])
            ->pending()
            ->forSchoolYear($activeSchoolYear->id)
            ->latest('submitted_at')
            ->get();

        $approvedEnrollments = Enrollment::with(['assignedStrand', 'assignedSection'])
            ->approved()
            ->forSchoolYear($activeSchoolYear->id)
            ->latest('reviewed_at')
            ->get();

        $rejectedEnrollments = Enrollment::with(['coordinator'])
            ->rejected()
            ->forSchoolYear($activeSchoolYear->id)
            ->latest('reviewed_at')
            ->get();

        $strands = Strand::all();
        $sections = Section::with('strand')->get();

        return Inertia::render('Coordinator/EnrollmentManagement', [
            'pendingEnrollments' => $pendingEnrollments,
            'approvedEnrollments' => $approvedEnrollments,
            'rejectedEnrollments' => $rejectedEnrollments,
            'strands' => $strands,
            'sections' => $sections,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    /**
     * Approve enrollment and assign strand/section
     */
    public function approve(Request $request, Enrollment $enrollment)
    {
        $validated = $request->validate([
            'assigned_strand_id' => 'required|exists:strands,id',
            'assigned_section_id' => 'required|exists:sections,id',
            'coordinator_notes' => 'nullable|string'
        ]);

        $enrollment->update([
            'status' => 'approved',
            'assigned_strand_id' => $validated['assigned_strand_id'],
            'assigned_section_id' => $validated['assigned_section_id'],
            'coordinator_id' => Auth::id(),
            'coordinator_notes' => $validated['coordinator_notes'],
            'reviewed_at' => now()
        ]);

        return back()->with('success', 'Enrollment approved successfully!');
    }

    /**
     * Reject enrollment
     */
    public function reject(Request $request, Enrollment $enrollment)
    {
        $validated = $request->validate([
            'coordinator_notes' => 'required|string'
        ]);

        $enrollment->update([
            'status' => 'rejected',
            'coordinator_id' => Auth::id(),
            'coordinator_notes' => $validated['coordinator_notes'],
            'reviewed_at' => now()
        ]);

        return back()->with('success', 'Enrollment rejected.');
    }

    /**
     * Enroll approved student in class schedules
     */
    public function enrollInClasses(Request $request, Enrollment $enrollment)
    {
        $validated = $request->validate([
            'class_ids' => 'required|array',
            'class_ids.*' => 'exists:class,id'
        ]);

        foreach ($validated['class_ids'] as $classId) {
            ClassDetail::create([
                'class_id' => $classId,
                'enrollment_id' => $enrollment->id,
                'section_id' => $enrollment->assigned_section_id,
                'enrolled_at' => now()
            ]);
        }

        return back()->with('success', 'Student enrolled in selected classes successfully!');
    }

    /**
     * Get class schedules for COR generation
     */
    public function getClassSchedules(Enrollment $enrollment)
    {
        if (!$enrollment->isApproved() || !$enrollment->assigned_section_id) {
            return response()->json(['error' => 'Student not properly enrolled'], 400);
        }

        $classDetails = ClassDetail::with(['classSchedule.subject', 'classSchedule.faculty'])
            ->where('enrollment_id', $enrollment->id)
            ->where('section_id', $enrollment->assigned_section_id)
            ->get();

        $schedulesByDay = $classDetails->groupBy(function ($detail) {
            return $detail->classSchedule->day_of_week;
        });

        return response()->json([
            'schedules' => $schedulesByDay,
            'student' => $enrollment,
            'section' => $enrollment->assignedSection,
            'strand' => $enrollment->assignedStrand
        ]);
    }
}
