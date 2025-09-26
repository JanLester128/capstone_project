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
use Illuminate\Support\Facades\Log;
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
            // Basic enrollment info
            'gradeLevel' => 'required|in:Grade 11,Grade 12',
            'lastGrade' => 'required|string|max:255',
            'lastSY' => 'required|string|max:255',
            
            // Strand preferences (frontend sends these names)
            'firstChoice' => 'required|exists:strands,id',
            'secondChoice' => 'nullable|exists:strands,id',
            'thirdChoice' => 'nullable|exists:strands,id',
            
            // File uploads
            'reportCard' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
            'psaBirthCertificate' => 'nullable|file|mimes:pdf,jpeg,png,jpg|max:5120',
        ]);

        // Handle file uploads
        if ($request->hasFile('reportCard')) {
            $validated['report_card'] = $request->file('reportCard')->store('enrollment_documents', 'public');
        }

        if ($request->hasFile('psaBirthCertificate')) {
            $psaPath = $request->file('psaBirthCertificate')->store('enrollment_documents', 'public');
        }

        // Map frontend field names to database field names
        $enrollmentData = [
            'student_id' => Auth::id(), // This should be the user ID, which is correct
            'grade_level' => $validated['gradeLevel'],
            'last_school_attended' => 'Previous School', // Default value since not in form
            'last_grade_completed' => $validated['lastGrade'],
            'last_school_year' => $validated['lastSY'],
            'status' => 'pending',
        ];

        // Add file paths if uploaded
        if (isset($validated['report_card'])) {
            $enrollmentData['report_card'] = $validated['report_card'];
        }

        // Add school year and timestamps
        $schoolYear = SchoolYear::where('is_active', true)->first();
        $enrollmentData['school_year_id'] = $schoolYear->id;
        $enrollmentData['submitted_at'] = now();

        // Create enrollment record
        $enrollment = Enrollment::create($enrollmentData);

        // Store strand preferences in separate table
        $strandChoices = [
            'firstChoice' => $validated['firstChoice'],
            'secondChoice' => $validated['secondChoice'] ?? null,
            'thirdChoice' => $validated['thirdChoice'] ?? null,
        ];

        $preferences = [];
        foreach ($strandChoices as $choiceName => $strandId) {
            if ($strandId) {
                $order = $choiceName === 'firstChoice' ? 1 : ($choiceName === 'secondChoice' ? 2 : 3);
                $preferences[] = [
                    'student_id' => Auth::id(),
                    'enrollment_id' => $enrollment->id,
                    'strand_id' => $strandId,
                    'preference_order' => $order,
                    'school_year_id' => $schoolYear->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // Insert strand preferences
        if (!empty($preferences)) {
            try {
                \App\Models\StudentStrandPreference::insert($preferences);
                Log::info('Strand preferences inserted successfully', ['preferences' => $preferences]);
            } catch (\Exception $e) {
                Log::error('Failed to insert strand preferences', ['error' => $e->getMessage(), 'preferences' => $preferences]);
                // Continue with enrollment even if preferences fail
            }
        }

        // Store PSA birth certificate path if uploaded
        if (isset($psaPath)) {
            try {
                $enrollment->update([
                    'documents' => json_encode(['psa_birth_certificate' => $psaPath])
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to update enrollment documents', ['error' => $e->getMessage()]);
            }
        }

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
     * Approve enrollment and create class details for student
     */
    public function approve(Request $request, Enrollment $enrollment)
    {
        $validated = $request->validate([
            'strand_id' => 'required|exists:strands,id',
            'assigned_section_id' => 'required|exists:sections,id',
            'coordinator_notes' => 'nullable|string'
        ]);

        // Check section capacity limit (35 students maximum)
        $currentEnrollmentCount = ClassDetail::where('section_id', $validated['assigned_section_id'])
            ->where('enrollment_status', 'approved')
            ->where('school_year_id', $enrollment->school_year_id)
            ->count();

        if ($currentEnrollmentCount >= 35) {
            Log::warning('Section capacity exceeded', [
                'section_id' => $validated['assigned_section_id'],
                'current_count' => $currentEnrollmentCount,
                'enrollment_id' => $enrollment->id
            ]);
            
            return back()->withErrors([
                'assigned_section_id' => 'This section has reached its maximum capacity of 35 students. Please select a different section.'
            ]);
        }

        // Update enrollment status
        $enrollment->update([
            'status' => 'approved',
            'strand_id' => $validated['strand_id'],
            'assigned_section_id' => $validated['assigned_section_id'],
            'coordinator_id' => Auth::id(),
            'coordinator_notes' => $validated['coordinator_notes'],
            'reviewed_at' => now()
        ]);

        // Create class detail record for the approved student
        ClassDetail::create([
            'student_id' => $enrollment->student_id,
            'strand_id' => $validated['strand_id'],
            'section_id' => $validated['assigned_section_id'],
            'school_year_id' => $enrollment->school_year_id,
            'coordinator_notes' => $validated['coordinator_notes'],
            'enrollment_status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'is_enrolled' => false // Will be set to true when enrolled in specific classes
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
     * Enroll approved student in specific class schedules
     */
    public function enrollInClasses(Request $request, Enrollment $enrollment)
    {
        $validated = $request->validate([
            'class_ids' => 'required|array',
            'class_ids.*' => 'exists:class,id'
        ]);

        // Get the student's class detail record
        $classDetail = ClassDetail::where('student_id', $enrollment->student_id)
            ->where('enrollment_status', 'approved')
            ->first();

        if (!$classDetail) {
            return back()->withErrors(['error' => 'Student must be approved first before enrolling in classes.']);
        }

        foreach ($validated['class_ids'] as $classId) {
            // Update existing class detail or create new ones for specific classes
            ClassDetail::updateOrCreate([
                'class_id' => $classId,
                'student_id' => $enrollment->student_id,
            ], [
                'strand_id' => $classDetail->strand_id,
                'section_id' => $classDetail->section_id,
                'school_year_id' => $classDetail->school_year_id,
                'coordinator_notes' => $classDetail->coordinator_notes,
                'enrollment_status' => 'enrolled',
                'approved_by' => $classDetail->approved_by,
                'approved_at' => $classDetail->approved_at,
                'is_enrolled' => true,
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
            ->where('student_id', $enrollment->student_id)
            ->where('section_id', $enrollment->assigned_section_id)
            ->where('is_enrolled', true)
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
