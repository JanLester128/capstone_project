<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use App\Models\Enrollment;
use App\Models\SchoolYear;
use App\Models\Strand;
use App\Models\Section;
use App\Models\CertificateOfRegistration;
use App\Models\SemesterProgression;
use App\Models\SummerClass;

class CoordinatorController extends Controller
{
    /**
     * Display enrollment page for coordinators
     */
    public function enrollmentPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login');
        }

        // Get current school year
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Faculty/Faculty_Enrollment', [
                'user' => $user,
                'enrollments' => [],
                'strands' => [],
                'sections' => [],
                'error' => 'No active school year found.'
            ]);
        }

        // Get enrollments for the current school year
        $enrollments = Enrollment::where('school_year_id', $currentSchoolYear->id)
            ->whereIn('status', ['pending_approval', 'approved_by_registrar', 'returned', 'enrolled', 'rejected', 'pending']) // Include registrar approved transferees
            ->with([
                'studentPersonalInfo.user',
                'studentPersonalInfo.strandPreferences.strand',
                'strand',
                'assignedSection'
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($enrollment) {
                $studentInfo = $enrollment->studentPersonalInfo;
                $user = $studentInfo->user ?? null;
                
                return [
                    'id' => $enrollment->id,
                    'student_name' => $user ? ($user->firstname . ' ' . $user->lastname) : 'Unknown Student',
                    'student_id' => $studentInfo->lrn ?? 'No LRN',
                    'email' => $user->email ?? 'No Email',
                    'status' => $enrollment->status,
                    'enrollment_date' => $enrollment->enrollment_date,
                    'intended_grade_level' => $enrollment->intended_grade_level,
                    'strand_id' => $enrollment->strand_id,
                    'strand_name' => $enrollment->strand->name ?? 'No Strand',
                    'assigned_section' => $enrollment->assignedSection->section_name ?? null,
                    'enrollment_type' => $enrollment->enrollment_type,
                    'coordinator_notes' => $enrollment->coordinator_notes,
                    'rejection_reason' => $enrollment->rejection_reason,
                    // Additional transferee information
                    'is_transferee' => $enrollment->enrollment_type === 'transferee',
                    'student_status' => $studentInfo->student_status ?? null,
                    'previous_school' => $studentInfo->previous_school ?? null,
                    'last_grade' => $studentInfo->last_grade ?? null,
                    'last_sy' => $studentInfo->last_sy ?? null,
                ];
            });

        // Get available strands
        $strands = Strand::orderBy('name')->get();

        // Get available sections for the current school year
        $sections = Section::where('school_year_id', $currentSchoolYear->id)
            ->with('strand')
            ->orderBy('year_level')
            ->orderBy('section_name')
            ->get()
            ->map(function ($section) {
                return [
                    'id' => $section->id,
                    'section_name' => $section->section_name,
                    'year_level' => $section->year_level,
                    'strand' => $section->strand ? [
                        'id' => $section->strand->id,
                        'name' => $section->strand->name
                    ] : null
                ];
            });

        return Inertia::render('Faculty/Faculty_Enrollment', [
            'user' => $user,
            'enrollments' => $enrollments,
            'strands' => $strands,
            'sections' => $sections,
            'currentSchoolYear' => $currentSchoolYear
        ]);
    }

    /**
     * Approve student enrollment and assign section/strand
     */
    public function approveEnrollment($id)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        try {
            $enrollment = Enrollment::with([
                'studentPersonalInfo.user', 
                'strand', 
                'assignedSection',
                'firstStrandChoice',
                'secondStrandChoice', 
                'thirdStrandChoice'
            ])->findOrFail($id);

            // Validate request
            $request = request();
            $validator = Validator::make($request->all(), [
                'assigned_section_id' => 'required|exists:sections,id',
                'strand_name' => 'required|string',
                'grade_level' => 'required|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get the section and validate it has the correct strand
            $section = Section::with('strand')->findOrFail($request->assigned_section_id);
            
            // Check section capacity before enrollment
            if (!$section->hasAvailableSlots()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Section at capacity',
                    'message' => "Cannot enroll student. Section '{$section->section_name}' is at full capacity ({$section->max_capacity} students).",
                ], 400);
            }
            
            // Check if transferee needs registrar approval
            if ($enrollment->enrollment_type === 'transferee' && $enrollment->status !== 'approved_by_registrar') {
                $statusMessage = '';
                switch ($enrollment->status) {
                    case 'pending_evaluation':
                        $statusMessage = 'This transferee student needs coordinator evaluation first.';
                        break;
                    case 'evaluated':
                        $statusMessage = 'This transferee evaluation is pending registrar approval. Please wait for registrar to approve before enrolling.';
                        break;
                    default:
                        $statusMessage = 'This transferee student is not ready for enrollment.';
                }
                
                return response()->json([
                    'error' => 'Transferee approval required',
                    'message' => $statusMessage
                ], 422);
            }

            // Note: Coordinators can assign students to any strand, not just their preferences
            // This allows flexibility when:
            // - Student doesn't qualify for their preferred strand (e.g., failed STEM exam)
            // - Preferred strands are at full capacity
            // - Coordinator determines a different strand is more suitable
            
            // Log if assigning to non-preferred strand for tracking purposes
            $allowedStrandIds = array_filter([
                $enrollment->first_strand_choice_id,
                $enrollment->second_strand_choice_id,
                $enrollment->third_strand_choice_id
            ]);
            
            if (!in_array($section->strand_id, $allowedStrandIds)) {
                Log::info('Coordinator assigning student to non-preferred strand', [
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $enrollment->studentPersonalInfo->user_id,
                    'assigned_strand_id' => $section->strand_id,
                    'assigned_strand_name' => $section->strand ? $section->strand->name : 'Unknown',
                    'preferred_strand_ids' => $allowedStrandIds,
                    'coordinator_id' => $user->id,
                    'reason' => 'Coordinator override - student may not qualify for preferred strand or strand is full'
                ]);
            }
            
            DB::beginTransaction();

            // Log the strand assignment change
            $oldStrandId = $enrollment->strand_id;
            $newStrandId = $section->strand_id;
            
            Log::info('Coordinator assigning student to strand', [
                'enrollment_id' => $enrollment->id,
                'student_id' => $enrollment->studentPersonalInfo->user_id,
                'old_strand_id' => $oldStrandId,
                'new_strand_id' => $newStrandId,
                'section_id' => $request->assigned_section_id,
                'section_name' => $section->section_name,
                'strand_preferences' => [
                    'first_choice' => $enrollment->first_strand_choice_id,
                    'second_choice' => $enrollment->second_strand_choice_id,
                    'third_choice' => $enrollment->third_strand_choice_id
                ]
            ]);

            // Update enrollment with section assignment and update strand to match section
            $enrollment->update([
                'assigned_section_id' => $request->assigned_section_id,
                'strand_id' => $section->strand_id, // Update to the strand of the assigned section
                'status' => 'enrolled',
                'coordinator_id' => $user->id
            ]);

            // Refresh enrollment to load relationships
            $enrollment->refresh();
            $enrollment->load(['assignedSection', 'strand', 'schoolYear', 'studentPersonalInfo.user']);

            // Generate COR and create class details using CORService
            $corGenerated = false;
            try {
                Log::info('Attempting to generate COR', [
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $enrollment->studentPersonalInfo->user_id,
                    'section_id' => $enrollment->assigned_section_id
                ]);
                
                $corService = new \App\Services\CORService();
                $cor = $corService->generateCOR($enrollment, $user->id);
                
                Log::info('✅ COR generated successfully for enrolled student', [
                    'enrollment_id' => $enrollment->id,
                    'cor_id' => $cor->id,
                    'cor_number' => $cor->cor_number
                ]);
                
                $corGenerated = true;
            } catch (\Exception $e) {
                Log::error('❌ CRITICAL: Failed to generate COR for enrolled student', [
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $enrollment->studentPersonalInfo->user_id ?? 'unknown',
                    'section_id' => $enrollment->assigned_section_id ?? 'unknown',
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
                // Continue without failing the enrollment, but log prominently
            }
            
            if (!$corGenerated) {
                Log::warning('⚠️ Student enrolled but COR was not generated - manual COR generation may be required', [
                    'enrollment_id' => $enrollment->id
                ]);
            }

            // Update section capacity status after enrollment
            $section->updateCapacityStatus();

            DB::commit();

            // Log the approval
            Log::info('Student enrollment approved and enrolled', [
                'enrollment_id' => $enrollment->id,
                'student_id' => $enrollment->studentPersonalInfo->user_id,
                'student_name' => $enrollment->studentPersonalInfo->user->firstname . ' ' . $enrollment->studentPersonalInfo->user->lastname,
                'assigned_section_id' => $request->assigned_section_id,
                'section_name' => $section->section_name,
                'strand_name' => $section->strand->name ?? 'Unknown',
                'grade_level' => $section->year_level,
                'coordinator_id' => $user->id,
                'coordinator_name' => $user->firstname . ' ' . $user->lastname
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Student successfully enrolled',
                'enrollment' => [
                    'id' => $enrollment->id,
                    'status' => $enrollment->status,
                    'assigned_section' => $section->section_name,
                    'strand_name' => $section->strand->name ?? 'Unknown',
                    'grade_level' => $section->year_level
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Enrollment approval failed', [
                'enrollment_id' => $id,
                'error' => $e->getMessage(),
                'coordinator_id' => $user->id ?? null
            ]);

            return response()->json([
                'error' => 'Failed to approve enrollment',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject student enrollment
     */
    public function rejectEnrollment($id)
    {
        return response()->json(['message' => 'Enrollment rejection not implemented yet']);
    }

    /**
     * Finalize enrollment with assignment
     */
    public function finalizeEnrollmentWithAssignment($id)
    {
        return response()->json(['message' => 'Enrollment finalization not implemented yet']);
    }

    /**
     * Get enrollment statistics
     */
    public function getEnrollmentStats()
    {
        return response()->json(['message' => 'Enrollment statistics not implemented yet']);
    }

    /**
     * Get pending enrollments
     */
    public function getPendingEnrollments()
    {
        return response()->json(['message' => 'Pending enrollments not implemented yet']);
    }

    /**
     * Get approved enrollments
     */
    public function getApprovedEnrollments()
    {
        return response()->json(['message' => 'Approved enrollments not implemented yet']);
    }

    /**
     * Get rejected enrollments
     */
    public function getRejectedEnrollments()
    {
        return response()->json(['message' => 'Rejected enrollments not implemented yet']);
    }

    /**
     * Bulk approve enrollments
     */
    public function bulkApproveEnrollments(Request $request)
    {
        return response()->json(['message' => 'Bulk enrollment approval not implemented yet']);
    }

    /**
     * Bulk reject enrollments
     */
    public function bulkRejectEnrollments(Request $request)
    {
        return response()->json(['message' => 'Bulk enrollment rejection not implemented yet']);
    }

    /**
     * Get enrollment summary
     */
    public function getEnrollmentSummary()
    {
        return response()->json(['message' => 'Enrollment summary not implemented yet']);
    }

    /**
     * Manually regenerate COR for an enrolled student
     */
    public function regenerateCOR($enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator', 'registrar'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $enrollment = Enrollment::with(['assignedSection', 'strand', 'schoolYear', 'studentPersonalInfo.user'])
                ->findOrFail($enrollmentId);

            if ($enrollment->status !== 'enrolled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Student must be enrolled before generating COR'
                ], 422);
            }

            // Delete existing COR and class_details if any
            CertificateOfRegistration::where('enrollment_id', $enrollmentId)->delete();
            DB::table('class_details')->where('enrollment_id', $enrollmentId)->delete();

            // Generate new COR
            $corService = new \App\Services\CORService();
            $cor = $corService->generateCOR($enrollment, $user->id);

            Log::info('COR manually regenerated', [
                'enrollment_id' => $enrollmentId,
                'cor_id' => $cor->id,
                'regenerated_by' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'COR generated successfully',
                'cor' => $cor
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to regenerate COR', [
                'enrollment_id' => $enrollmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate COR: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get COR preview for an enrollment
     */
    public function getCORPreview($enrollmentId)
    {
        $user = Auth::user();
        
        Log::info('COR Preview Request', [
            'enrollment_id' => $enrollmentId,
            'user_id' => $user ? $user->id : null,
            'user_role' => $user ? $user->role : null
        ]);
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            // Get enrollment with all related data including coordinator
            $enrollment = Enrollment::with([
                'studentPersonalInfo.user',
                'strand',
                'assignedSection.strand',
                'schoolYear',
                'coordinator'
            ])->find($enrollmentId);

            if (!$enrollment) {
                Log::error('Enrollment not found', ['enrollment_id' => $enrollmentId]);
                return response()->json(['error' => 'Enrollment not found'], 404);
            }

            $student = $enrollment->studentPersonalInfo->user;
            
            Log::info('Found enrollment', [
                'enrollment_id' => $enrollment->id,
                'student_id' => $student->id,
                'student_name' => $student->firstname . ' ' . $student->lastname,
                'assigned_section_id' => $enrollment->assigned_section_id
            ]);

            // Get or create COR data from certificates_of_registration table
            $cor = CertificateOfRegistration::where('enrollment_id', $enrollmentId)
                ->orWhere(function($query) use ($student, $enrollment) {
                    $query->where('student_id', $student->id)
                          ->where('school_year_id', $enrollment->school_year_id);
                })
                ->with(['section', 'strand', 'schoolYear'])
                ->first();

            // If no COR exists, create basic COR data for preview
            if (!$cor) {
                Log::info('No existing COR found, creating basic COR data for preview');
                $cor = (object) [
                    'id' => null,
                    'enrollment_id' => $enrollmentId,
                    'student_id' => $student->id,
                    'school_year_id' => $enrollment->school_year_id,
                    'section_id' => $enrollment->assigned_section_id,
                    'strand_id' => $enrollment->strand_id,
                    'semester' => $enrollment->schoolYear->semester ?? 1,
                    'year_level' => $enrollment->intended_grade_level,
                    'registration_date' => $enrollment->enrollment_date ? $enrollment->enrollment_date->format('Y-m-d') : now()->format('Y-m-d'),
                    'status' => 'preview',
                    'generated_at' => now(),
                    'cor_number' => 'PREVIEW-' . str_pad($enrollmentId, 6, '0', STR_PAD_LEFT),
                    'enrolled_by_name' => $enrollment->coordinator ? ($enrollment->coordinator->firstname . ' ' . $enrollment->coordinator->lastname) : 'System Administrator'
                ];
            } else {
                // Add enrolled_by_name to existing COR if not present
                if (!isset($cor->enrolled_by_name)) {
                    $cor->enrolled_by_name = $enrollment->coordinator ? ($enrollment->coordinator->firstname . ' ' . $enrollment->coordinator->lastname) : 'System Administrator';
                }
            }

            // Get student's class schedule
            $schedule = $this->getStudentScheduleFromEnrollment($enrollmentId, $enrollment->school_year_id);

            // Get assigned section name
            $assignedSectionName = null;
            if ($enrollment->assignedSection) {
                $assignedSectionName = $enrollment->assignedSection->section_name;
            }

            // Prepare student data
            $studentData = [
                'firstname' => $student->firstname,
                'lastname' => $student->lastname,
                'email' => $student->email,
                'student_id' => $student->id,
                'student_type' => $enrollment->enrollment_type ?? 'regular', // Use enrollment_type instead of student_type
                'grade_level' => $enrollment->studentPersonalInfo->grade_level ?? 'Grade 11',
                'strand_name' => $enrollment->strand ? $enrollment->strand->name : 'Not assigned',
                'section_name' => $assignedSectionName ?? 'Not assigned'
            ];

            Log::info('COR Preview Data Prepared', [
                'student_data' => $studentData,
                'cor_exists' => $cor ? true : false,
                'schedule_count' => is_array($schedule) ? count($schedule) : 0
            ]);

            return response()->json([
                'success' => true,
                'cor' => $cor,
                'schedule' => $schedule,
                'student' => $studentData,
                'schoolYear' => $enrollment->schoolYear,
                'enrollment' => $enrollment
            ]);

        } catch (\Exception $e) {
            Log::error('COR Preview Error', [
                'enrollment_id' => $enrollmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to load COR data',
                'message' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Get students eligible for semester progression
     */
    public function getEligibleForProgression()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$currentSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            // Determine the logic based on current school year semester
            $semesterProgressionEligible = collect();
            
            if ($currentSchoolYear->semester === '2nd Semester') {
                // If current is 2nd semester, look for students who completed 1st semester
                // in the same academic year (previous school year record)
                $firstSemesterSchoolYear = SchoolYear::where('semester', '1st Semester')
                    ->where('year_start', $currentSchoolYear->year_start)
                    ->where('year_end', $currentSchoolYear->year_end)
                    ->first();
                
                if ($firstSemesterSchoolYear) {
                    $semesterProgressionEligible = Enrollment::with([
                        'studentPersonalInfo.user',
                        'strand',
                        'assignedSection'
                    ])
                    ->where('school_year_id', $firstSemesterSchoolYear->id)
                    ->where('status', 'enrolled')
                    ->where('semester', 1)
                    ->where('enrollment_category', 'initial')
                    ->whereDoesntHave('nextEnrollment')
                    ->get();
                }
            } else {
                // If current is 1st semester, students need to complete it first
                // So no one is eligible for 2nd semester progression yet
                $semesterProgressionEligible = collect();
            }
            
            $semesterProgressionEligible = $semesterProgressionEligible->map(function ($enrollment) {
                $student = $enrollment->studentPersonalInfo->user;
                return [
                    'id' => $enrollment->id,
                    'student_name' => $student->firstname . ' ' . $student->lastname,
                    'student_id' => $student->id,
                    'current_grade' => $enrollment->intended_grade_level,
                    'current_semester' => $enrollment->semester,
                    'strand' => $enrollment->strand->name ?? 'N/A',
                    'section' => $enrollment->assignedSection->section_name ?? 'N/A',
                    'progression_type' => 'semester',
                    'next_semester' => 2,
                    'next_grade' => $enrollment->intended_grade_level
                ];
            });

            // Get students who completed 2nd semester and can progress to next grade
            $gradeProgressionEligible = collect();
            
            if ($currentSchoolYear->semester === '1st Semester') {
                // If current is 1st semester of new academic year, 
                // look for students who completed 2nd semester of previous academic year
                $previousSecondSemester = SchoolYear::where('semester', '2nd Semester')
                    ->where('year_start', $currentSchoolYear->year_start - 1)
                    ->where('year_end', $currentSchoolYear->year_end - 1)
                    ->first();
                
                if ($previousSecondSemester) {
                    $gradeProgressionEligible = Enrollment::with([
                        'studentPersonalInfo.user',
                        'strand',
                        'assignedSection'
                    ])
                    ->where('school_year_id', $previousSecondSemester->id)
                    ->where('status', 'enrolled')
                    ->where('semester', 2)
                    ->where('intended_grade_level', '<', 12) // Only Grade 11 can progress to Grade 12
                    ->whereDoesntHave('nextEnrollment')
                    ->get();
                }
            } else {
                // If current is 2nd semester, look in current school year
                $gradeProgressionEligible = Enrollment::with([
                    'studentPersonalInfo.user',
                    'strand',
                    'assignedSection'
                ])
                ->where('school_year_id', $currentSchoolYear->id)
                ->where('status', 'enrolled')
                ->where('semester', 2)
                ->where('intended_grade_level', '<', 12)
                ->whereDoesntHave('nextEnrollment')
                ->get();
            }
            
            $gradeProgressionEligible = $gradeProgressionEligible->map(function ($enrollment) {
                $student = $enrollment->studentPersonalInfo->user;
                return [
                    'id' => $enrollment->id,
                    'student_name' => $student->firstname . ' ' . $student->lastname,
                    'student_id' => $student->id,
                    'current_grade' => $enrollment->intended_grade_level,
                    'current_semester' => $enrollment->semester,
                    'strand' => $enrollment->strand->name ?? 'N/A',
                    'section' => $enrollment->assignedSection->section_name ?? 'N/A',
                    'progression_type' => 'grade',
                    'next_semester' => 1,
                    'next_grade' => $enrollment->intended_grade_level + 1
                ];
            });

            return response()->json([
                'success' => true,
                'semester_progression' => $semesterProgressionEligible,
                'grade_progression' => $gradeProgressionEligible,
                'current_school_year' => $currentSchoolYear
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting eligible students for progression', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to get eligible students',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enroll student for semester progression
     */
    public function enrollSemesterProgression(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'enrollment_id' => 'required|exists:enrollments,id',
            'assigned_section_id' => 'required|exists:sections,id',
            'progression_type' => 'required|in:semester,grade',
            'coordinator_notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $currentEnrollment = Enrollment::with(['studentPersonalInfo.user', 'strand', 'schoolYear'])
                ->findOrFail($request->enrollment_id);

            $student = $currentEnrollment->studentPersonalInfo->user;
            $progressionType = $request->progression_type;

            // Determine next semester and grade
            if ($progressionType === 'semester') {
                $nextSemester = 2;
                $nextGrade = $currentEnrollment->intended_grade_level;
                $enrollmentCategory = 'semester_progression';
            } else { // grade progression
                $nextSemester = 1;
                $nextGrade = $currentEnrollment->intended_grade_level + 1;
                $enrollmentCategory = 'grade_progression';
            }

            // Create new enrollment for next semester/grade
            $newEnrollment = Enrollment::create([
                'student_id' => $student->id,
                'student_personal_info_id' => $currentEnrollment->student_personal_info_id,
                'strand_id' => $currentEnrollment->strand_id,
                'assigned_section_id' => $request->assigned_section_id,
                'school_year_id' => $currentEnrollment->school_year_id,
                'intended_grade_level' => $nextGrade,
                'semester' => $nextSemester,
                'status' => 'enrolled',
                'enrollment_type' => 'regular',
                'enrollment_category' => $enrollmentCategory,
                'enrollment_method' => 'coordinator',
                'previous_enrollment_id' => $currentEnrollment->id,
                'coordinator_id' => $user->id,
                'enrollment_date' => now(),
            ]);

            // Create semester progression record
            $progression = SemesterProgression::create([
                'student_id' => $student->id,
                'from_enrollment_id' => $currentEnrollment->id,
                'to_enrollment_id' => $newEnrollment->id,
                'school_year_id' => $currentEnrollment->school_year_id,
                'from_semester' => $currentEnrollment->semester,
                'to_semester' => $nextSemester,
                'from_grade_level' => $currentEnrollment->intended_grade_level,
                'to_grade_level' => $nextGrade,
                'progression_type' => $progressionType === 'semester' ? 'semester_advance' : 'grade_advance',
                'status' => 'approved',
                'coordinator_notes' => $request->coordinator_notes,
                'processed_by' => $user->id,
                'processed_at' => now(),
            ]);

            DB::commit();

            Log::info('Student enrolled for progression', [
                'student_id' => $student->id,
                'from_enrollment' => $currentEnrollment->id,
                'to_enrollment' => $newEnrollment->id,
                'progression_type' => $progressionType,
                'coordinator' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Student successfully enrolled for ' . $progressionType . ' progression',
                'enrollment' => $newEnrollment,
                'progression' => $progression
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error enrolling student for progression', [
                'enrollment_id' => $request->enrollment_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to enroll student for progression',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get students who need summer classes
     */
    public function getStudentsForSummerClass()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$currentSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            // Get students with failed subjects who need summer classes
            $studentsForSummer = Enrollment::with([
                'studentPersonalInfo.user',
                'strand',
                'assignedSection'
            ])
            ->where('school_year_id', $currentSchoolYear->id)
            ->where('status', 'enrolled')
            ->whereNotNull('failed_subjects')
            ->whereDoesntHave('summerClass')
            ->get()
            ->map(function ($enrollment) {
                $student = $enrollment->studentPersonalInfo->user;
                return [
                    'id' => $enrollment->id,
                    'student_name' => $student->firstname . ' ' . $student->lastname,
                    'student_id' => $student->id,
                    'grade_level' => $enrollment->intended_grade_level,
                    'semester' => $enrollment->semester,
                    'strand' => $enrollment->strand->name ?? 'N/A',
                    'section' => $enrollment->assignedSection->section_name ?? 'N/A',
                    'failed_subjects' => $enrollment->failed_subjects,
                    'failed_count' => count($enrollment->failed_subjects ?? [])
                ];
            });

            return response()->json([
                'success' => true,
                'students' => $studentsForSummer,
                'current_school_year' => $currentSchoolYear
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting students for summer class', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to get students for summer class',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enroll student for summer class
     */
    public function enrollSummerClass(Request $request)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'enrollment_id' => 'required|exists:enrollments,id',
            'section_id' => 'nullable|exists:sections,id',
            'subjects_to_retake' => 'required|array',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'coordinator_notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $enrollment = Enrollment::with(['studentPersonalInfo.user'])
                ->findOrFail($request->enrollment_id);

            $student = $enrollment->studentPersonalInfo->user;

            // Create summer class enrollment
            $summerEnrollment = Enrollment::create([
                'student_id' => $student->id,
                'student_personal_info_id' => $enrollment->student_personal_info_id,
                'strand_id' => $enrollment->strand_id,
                'assigned_section_id' => $request->section_id,
                'school_year_id' => $enrollment->school_year_id,
                'intended_grade_level' => $enrollment->intended_grade_level,
                'semester' => $enrollment->semester,
                'status' => 'enrolled',
                'enrollment_type' => 'regular',
                'enrollment_category' => 'summer_class',
                'enrollment_method' => 'coordinator',
                'previous_enrollment_id' => $enrollment->id,
                'failed_subjects' => $request->subjects_to_retake,
                'is_summer_class' => true,
                'coordinator_id' => $user->id,
                'enrollment_date' => now(),
            ]);

            // Create summer class record
            $summerClass = SummerClass::create([
                'enrollment_id' => $summerEnrollment->id,
                'student_id' => $student->id,
                'school_year_id' => $enrollment->school_year_id,
                'section_id' => $request->section_id,
                'subjects_to_retake' => $request->subjects_to_retake,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'status' => 'enrolled',
                'coordinator_notes' => $request->coordinator_notes,
                'enrolled_by' => $user->id,
            ]);

            DB::commit();

            Log::info('Student enrolled for summer class', [
                'student_id' => $student->id,
                'enrollment_id' => $summerEnrollment->id,
                'subjects_count' => count($request->subjects_to_retake),
                'coordinator' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Student successfully enrolled for summer class',
                'enrollment' => $summerEnrollment,
                'summer_class' => $summerClass
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error enrolling student for summer class', [
                'enrollment_id' => $request->enrollment_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to enroll student for summer class',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available sections for enrollment
     */
    public function getSections()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$currentSchoolYear) {
                return response()->json(['error' => 'No active school year found'], 404);
            }

            $sections = Section::where('school_year_id', $currentSchoolYear->id)
                ->with('strand')
                ->orderBy('year_level')
                ->orderBy('section_name')
                ->get()
                ->map(function ($section) {
                    return [
                        'id' => $section->id,
                        'section_name' => $section->section_name,
                        'year_level' => $section->year_level,
                        'strand' => $section->strand ? [
                            'id' => $section->strand->id,
                            'name' => $section->strand->name
                        ] : null
                    ];
                });

            return response()->json([
                'success' => true,
                'sections' => $sections
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting sections', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to get sections',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get student schedule from enrollment
     */
    private function getStudentScheduleFromEnrollment($enrollmentId, $schoolYearId)
    {
        Log::info('Fetching student schedule', [
            'enrollment_id' => $enrollmentId,
            'school_year_id' => $schoolYearId
        ]);

        // First try: Get class details for the enrollment (preferred method)
        $classDetails = DB::table('class_details')
            ->join('class', 'class_details.class_id', '=', 'class.id')
            ->join('subjects', 'class.subject_id', '=', 'subjects.id')
            ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
            ->where('class_details.enrollment_id', $enrollmentId)
            ->where('class_details.is_enrolled', true)
            ->where('class.school_year_id', $schoolYearId)
            ->select([
                'class.id as class_id',
                'subjects.code as subject_code',
                'subjects.name as subject_name',
                'class.day_of_week',
                'class.start_time',
                'class.end_time',
                'faculty.firstname as faculty_firstname',
                'faculty.lastname as faculty_lastname'
            ])
            ->get();

        Log::info('Class details found via enrollment', ['count' => $classDetails->count()]);

        // Fallback: If no class details found, try to get schedule via assigned section
        if ($classDetails->isEmpty()) {
            Log::info('No class details found, trying fallback via assigned section');
            
            $enrollment = Enrollment::with('assignedSection')->find($enrollmentId);
            
            if ($enrollment && $enrollment->assignedSection) {
                $classDetails = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
                    ->where('class.section_id', $enrollment->assignedSection->id)
                    ->where('class.school_year_id', $schoolYearId)
                    ->where('class.is_active', true)
                    ->select([
                        'class.id as class_id',
                        'subjects.code as subject_code',
                        'subjects.name as subject_name',
                        'class.day_of_week',
                        'class.start_time',
                        'class.end_time',
                        'faculty.firstname as faculty_firstname',
                        'faculty.lastname as faculty_lastname'
                    ])
                    ->get();
                
                Log::info('Fallback schedule found via section', [
                    'section_id' => $enrollment->assignedSection->id,
                    'count' => $classDetails->count()
                ]);
            }
        }

        // Group classes by day of week
        $scheduleByDay = [];
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        foreach ($daysOfWeek as $day) {
            $scheduleByDay[$day] = [];
        }

        foreach ($classDetails as $class) {
            if (isset($scheduleByDay[$class->day_of_week])) {
                $scheduleByDay[$class->day_of_week][] = [
                    'class_id' => $class->class_id,
                    'subject_code' => $class->subject_code,
                    'subject_name' => $class->subject_name,
                    'start_time' => $class->start_time,
                    'end_time' => $class->end_time,
                    'faculty_firstname' => $class->faculty_firstname,
                    'faculty_lastname' => $class->faculty_lastname,
                    'day_of_week' => $class->day_of_week
                ];
            }
        }

        Log::info('Final schedule prepared', [
            'total_classes' => array_sum(array_map('count', $scheduleByDay)),
            'days_with_classes' => count(array_filter($scheduleByDay, function($day) { return !empty($day); }))
        ]);

        return $scheduleByDay;
    }

    /**
     * Create class details for enrolled student
     */
    private function createClassDetailsForEnrolledStudent(Enrollment $enrollment)
    {
        // Get the assigned section
        $section = $enrollment->assignedSection;
        if (!$section) {
            throw new \Exception('No section assigned to enrollment');
        }

        Log::info('Creating class details for enrolled student', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $enrollment->studentPersonalInfo->user_id,
            'section_id' => $section->id
        ]);

        // Check if class details already exist to avoid duplicates
        $existingClassDetails = \App\Models\ClassDetail::where('enrollment_id', $enrollment->id)->count();
        if ($existingClassDetails > 0) {
            Log::info('Class details already exist for this enrollment', [
                'enrollment_id' => $enrollment->id,
                'existing_count' => $existingClassDetails
            ]);
            return;
        }

        // Get all classes for this section and school year
        $classes = \App\Models\ClassSchedule::where('section_id', $section->id)
            ->where('school_year_id', $enrollment->school_year_id)
            ->where('is_active', true)
            ->get();

        Log::info('Found classes for section', [
            'section_id' => $section->id,
            'school_year_id' => $enrollment->school_year_id,
            'classes_count' => $classes->count()
        ]);

        if ($classes->isEmpty()) {
            Log::warning('No classes found for section', [
                'section_id' => $section->id,
                'school_year_id' => $enrollment->school_year_id
            ]);
            // Don't throw exception, just log warning
            return;
        }

        // Create class details for each class
        $createdCount = 0;
        foreach ($classes as $class) {
            try {
                \App\Models\ClassDetail::create([
                    'student_id' => $enrollment->studentPersonalInfo->user_id,
                    'class_id' => $class->id,
                    'enrollment_id' => $enrollment->id,
                    'status' => 'enrolled',
                    'is_enrolled' => true,
                    'enrollment_date' => now()
                ]);
                $createdCount++;
            } catch (\Exception $e) {
                Log::error('Failed to create class detail', [
                    'enrollment_id' => $enrollment->id,
                    'class_id' => $class->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info('Class details creation completed', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $enrollment->studentPersonalInfo->user_id,
            'section_id' => $section->id,
            'total_classes' => $classes->count(),
            'created_count' => $createdCount
        ]);
    }

    /**
     * Get detailed student information for coordinator review
     */
    public function getStudentDetails($id)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        try {
            $enrollment = Enrollment::with(['studentPersonalInfo.user'])
                ->findOrFail($id);

            $student = $enrollment->studentPersonalInfo->user;
            $personalInfo = $enrollment->studentPersonalInfo;

            // Log the access for audit purposes
            Log::info('Coordinator accessed student details', [
                'coordinator_id' => $user->id,
                'coordinator_name' => $user->firstname . ' ' . $user->lastname,
                'enrollment_id' => $enrollment->id,
                'student_id' => $student->id,
                'student_name' => $student->firstname . ' ' . $student->lastname,
                'access_time' => now()
            ]);

            return response()->json([
                'success' => true,
                'student' => [
                    'id' => $student->id,
                    'firstname' => $student->firstname,
                    'lastname' => $student->lastname,
                    'email' => $student->email,
                    'role' => $student->role
                ],
                'personalInfo' => [
                    'lrn' => $personalInfo->lrn,
                    'birthdate' => $personalInfo->birthdate,
                    'sex' => $personalInfo->sex,
                    'address' => $personalInfo->address,
                    'birth_place' => $personalInfo->birth_place,
                    'religion' => $personalInfo->religion,
                    'guardian_name' => $personalInfo->guardian_name,
                    'guardian_contact' => $personalInfo->guardian_contact,
                    'guardian_relationship' => $personalInfo->guardian_relationship,
                    'emergency_contact_name' => $personalInfo->emergency_contact_name,
                    'emergency_contact_number' => $personalInfo->emergency_contact_number,
                    'emergency_contact_relationship' => $personalInfo->emergency_contact_relationship,
                    'student_status' => $personalInfo->student_status,
                    'previous_school' => $personalInfo->previous_school,
                    'last_grade' => $personalInfo->last_grade,
                    'last_sy' => $personalInfo->last_sy,
                    'last_school' => $personalInfo->last_school,
                    'four_ps' => $personalInfo->four_ps,
                    'pwd_id' => $personalInfo->pwd_id,
                    'ip_community' => $personalInfo->ip_community,
                    'psa_birth_certificate' => $personalInfo->psa_birth_certificate,
                    'report_card' => $personalInfo->report_card
                ],
                'enrollment' => [
                    'id' => $enrollment->id,
                    'status' => $enrollment->status,
                    'enrollment_type' => $enrollment->enrollment_type,
                    'intended_grade_level' => $enrollment->intended_grade_level,
                    'enrollment_date' => $enrollment->enrollment_date
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get student details', [
                'enrollment_id' => $id,
                'coordinator_id' => $user->id ?? null,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to load student details',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display transferee management page
     */
    public function transfereeManagement()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return redirect()->route('login');
        }

        // Get current school year
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Faculty/TransfereeManagement', [
                'user' => $user,
                'transfereeEnrollments' => [],
                'stats' => [],
                'error' => 'No active school year found.'
            ]);
        }

        // Get transferee enrollments that need evaluation or are ready for enrollment
        $transfereeEnrollments = Enrollment::where('school_year_id', $currentSchoolYear->id)
            ->where('enrollment_type', 'transferee')
            ->whereIn('status', ['pending_evaluation', 'evaluated', 'pending_approval', 'approved_by_registrar'])
            ->with([
                'studentPersonalInfo.user',
                'strand',
                'assignedSection'
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($enrollment) {
                $studentInfo = $enrollment->studentPersonalInfo;
                $user = $studentInfo->user ?? null;
                
                return [
                    'id' => $enrollment->id,
                    'student_name' => $user ? ($user->firstname . ' ' . $user->lastname) : 'Unknown Student',
                    'student_email' => $user->email ?? 'No Email',
                    'status' => $enrollment->status,
                    'enrollment_date' => $enrollment->enrollment_date,
                    'intended_grade_level' => $enrollment->intended_grade_level,
                    'strand_name' => $enrollment->strand->name ?? 'No Strand',
                    'previous_school' => $studentInfo->previous_school ?? 'Not specified',
                    'last_grade' => $studentInfo->last_grade ?? 'Not specified',
                    'evaluation_notes' => $enrollment->evaluation_notes,
                    'evaluation_date' => $enrollment->updated_at
                ];
            });

        // Calculate stats
        $stats = [
            'total_transferees' => $transfereeEnrollments->count(),
            'pending_evaluation' => $transfereeEnrollments->where('status', 'pending_evaluation')->count(),
            'evaluated' => $transfereeEnrollments->where('status', 'evaluated')->count(),
            'approved_by_registrar' => $transfereeEnrollments->where('status', 'approved_by_registrar')->count(),
            'enrolled' => $transfereeEnrollments->where('status', 'enrolled')->count()
        ];

        return Inertia::render('Faculty/TransfereeManagement', [
            'user' => $user,
            'transfereeEnrollments' => $transfereeEnrollments,
            'stats' => $stats,
            'currentSchoolYear' => $currentSchoolYear
        ]);
    }
}
