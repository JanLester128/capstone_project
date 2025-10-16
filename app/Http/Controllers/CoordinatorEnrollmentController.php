<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\StudentPersonalInfo;
use App\Models\SchoolYear;
use App\Models\Strand;
use App\Models\Section;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Services\CORService;

class CoordinatorEnrollmentController extends Controller
{
    /**
     * Display enrollment approval page for coordinators
     */
    public function enrollmentApprovalPage()
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return redirect()->route('login')->with('error', 'Access denied.');
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Coordinator/EnrollmentApproval', [
                'error' => 'No active school year found.',
                'enrollments' => []
            ]);
        }

        // Get pending enrollments for coordinator review
        $enrollments = $this->getPendingEnrollments($currentSchoolYear->id);
        
        // Get available strands and sections
        $strands = Strand::orderBy('name')->get();
        $sections = Section::where('school_year_id', $currentSchoolYear->id)
            ->with(['strand'])
            ->orderBy('year_level')
            ->orderBy('section_name')
            ->get();

        return Inertia::render('Coordinator/EnrollmentApproval', [
            'user' => $user,
            'currentSchoolYear' => $currentSchoolYear,
            'enrollments' => $enrollments,
            'strands' => $strands,
            'sections' => $sections
        ]);
    }

    /**
     * Get pending enrollments for coordinator review
     */
    private function getPendingEnrollments($schoolYearId)
    {
        return Enrollment::where('school_year_id', $schoolYearId)
            ->whereIn('status', ['pending_approval', 'returned'])
            ->with([
                'studentPersonalInfo.user',
                'studentPersonalInfo.strandPreferences.strand',
                'strand',
                'assignedSection',
                'firstStrandChoice',
                'secondStrandChoice',
                'thirdStrandChoice'
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($enrollment) {
                return [
                    'id' => $enrollment->id,
                    'student_name' => $enrollment->studentPersonalInfo->user->firstname . ' ' . $enrollment->studentPersonalInfo->user->lastname,
                    'student_email' => $enrollment->studentPersonalInfo->user->email,
                    'lrn' => $enrollment->studentPersonalInfo->lrn,
                    'student_type' => $enrollment->enrollment_type,
                    'intended_grade_level' => $enrollment->intended_grade_level,
                    'status' => $enrollment->status,
                    'enrollment_date' => $enrollment->enrollment_date,
                    'strand_preferences' => $enrollment->studentPersonalInfo->strandPreferences->map(function ($pref) {
                        return [
                            'preference_order' => $pref->preference_order,
                            'strand_id' => $pref->strand_id,
                            'strand_name' => $pref->strand->name
                        ];
                    })->sortBy('preference_order')->values(),
                    // Also include strand choices from enrollment table as backup
                    'enrollment_strand_choices' => [
                        'first_choice' => $enrollment->firstStrandChoice ? [
                            'id' => $enrollment->firstStrandChoice->id,
                            'name' => $enrollment->firstStrandChoice->name
                        ] : null,
                        'second_choice' => $enrollment->secondStrandChoice ? [
                            'id' => $enrollment->secondStrandChoice->id,
                            'name' => $enrollment->secondStrandChoice->name
                        ] : null,
                        'third_choice' => $enrollment->thirdStrandChoice ? [
                            'id' => $enrollment->thirdStrandChoice->id,
                            'name' => $enrollment->thirdStrandChoice->name
                        ] : null,
                    ],
                    'assigned_strand' => $enrollment->strand ? $enrollment->strand->name : null,
                    'assigned_section' => $enrollment->assignedSection ? $enrollment->assignedSection->section_name : null,
                    'personal_info' => [
                        'birthdate' => $enrollment->studentPersonalInfo->birthdate,
                        'sex' => $enrollment->studentPersonalInfo->sex,
                        'address' => $enrollment->studentPersonalInfo->address,
                        'guardian_name' => $enrollment->studentPersonalInfo->guardian_name,
                        'guardian_contact' => $enrollment->studentPersonalInfo->guardian_contact,
                        'guardian_relationship' => $enrollment->studentPersonalInfo->guardian_relationship,
                    ]
                ];
            });
    }

    /**
     * Approve and enroll a student
     */
    public function approveAndEnroll(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $request->validate([
            'assigned_section_id' => 'required|exists:sections,id',
            'coordinator_notes' => 'nullable|string|max:1000'
        ]);

        try {
            DB::beginTransaction();

            $enrollment = Enrollment::with([
                'firstStrandChoice',
                'secondStrandChoice', 
                'thirdStrandChoice'
            ])->findOrFail($enrollmentId);
            
            // Check section capacity before approval
            $section = Section::with('strand')->findOrFail($request->assigned_section_id);
            if (!$section->hasAvailableSlots()) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot approve enrollment. Section '{$section->section_name}' is at full capacity ({$section->max_capacity} students).",
                ], 400);
            }
            
            // Note: Coordinators can assign students to any strand, not just their preferences
            // This allows flexibility when:
            // - Student doesn't qualify for their preferred strand (e.g., failed STEM exam)
            // - Preferred strands are at full capacity
            // - Coordinator determines a different strand is more suitable based on evaluation
            
            // Log if assigning to non-preferred strand for tracking and audit purposes
            $allowedStrandIds = array_filter([
                $enrollment->first_strand_choice_id,
                $enrollment->second_strand_choice_id,
                $enrollment->third_strand_choice_id
            ]);
            
            if (!in_array($section->strand_id, $allowedStrandIds)) {
                // Get student's strand preferences for logging
                $strandNames = [];
                if ($enrollment->firstStrandChoice) $strandNames[] = $enrollment->firstStrandChoice->name;
                if ($enrollment->secondStrandChoice) $strandNames[] = $enrollment->secondStrandChoice->name;
                if ($enrollment->thirdStrandChoice) $strandNames[] = $enrollment->thirdStrandChoice->name;
                
                Log::info('Coordinator approving enrollment with non-preferred strand', [
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $enrollment->studentPersonalInfo->user_id,
                    'assigned_strand_id' => $section->strand_id,
                    'assigned_strand_name' => $section->strand ? $section->strand->name : 'Unknown',
                    'student_preferred_strands' => $strandNames,
                    'coordinator_id' => $user->id,
                    'reason' => 'Coordinator override - flexibility for non-qualifying students or capacity issues'
                ]);
            }
            
            // Update enrollment status to enrolled and assign strand based on section
            $enrollment->update([
                'status' => 'enrolled',
                'assigned_section_id' => $request->assigned_section_id,
                'strand_id' => $section->strand_id, // Update to the strand of the assigned section
                'coordinator_id' => $user->id,
                'coordinator_notes' => $request->coordinator_notes,
                'reviewed_at' => now()
            ]);

            // Log the approval
            Log::info('Coordinator approved enrollment', [
                'enrollment_id' => $enrollmentId,
                'coordinator_id' => $user->id,
                'student_id' => $enrollment->studentPersonalInfo->user_id,
                'assigned_section_id' => $request->assigned_section_id
            ]);

            // Generate COR for the enrolled student
            $corService = new CORService();
            $cor = $corService->generateCOR($enrollment, $user->id);

            // Send notification to student and registrar
            $this->sendEnrollmentNotification($enrollment, 'approved');

            // Update section capacity status after enrollment
            $section->updateCapacityStatus();

            DB::commit();

            Log::info('Student enrollment approved and COR generated', [
                'enrollment_id' => $enrollmentId,
                'cor_id' => $cor->id,
                'cor_number' => $cor->cor_number
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Student enrollment approved and COR generated successfully.',
                'enrollment' => $enrollment->load(['assignedSection', 'strand']),
                'cor' => [
                    'id' => $cor->id,
                    'cor_number' => $cor->cor_number
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Failed to approve enrollment', [
                'enrollment_id' => $enrollmentId,
                'coordinator_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Failed to approve enrollment',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return enrollment with remarks
     */
    public function returnEnrollment(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $request->validate([
            'return_remarks' => 'required|string|max:1000'
        ]);

        try {
            DB::beginTransaction();

            $enrollment = Enrollment::findOrFail($enrollmentId);
            
            $enrollment->update([
                'status' => 'returned',
                'coordinator_id' => $user->id,
                'coordinator_notes' => $request->return_remarks,
                'reviewed_at' => now()
            ]);

            // Send notification to student
            $this->sendEnrollmentNotification($enrollment, 'returned');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Enrollment returned to student with remarks.',
                'enrollment' => $enrollment
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            return response()->json([
                'error' => 'Failed to return enrollment',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject enrollment application
     */
    public function rejectEnrollment(Request $request, $enrollmentId)
    {
        $user = Auth::user();
        
        if (!$user || !in_array($user->role, ['coordinator', 'faculty'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:1000'
        ]);

        try {
            DB::beginTransaction();

            $enrollment = Enrollment::findOrFail($enrollmentId);
            
            $enrollment->update([
                'status' => 'rejected',
                'coordinator_id' => $user->id,
                'rejection_reason' => $request->rejection_reason,
                'reviewed_at' => now()
            ]);

            // Send notification to student and registrar
            $this->sendEnrollmentNotification($enrollment, 'rejected');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Enrollment application rejected.',
                'enrollment' => $enrollment
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            
            return response()->json([
                'error' => 'Failed to reject enrollment',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send enrollment status notification
     */
    private function sendEnrollmentNotification($enrollment, $action)
    {
        // This would integrate with your notification system
        // For now, we'll just log the notification
        Log::info('Enrollment notification sent', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $enrollment->studentPersonalInfo->user_id,
            'action' => $action,
            'status' => $enrollment->status
        ]);
    }
}
