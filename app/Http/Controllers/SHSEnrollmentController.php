<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\User;
use App\Models\StudentPersonalInfo;
use App\Models\SchoolYear;
use App\Models\Strand;
use App\Models\Section;
use App\Models\Subject;
use App\Models\ClassSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class SHSEnrollmentController extends Controller
{
    /**
     * Show Grade 11 enrollment form
     */
    public function showGrade11Form()
    {
        $user = Auth::user();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return redirect()->back()->with('error', 'No active school year found.');
        }

        // Check if student already has Grade 11 enrollment for this school year
        $existingEnrollment = Enrollment::where('student_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('grade_level', 'Grade 11')
            ->first();

        if ($existingEnrollment) {
            return redirect()->route('student.dashboard')
                ->with('info', 'You are already enrolled in Grade 11 for this school year.');
        }

        $strands = Strand::all();
        
        return Inertia::render('Student/Grade11Enrollment', [
            'strands' => $strands,
            'activeSchoolYear' => $activeSchoolYear,
            'user' => $user
        ]);
    }

    /**
     * Process Grade 11 enrollment
     */
    public function enrollGrade11(Request $request)
    {
        $validated = $request->validate([
            'strand_id' => 'required|exists:strands,id',
            'documents' => 'nullable|array',
            'documents.*' => 'file|mimes:pdf,jpeg,png,jpg|max:5120'
        ]);

        $user = Auth::user();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Prevent duplicate enrollments
        $existingEnrollment = Enrollment::where('student_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('grade_level', 'Grade 11')
            ->first();

        if ($existingEnrollment) {
            throw ValidationException::withMessages([
                'enrollment' => 'You are already enrolled in Grade 11 for this school year.'
            ]);
        }

        DB::beginTransaction();
        try {
            // Handle document uploads
            $documentPaths = [];
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $key => $file) {
                    $path = $file->store('enrollment_documents', 'public');
                    $documentPaths[$key] = $path;
                }
            }

            // Create Grade 11 enrollment
            $enrollment = Enrollment::create([
                'student_id' => $user->id,
                'school_year_id' => $activeSchoolYear->id,
                'strand_id' => $validated['strand_id'],
                'grade_level' => 'Grade 11',
                'intended_grade_level' => 'Grade 11',
                'status' => 'pending',
                'enrollment_method' => 'self',
                'enrollment_type' => 'regular',
                'academic_year_status' => 'in_progress',
                'has_grade_11_enrollment' => false, // Will be true after approval
                'documents' => json_encode($documentPaths),
                'submitted_at' => now(),
                'date_enrolled' => now()
            ]);

            DB::commit();

            Log::info('Grade 11 enrollment submitted', [
                'student_id' => $user->id,
                'enrollment_id' => $enrollment->id,
                'strand_id' => $validated['strand_id']
            ]);

            return redirect()->route('student.dashboard')
                ->with('success', 'Grade 11 enrollment submitted successfully! Please wait for coordinator approval.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Grade 11 enrollment failed', [
                'student_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            
            throw ValidationException::withMessages([
                'enrollment' => 'Failed to submit enrollment. Please try again.'
            ]);
        }
    }

    /**
     * Show Grade 12 enrollment form with validation
     */
    public function showGrade12Form()
    {
        $user = Auth::user();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return redirect()->back()->with('error', 'No active school year found.');
        }

        // Check for existing Grade 12 enrollment
        $existingGrade12 = Enrollment::where('student_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('grade_level', 'Grade 12')
            ->first();

        if ($existingGrade12) {
            return redirect()->route('student.dashboard')
                ->with('info', 'You are already enrolled in Grade 12 for this school year.');
        }

        // Check for Grade 11 enrollment (current or previous year)
        $grade11Enrollment = Enrollment::where('student_id', $user->id)
            ->where('grade_level', 'Grade 11')
            ->where('status', 'enrolled')
            ->first();

        $canSelfEnroll = !$grade11Enrollment;
        $strands = Strand::all();

        return Inertia::render('Student/Grade12Enrollment', [
            'strands' => $strands,
            'activeSchoolYear' => $activeSchoolYear,
            'user' => $user,
            'hasGrade11Enrollment' => (bool)$grade11Enrollment,
            'canSelfEnroll' => $canSelfEnroll,
            'grade11Enrollment' => $grade11Enrollment,
            'notice' => $grade11Enrollment 
                ? 'You will be automatically enrolled in Grade 12 by your coordinator based on your Grade 11 enrollment.'
                : 'If you were not enrolled in this system during Grade 11, you must submit your own Grade 12 enrollment.'
        ]);
    }

    /**
     * Process Grade 12 self-enrollment (for students without Grade 11 enrollment)
     */
    public function enrollGrade12(Request $request)
    {
        $validated = $request->validate([
            'strand_id' => 'required|exists:strands,id',
            'previous_school' => 'required|string|max:255',
            'grade_11_completion_year' => 'required|string|max:10',
            'documents' => 'nullable|array',
            'documents.*' => 'file|mimes:pdf,jpeg,png,jpg|max:5120'
        ]);

        $user = Auth::user();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Check if student has Grade 11 enrollment - if yes, deny self-enrollment
        $grade11Enrollment = Enrollment::where('student_id', $user->id)
            ->where('grade_level', 'Grade 11')
            ->where('status', 'enrolled')
            ->first();

        if ($grade11Enrollment) {
            throw ValidationException::withMessages([
                'enrollment' => 'You cannot self-enroll in Grade 12 because you have a Grade 11 enrollment. Please wait for auto-enrollment by your coordinator.'
            ]);
        }

        // Check for existing Grade 12 enrollment
        $existingGrade12 = Enrollment::where('student_id', $user->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('grade_level', 'Grade 12')
            ->first();

        if ($existingGrade12) {
            throw ValidationException::withMessages([
                'enrollment' => 'You are already enrolled in Grade 12 for this school year.'
            ]);
        }

        DB::beginTransaction();
        try {
            // Handle document uploads
            $documentPaths = [];
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $key => $file) {
                    $path = $file->store('enrollment_documents', 'public');
                    $documentPaths[$key] = $path;
                }
            }

            // Create Grade 12 enrollment
            $enrollment = Enrollment::create([
                'student_id' => $user->id,
                'school_year_id' => $activeSchoolYear->id,
                'strand_id' => $validated['strand_id'],
                'grade_level' => 'Grade 12',
                'intended_grade_level' => 'Grade 12',
                'status' => 'pending',
                'enrollment_method' => 'self',
                'enrollment_type' => 'regular',
                'academic_year_status' => 'in_progress',
                'has_grade_11_enrollment' => false,
                'last_school_attended' => $validated['previous_school'],
                'documents' => json_encode($documentPaths),
                'submitted_at' => now(),
                'date_enrolled' => now()
            ]);

            DB::commit();

            Log::info('Grade 12 self-enrollment submitted', [
                'student_id' => $user->id,
                'enrollment_id' => $enrollment->id,
                'strand_id' => $validated['strand_id'],
                'previous_school' => $validated['previous_school']
            ]);

            return redirect()->route('student.dashboard')
                ->with('success', 'Grade 12 enrollment submitted successfully! Please wait for coordinator approval.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Grade 12 enrollment failed', [
                'student_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            
            throw ValidationException::withMessages([
                'enrollment' => 'Failed to submit enrollment. Please try again.'
            ]);
        }
    }

    /**
     * Faculty dashboard - Show students eligible for Grade 12 auto-enrollment
     */
    public function facultyAutoEnrollments()
    {
        $user = Auth::user();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Get students with Grade 11 enrollment who are eligible for Grade 12 auto-enrollment
        $eligibleStudents = Enrollment::with(['student', 'assignedStrand', 'assignedSection'])
            ->where('grade_level', 'Grade 11')
            ->where('status', 'enrolled')
            ->whereDoesntHave('grade12Enrollment', function($query) use ($activeSchoolYear) {
                $query->where('school_year_id', $activeSchoolYear->id);
            })
            ->get();

        return Inertia::render('Faculty/AutoEnrollments', [
            'eligibleStudents' => $eligibleStudents,
            'activeSchoolYear' => $activeSchoolYear,
            'user' => $user
        ]);
    }

    /**
     * Approve and create Grade 12 auto-enrollment
     */
    public function approveAutoEnrollment(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:users,id',
            'section_id' => 'nullable|exists:sections,id'
        ]);

        $user = Auth::user();
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Get Grade 11 enrollment
        $grade11Enrollment = Enrollment::where('student_id', $validated['student_id'])
            ->where('grade_level', 'Grade 11')
            ->where('status', 'enrolled')
            ->first();

        if (!$grade11Enrollment) {
            throw ValidationException::withMessages([
                'student' => 'Student does not have a valid Grade 11 enrollment.'
            ]);
        }

        // Check if Grade 12 enrollment already exists
        $existingGrade12 = Enrollment::where('student_id', $validated['student_id'])
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('grade_level', 'Grade 12')
            ->first();

        if ($existingGrade12) {
            throw ValidationException::withMessages([
                'student' => 'Student is already enrolled in Grade 12.'
            ]);
        }

        DB::beginTransaction();
        try {
            // Create Grade 12 auto-enrollment
            $grade12Enrollment = Enrollment::create([
                'student_id' => $validated['student_id'],
                'school_year_id' => $activeSchoolYear->id,
                'strand_id' => $grade11Enrollment->strand_id,
                'assigned_section_id' => $validated['section_id'] ?? $grade11Enrollment->assigned_section_id,
                'grade_level' => 'Grade 12',
                'intended_grade_level' => 'Grade 12',
                'status' => 'enrolled', // Auto-approved
                'enrollment_method' => 'auto',
                'enrollment_type' => 'regular',
                'academic_year_status' => 'in_progress',
                'has_grade_11_enrollment' => true,
                'previous_enrollment_id' => $grade11Enrollment->id,
                'enrolled_by' => $user->id,
                'coordinator_id' => $user->id,
                'reviewed_at' => now(),
                'date_enrolled' => now()
            ]);

            DB::commit();

            Log::info('Grade 12 auto-enrollment approved', [
                'student_id' => $validated['student_id'],
                'grade12_enrollment_id' => $grade12Enrollment->id,
                'grade11_enrollment_id' => $grade11Enrollment->id,
                'approved_by' => $user->id
            ]);

            return redirect()->back()
                ->with('success', 'Grade 12 auto-enrollment approved successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Grade 12 auto-enrollment failed', [
                'student_id' => $validated['student_id'],
                'error' => $e->getMessage()
            ]);
            
            throw ValidationException::withMessages([
                'enrollment' => 'Failed to approve auto-enrollment. Please try again.'
            ]);
        }
    }

    /**
     * Generate and view Certificate of Registration (COR)
     */
    public function viewCOR($enrollmentId)
    {
        $enrollment = Enrollment::with([
            'student', 
            'assignedStrand', 
            'assignedSection', 
            'schoolYear'
        ])->findOrFail($enrollmentId);

        // Verify user can access this COR
        $user = Auth::user();
        if ($user->role === 'student' && $enrollment->student_id !== $user->id) {
            abort(403, 'Unauthorized access to COR.');
        }

        // Get subjects for the enrollment
        $subjects = $this->getSubjectsForCOR($enrollment);

        return Inertia::render('Student/CORView', [
            'enrollment' => $enrollment,
            'subjects' => $subjects,
            'student' => $enrollment->student,
            'strand' => $enrollment->assignedStrand,
            'section' => $enrollment->assignedSection,
            'schoolYear' => $enrollment->schoolYear
        ]);
    }

    /**
     * Generate COR PDF
     */
    public function generateCORPDF($enrollmentId)
    {
        $enrollment = Enrollment::with([
            'student', 
            'assignedStrand', 
            'assignedSection', 
            'schoolYear'
        ])->findOrFail($enrollmentId);

        // Verify user can access this COR
        $user = Auth::user();
        if ($user->role === 'student' && $enrollment->student_id !== $user->id) {
            abort(403, 'Unauthorized access to COR.');
        }

        // Get subjects for the enrollment
        $subjects = $this->getSubjectsForCOR($enrollment);

        // Mark COR as generated
        if (!$enrollment->cor_generated) {
            $enrollment->update([
                'cor_generated' => true,
                'cor_generated_at' => now(),
                'cor_subjects' => json_encode($subjects)
            ]);
        }

        $data = [
            'enrollment' => $enrollment,
            'subjects' => $subjects,
            'student' => $enrollment->student,
            'strand' => $enrollment->assignedStrand,
            'section' => $enrollment->assignedSection,
            'schoolYear' => $enrollment->schoolYear,
            'generatedAt' => now()->format('F d, Y')
        ];

        $pdf = Pdf::loadView('cor.certificate', $data);
        
        $filename = "COR_{$enrollment->student->lastname}_{$enrollment->grade_level}_{$enrollment->schoolYear->year_start}-{$enrollment->schoolYear->year_end}.pdf";
        
        return $pdf->download($filename);
    }

    /**
     * Get subjects for COR based on enrollment
     */
    private function getSubjectsForCOR($enrollment)
    {
        // Get subjects based on strand and grade level
        $subjects = Subject::where('strand_id', $enrollment->strand_id)
            ->where('year_level', $enrollment->grade_level)
            ->orderBy('semester')
            ->orderBy('name')
            ->get()
            ->groupBy('semester');

        return [
            'first_semester' => $subjects->get(1, collect()),
            'second_semester' => $subjects->get(2, collect())
        ];
    }
}
