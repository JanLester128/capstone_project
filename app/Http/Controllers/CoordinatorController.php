<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\StudentPersonalInfo;
use App\Models\Section;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Semester;
use App\Models\SchoolYear;
use Inertia\Inertia;

class CoordinatorController extends Controller
{
    public function __construct()
    {
        // Middleware is now handled in routes or via Route::middleware()
    }

    /**
     * Display pending enrollments for coordinator review (Page render)
     */
    public function enrollmentPage()
    {
        // Get the active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Enrollment', [
                'pendingStudents' => [],
                'approvedStudents' => [],
                'rejectedStudents' => [],
                'activeSchoolYear' => null
            ]);
        }

        // Helper function to process student data
        $processStudent = function ($student) {
            // Process strand preferences from JSON field
            $strandIds = json_decode($student->getAttributes()['strand_preferences'] ?? '[]', true);
            \Log::info('Raw strand_preferences: ' . ($student->getAttributes()['strand_preferences'] ?? 'null'));
            \Log::info('Decoded strand IDs: ' . json_encode($strandIds));
            
            if (!empty($strandIds) && is_array($strandIds)) {
                $strands = Strand::whereIn('id', $strandIds)->get();
                \Log::info('Found strands: ' . $strands->pluck('code')->toJson());
                $student->strand_preferences = $strands->pluck('code')->toArray();
                
                // If no codes found, fall back to names
                if (empty($student->strand_preferences)) {
                    $student->strand_preferences = $strands->pluck('name')->toArray();
                }
            } else {
                // Try alternative approaches if JSON decode fails
                $rawPrefs = $student->getAttributes()['strand_preferences'];
                if ($rawPrefs && is_string($rawPrefs)) {
                    // Try parsing as comma-separated values
                    $possibleIds = explode(',', str_replace([' ', '[', ']', '"'], '', $rawPrefs));
                    $possibleIds = array_filter(array_map('intval', $possibleIds));
                    
                    if (!empty($possibleIds)) {
                        $strands = Strand::whereIn('id', $possibleIds)->get();
                        $student->strand_preferences = $strands->pluck('code')->toArray();
                    } else {
                        $student->strand_preferences = ['No preferences specified'];
                    }
                } else {
                    $student->strand_preferences = ['No preferences specified'];
                }
            }
            
            // Ensure address is included
            $student->address = $student->address ?: 'No address provided';
            return $student;
        };

        // Get pending students
        $pendingStudents = Student::with(['user', 'strand', 'section'])
            ->where('enrollment_status', 'pending')
            ->get()
            ->map($processStudent);

        // Get approved students  
        $approvedStudents = Student::with(['user', 'strand', 'section'])
            ->where('enrollment_status', 'approved')
            ->get()
            ->map($processStudent);

        // Get rejected students
        $rejectedStudents = Student::with(['user', 'strand', 'section'])
            ->where('enrollment_status', 'rejected')
            ->get()
            ->map($processStudent);

        return Inertia::render('Faculty/Faculty_Enrollment', [
            'pendingStudents' => $pendingStudents,
            'approvedStudents' => $approvedStudents,
            'rejectedStudents' => $rejectedStudents,
            'activeSchoolYear' => $activeSchoolYear,
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    }

    /**
     * Get enrollment data via API for coordinator review
     */
    public function getEnrollmentData()
    {
        // Get the active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Enrollment', [
                'pendingStudents' => [],
                'approvedStudents' => [],
                'rejectedStudents' => [],
                'activeSchoolYear' => null,
                'message' => 'No active school year found. Please contact the registrar.'
            ]);
        }

        // Get pending students
        $pendingStudents = Student::with(['user', 'strand', 'section', 'strandPreferences.strand'])
            ->where('enrollment_status', 'pending')
            ->get()
            ->map(function ($student) {
                // Debug log to see what we're getting
                \Log::info('Student data:', [
                    'id' => $student->id,
                    'address' => $student->address,
                    'strand_preferences_count' => $student->strandPreferences->count(),
                    'strand_preferences' => $student->strandPreferences->pluck('strand.code')->toArray()
                ]);
                
                // Ensure address is included
                $student->address = $student->address ?: 'No address provided';
                return $student;
            });

        // Get approved students  
        $approvedStudents = Student::with(['user', 'strand', 'section', 'strandPreferences.strand'])
            ->where('enrollment_status', 'approved')
            ->get()
            ->map(function ($student) {
                // Ensure address is included
                $student->address = $student->address ?: 'No address provided';
                return $student;
            });

        // Get rejected students
        $rejectedStudents = Student::with(['user', 'strand', 'section', 'strandPreferences.strand'])
            ->where('enrollment_status', 'rejected')
            ->get()
            ->map(function ($student) {
                // Ensure address is included
                $student->address = $student->address ?: 'No address provided';
                return $student;
            });

        return Inertia::render('Faculty/Faculty_Enrollment', [
            'pendingStudents' => $pendingStudents,
            'approvedStudents' => $approvedStudents,
            'rejectedStudents' => $rejectedStudents,
            'activeSchoolYear' => $activeSchoolYear
        ]);
    }

    /**
     * Show enrolled students page
     */
    public function studentsPage()
    {
        // Get the active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            return Inertia::render('Faculty/Faculty_Students', [
                'enrolledStudents' => collect([]),
                'auth' => [
                    'user' => auth()->user()
                ]
            ]);
        }

        // Get enrolled students for the active school year only
        $enrolledStudents = Student::with(['user', 'strand', 'section', 'schoolYear'])
            ->where('enrollment_status', 'enrolled')
            ->where('school_year_id', $activeSchoolYear->id)
            ->get();

        return Inertia::render('Faculty/Faculty_Students', [
            'enrolledStudents' => $enrolledStudents->map(function($student) {
                return [
                    'id' => $student->id,
                    'user' => $student->user,
                    'strand' => $student->strand,
                    'section' => $student->section,
                    'schoolYear' => $student->schoolYear,
                    'grade_level' => $student->grade_level,
                    'enrollment_status' => $student->enrollment_status,
                    'status' => $student->enrollment_status, // Add status field for modal
                    'personalInfo' => [
                        'grade_level' => $student->grade_level
                    ]
                ];
            }),
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    }

    /**
     * Get student enrollment details for modal view
     */
    public function getStudentDetails($id)
    {
        try {
            $student = Student::with(['user', 'strand', 'section', 'schoolYear'])
                ->findOrFail($id);

            // Process strand preferences from JSON field
            $strandIds = json_decode($student->getAttributes()['strand_preferences'] ?? '[]', true);
            \Log::info('Raw strand_preferences: ' . ($student->getAttributes()['strand_preferences'] ?? 'null'));
            \Log::info('Decoded strand IDs: ' . json_encode($strandIds));
            
            if (!empty($strandIds) && is_array($strandIds)) {
                $strands = Strand::whereIn('id', $strandIds)->get();
                \Log::info('Found strands: ' . $strands->pluck('code')->toJson());
                $student->strand_preferences = $strands->pluck('code')->toArray();
                
                // If no codes found, fall back to names
                if (empty($student->strand_preferences)) {
                    $student->strand_preferences = $strands->pluck('name')->toArray();
                }
            } else {
                // Try alternative approaches if JSON decode fails
                $rawPrefs = $student->getAttributes()['strand_preferences'];
                if ($rawPrefs && is_string($rawPrefs)) {
                    // Try parsing as comma-separated values
                    $possibleIds = explode(',', str_replace([' ', '[', ']', '"'], '', $rawPrefs));
                    $possibleIds = array_filter(array_map('intval', $possibleIds));
                    
                    if (!empty($possibleIds)) {
                        $strands = Strand::whereIn('id', $possibleIds)->get();
                        $student->strand_preferences = $strands->pluck('code')->toArray();
                    } else {
                        $student->strand_preferences = ['No preferences specified'];
                    }
                } else {
                    $student->strand_preferences = ['No preferences specified'];
                }
            }
            
            // Clean up document paths - remove any duplicate enrollment_documents prefix
            if ($student->psa_birth_certificate) {
                $student->psa_birth_certificate = str_replace('enrollment_documents/', '', $student->psa_birth_certificate);
            }
            if ($student->report_card) {
                $student->report_card = str_replace('enrollment_documents/', '', $student->report_card);
            }
            if ($student->image) {
                $student->image = str_replace('enrollment_documents/', '', $student->image);
            }
            
            // Ensure address is included (it's already in the student model)
            $student->address = $student->address ?: 'No address provided';

            return response()->json($student);
        } catch (\Exception $e) {
            \Log::error('Error fetching student details: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to fetch student details'], 500);
        }
    }

    /**
     * Display coordinator profile page
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        
        // Find the coordinator record for the authenticated user
        $coordinator = Coordinator::where('user_id', $user->id)->first();
        
        return Inertia::render('Faculty/Faculty_Profile', [
            'coordinator' => $coordinator
        ]);
    }

    /**
     * Approve student enrollment and assign strand/section
     */
    public function approveEnrollment(Request $request, $id)
    {
        $validated = $request->validate([
            'assigned_strand' => 'required|in:STEM,HUMSS,ABM,GAS,TVL',
            'section_id' => 'required|exists:sections,id',
            'coordinator_notes' => 'nullable|string'
        ]);

        $student = Student::findOrFail($id);
        $strand = Strand::where('code', $validated['assigned_strand'])->first();
        
        if (!$strand) {
            return response()->json(['error' => 'Invalid strand selected'], 400);
        }
        
        $student->update([
            'enrollment_status' => 'approved',
            'strand_id' => $strand->id,
            'section_id' => $validated['section_id'],
            'coordinator_notes' => $validated['coordinator_notes'],
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id()
        ]);

        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if ($activeSchoolYear) {
            // Get all subjects for the assigned strand
            $strandSubjects = Subject::where('strand_id', $strand->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->get();

            // Create class records for each subject
            foreach ($strandSubjects as $subject) {
                $classRecord = \DB::table('class')->insertGetId([
                    'section_id' => $validated['section_id'],
                    'subject_id' => $subject->id,
                    'faculty_id' => $subject->faculty_id,
                    'day_of_week' => $subject->day_of_week ?: 'Monday',
                    'start_time' => $subject->start_time ?: '08:00:00',
                    'end_time' => $subject->end_time ?: '09:30:00',
                    'room' => $subject->room ?: 'TBA',
                    'semester' => $activeSchoolYear->semester ?? '1st Semester',
                    'school_year' => ($activeSchoolYear->year_start ?? '2024') . '-' . ($activeSchoolYear->year_end ?? '2025'),
                    'is_active' => true,
                    'student_id' => $student->id,
                    'subject_code' => $subject->code ?? 'N/A',
                    'subject_name' => $subject->name ?? 'Unknown Subject',
                    'strand_name' => $strand->name ?? 'Not Assigned',
                    'registration_number' => 'REG' . str_pad($student->id, 6, '0', STR_PAD_LEFT),
                    'date_enrolled' => now()->toDateString(),
                    'instructor_name' => $subject->faculty && $subject->faculty->user 
                        ? $subject->faculty->user->firstname . ' ' . $subject->faculty->user->lastname 
                        : 'TBA',
                    'student_name' => $student->user->firstname . ' ' . $student->user->lastname,
                    'student_lrn' => $student->lrn ?? 'N/A',
                    'grade_level' => $student->grade_level ?? 'Grade 11',
                    'enrollment_status' => 'approved',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Add student to class_details table
                \DB::table('class_details')->updateOrInsert(
                    [
                        'class_id' => $classRecord,
                        'student_id' => $student->id
                    ],
                    [
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                );
            }
        }

        // Store notification in database
        \DB::table('notifications')->insert([
            'student_id' => $student->id,
            'type' => 'enrollment',
            'status' => 'approved',
            'title' => 'Pre-Enrollment Approved!',
            'message' => "Congratulations! Your pre-enrollment has been approved. Assigned Strand: {$strand->name}. " . 
                        ($validated['coordinator_notes'] ? "Coordinator Notes: {$validated['coordinator_notes']}" : ''),
            'priority' => 'high',
            'action_required' => true,
            'details' => json_encode([
                'assignedStrand' => $strand->name,
                'coordinatorNotes' => $validated['coordinator_notes'],
                'reviewedAt' => now()->toISOString()
            ]),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Send approval notification email
        $this->sendEnrollmentNotification($student, 'approved');

        return response()->json([
            'message' => 'Student enrollment approved successfully!',
            'student' => $student->load(['strand', 'section', 'user'])
        ]);
    }

    /**
     * Reject student enrollment
     */
    public function rejectEnrollment(Request $request, $id)
    {
        $validated = $request->validate([
            'coordinator_notes' => 'required|string'
        ]);

        $student = Student::findOrFail($id);
        
        $student->update([
            'enrollment_status' => 'rejected',
            'coordinator_notes' => $validated['coordinator_notes'],
        ]);

        // Send rejection notification email to student
        $this->sendEnrollmentNotification($student, 'rejected');

        return redirect()->back()->with('success', 'Student enrollment rejected and notification sent.');
    }

    /**
     * Get subjects for enrollment confirmation
     */
    public function getSubjectsForEnrollment(Request $request)
    {
        $strandParam = $request->query('strand');
        $schoolYearId = $request->query('school_year_id', 1);

        // Try to find strand by ID first (if numeric), then by code
        if (is_numeric($strandParam)) {
            $strand = Strand::find($strandParam);
        } else {
            $strand = Strand::where('code', $strandParam)->first();
        }
        
        if (!$strand) {
            // Return debug info if strand not found
            return response()->json([
                'error' => 'Strand not found',
                'strand_param' => $strandParam,
                'available_strands' => Strand::pluck('code', 'id')->toArray()
            ]);
        }

        // Get current active school year if not provided
        if (!$schoolYearId) {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json([
                    'error' => 'No active school year found',
                    'subjects' => [],
                    'message' => 'REGISTRAR DID NOT ACTIVATE THE SCHOOL YEAR YET. Please contact the registrar to activate a school year first.'
                ]);
            }
            $schoolYearId = $activeSchoolYear->id;
        }

        // Get subjects with faculty information for the strand and active semester only
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        $subjects = Subject::with(['faculty'])
            ->where('strand_id', $strand->id)
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('semester', $activeSchoolYear->semester)
            ->get();

        // Debug: Check what's in the database
        $allSubjectsForStrand = Subject::where('strand_id', $strand->id)->get();
        $subjectsWithSchoolYear = Subject::where('strand_id', $strand->id)->where('school_year_id', $schoolYearId)->get();

        $formattedSubjects = $subjects->map(function ($subject) {
            return [
                'id' => $subject->id,
                'code' => $subject->code,
                'name' => $subject->name,
                'semester' => $subject->semester,
                'day_of_week' => $subject->day_of_week,
                'start_time' => $subject->start_time,
                'end_time' => $subject->end_time,
                'room' => $subject->room,
                'faculty_name' => $subject->faculty && $subject->faculty->user 
                    ? $subject->faculty->user->firstname . ' ' . $subject->faculty->user->lastname
                    : 'TBA'
            ];
        });

        // Return debug info along with subjects
        return response()->json([
            'subjects' => $formattedSubjects,
            'debug' => [
                'strand_param' => $strandParam,
                'strand_id' => $strand->id,
                'strand_code' => $strand->code,
                'strand_name' => $strand->name,
                'school_year_id' => $schoolYearId,
                'subjects_count' => $subjects->count(),
                'pivot_subjects_count' => $strand->subjects()->where('subjects.school_year_id', $schoolYearId)->count(),
                'direct_subjects_count' => Subject::where('strand_id', $strand->id)->where('school_year_id', $schoolYearId)->count(),
                'all_subjects_for_strand' => Subject::where('strand_id', $strand->id)->pluck('name', 'code')->toArray(),
                'all_subjects_count' => $allSubjectsForStrand->count(),
                'subjects_with_school_year_count' => $subjectsWithSchoolYear->count(),
                'active_school_year_id' => $schoolYearId
            ]
        ]);
    }

    /**
     * Finalize enrollment with subject selection
     */
    public function finalizeEnrollment(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'subjects' => 'required|array',
                'subjects.*' => 'exists:subjects,id'
            ]);

            $student = Student::findOrFail($id);

            // Get the active school year with semester - don't create if none exists
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$currentSchoolYear) {
                return redirect()->back()->with('error', 'REGISTRAR DID NOT ACTIVATE THE SCHOOL YEAR YET. Please contact the registrar to activate a school year first.');
            }

            // Check if enrollment already exists for this student and school year
            $existingEnrollment = Enrollment::where('student_id', $student->id)
                ->where('school_year_id', $student->school_year_id)
                ->first();

            if ($existingEnrollment) {
                // Update existing enrollment
                $existingEnrollment->update([
                    'strand_id' => $student->strand_id,
                    'status' => 'approved',
                    'coordinator_id' => auth()->user()->faculty->id
                ]);
                $enrollment = $existingEnrollment;
            } else {
                // Create enrollment record - simple structure with just IDs
                $enrollment = Enrollment::create([
                    'student_id' => $student->id,
                    'strand_id' => $student->strand_id,
                    'school_year_id' => $currentSchoolYear->id,
                    'status' => 'approved',
                    'coordinator_id' => auth()->user()->faculty->id
                ]);
            }

            // Clear existing subject assignments and add new ones
            if (method_exists($enrollment, 'subjects')) {
                $enrollment->subjects()->detach(); // Remove existing subjects
                foreach ($validated['subjects'] as $subjectId) {
                    $enrollment->subjects()->attach($subjectId);
                }
            }

            // Store COR data in class table for each selected subject
            foreach ($validated['subjects'] as $subjectId) {
                $subject = Subject::find($subjectId);
                
                if ($subject) {
                    \Log::info('Processing subject for enrollment', [
                        'subject_id' => $subjectId,
                        'student_id' => $student->id,
                        'enrollment_id' => $enrollment->id
                    ]);

                    // Create class record with COR data
                    $classRecord = \DB::table('class')->insertGetId([
                        'section_id' => $student->section_id,
                        'subject_id' => $subjectId,
                        'faculty_id' => $subject->faculty_id,
                        'day_of_week' => $subject->day_of_week ?: 'Monday',
                        'start_time' => $subject->start_time ?: '08:00:00',
                        'end_time' => $subject->end_time ?: '09:30:00',
                        'room' => $subject->room ?: 'TBA',
                        'semester' => $currentSchoolYear->semester ?? '1st Semester',
                        'school_year' => ($currentSchoolYear->year_start ?? '2024') . '-' . ($currentSchoolYear->year_end ?? '2025'),
                        'is_active' => true,
                        // COR specific data
                        'student_id' => $student->id,
                        'enrollment_id' => $enrollment->id,
                        'subject_code' => $subject->code ?? 'N/A',
                        'subject_name' => $subject->name ?? 'Unknown Subject',
                        'strand_name' => $student->strand->name ?? 'Not Assigned',
                        'registration_number' => 'REG' . str_pad($enrollment->id, 6, '0', STR_PAD_LEFT),
                        'date_enrolled' => now()->toDateString(),
                        'instructor_name' => $subject->faculty && $subject->faculty->user 
                            ? $subject->faculty->user->firstname . ' ' . $subject->faculty->user->lastname 
                            : 'TBA',
                        'student_name' => $student->user->firstname . ' ' . $student->user->lastname,
                        'student_lrn' => $student->lrn ?? 'N/A',
                        'grade_level' => $student->grade_level ?? 'Grade 11',
                        'enrollment_status' => 'approved',
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    \Log::info('Class record created', ['class_id' => $classRecord]);

                    // Add student to class_details table (list of officially enrolled students)
                    \DB::table('class_details')->updateOrInsert(
                        [
                            'class_id' => $classRecord,
                            'student_id' => $student->id
                        ],
                        [
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );

                    \Log::info('Class details record created/updated');
                }
            }

            // Update student enrollment status
            $student->update(['enrollment_status' => 'enrolled']);

            // Send notification email to student
            $this->sendEnrollmentNotification($student, 'approved', $enrollment);

            return redirect()->back()->with('success', 'Student enrolled successfully!');
            
        } catch (\Exception $e) {
            \Log::error('Enrollment finalization error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return redirect()->back()->with('error', 'Failed to finalize enrollment: ' . $e->getMessage());
        }
    }

    /**
     * Get sections and strands data for enrollment management
     */
    public function getSectionsAndStrands()
    {
        try {
            $strands = Strand::select('id', 'name', 'code')->get();
            $sections = Section::with('strand:id,code')->select('id', 'section_name as name', 'strand_id')->get()->map(function ($section) {
                return [
                    'id' => $section->id,
                    'name' => $section->name,
                    'strand_code' => $section->strand->code ?? null
                ];
            });

            return response()->json([
                'strands' => $strands,
                'sections' => $sections
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching sections and strands: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch data'], 500);
        }
    }

    /**
     * Get subjects for a specific strand
     */
    public function getSubjectsByStrand($strandCode)
    {
        try {
            $strand = Strand::where('code', $strandCode)->first();
            if (!$strand) {
                return response()->json(['error' => 'Strand not found'], 404);
            }

            $subjects = Subject::where('strand_id', $strand->id)
                ->select('id', 'name', 'code', 'strand_id')
                ->get()
                ->map(function ($subject) use ($strandCode) {
                    return [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                        'strand_code' => $strandCode
                    ];
                });

            return response()->json([
                'subjects' => $subjects
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching subjects for strand: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch subjects'], 500);
        }
    }

    /**
     * Finalize enrollment with strand and section assignment (for COR)
     */
    public function finalizeEnrollmentWithAssignment(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'strand' => 'required|string',
                'section_id' => 'required|integer|exists:sections,id',
                'subjects' => 'required|array',
                'subjects.*' => 'integer|exists:subjects,id'
            ]);

            $student = Student::findOrFail($id);
            
            // Find the strand by code
            $strand = Strand::where('code', $validated['strand'])->first();
            if (!$strand) {
                return back()->withErrors(['strand' => 'Invalid strand selected']);
            }

            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return back()->withErrors(['error' => 'No active school year found']);
            }

            // Update student with strand and section assignment
            $student->update([
                'enrollment_status' => 'enrolled',
                'strand_id' => $strand->id,
                'section_id' => $validated['section_id'],
                'school_year_id' => $activeSchoolYear->id,
                'enrolled_at' => now(),
                'enrolled_by' => auth()->id()
            ]);

            // Create enrollment records for selected subjects
            foreach ($validated['subjects'] as $subjectId) {
                Enrollment::create([
                    'student_id' => $student->id,
                    'subject_id' => $subjectId,
                    'school_year_id' => $activeSchoolYear->id,
                    'semester' => $activeSchoolYear->current_semester ?? '1st Semester',
                    'enrollment_date' => now(),
                    'status' => 'enrolled'
                ]);
            }

            return redirect()->back()->with('success', 'Student enrollment finalized successfully!');
            
        } catch (\Exception $e) {
            \Log::error('Error finalizing enrollment: ' . $e->getMessage());
            \Log::error('Request data: ' . json_encode($request->all()));
            \Log::error('Student ID: ' . $id);
            
            return back()->withErrors(['error' => 'Failed to finalize enrollment: ' . $e->getMessage()]);
        }
    }

    /**
     * Get subjects for a specific strand and active semester
     */
    public function getSubjectsForStrand($strandCode)
    {
        try {
            // Get active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found',
                    'subjects' => []
                ]);
            }

            // Get active semester
            $activeSemester = $activeSchoolYear->current_semester;

            // Find strand by code
            $strand = Strand::where('code', $strandCode)->first();
            if (!$strand) {
                return response()->json([
                    'success' => false,
                    'message' => 'Strand not found',
                    'subjects' => []
                ]);
            }

            // Get subjects for the strand and active semester
            $subjects = Subject::where('strand_id', $strand->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->with(['faculty'])
                ->get();

            return response()->json([
                'success' => true,
                'subjects' => $subjects->map(function($subject) {
                    return [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                        'semester' => $subject->semester,
                        'faculty' => $subject->faculty ? 
                            $subject->faculty->firstname . ' ' . $subject->faculty->lastname : 
                            'No Faculty Assigned'
                    ];
                })
            ]);

        } catch (\Exception $e) {
            \Log::error('Error fetching subjects for strand: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subjects',
                'subjects' => []
            ], 500);
        }
    }

    /**
     * Send enrollment notification email to student
     */
    private function sendEnrollmentNotification($student, $status, $enrollment = null)
    {
        try {
            $user = $student->user;
            if (!$user || !$user->email) {
                \Log::warning('Cannot send notification - student has no email: ' . $student->id);
                return;
            }

            $data = [
                'student_name' => $student->firstname . ' ' . $student->lastname,
                'status' => $status,
                'strand' => $student->strand ? $student->strand->name : 'N/A',
                'school_year' => $student->schoolYear ? $student->schoolYear->year : '2024-2025',
                'subjects' => $enrollment && $enrollment->subjects ? $enrollment->subjects->pluck('name')->toArray() : []
            ];

            \Mail::send('emails.enrollment_notification', $data, function ($message) use ($user, $status) {
                $message->to($user->email)
                    ->subject('Enrollment ' . ucfirst($status) . ' - ONSTS');
            });

            \Log::info('Enrollment notification sent to: ' . $user->email);
        } catch (\Exception $e) {
            \Log::error('Failed to send enrollment notification: ' . $e->getMessage());
        }
    }
}
