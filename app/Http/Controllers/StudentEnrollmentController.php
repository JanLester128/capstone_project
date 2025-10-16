<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\StudentPersonalInfo;
use App\Models\StudentStrandPreference;
use App\Models\SchoolYear;
use App\Models\Strand;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class StudentEnrollmentController extends Controller
{
    /**
     * Show student enrollment page
     */
    public function enrollmentPage()
    {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'student') {
            return redirect('/login')->with('error', 'Access denied.');
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return Inertia::render('Student/Student_Enrollment', [
                'error' => 'No active school year found.',
                'enrollmentOpen' => false
            ]);
        }

        // Check if enrollment is open
        $enrollmentOpen = $this->isEnrollmentOpen($currentSchoolYear);

        // Apply semester-specific enrollment rules based on student type
        $studentType = $user->student_type ?? 'continuing';
        $canEnrollBySemester = $currentSchoolYear->canEnrollStudentType($studentType);

        // Final enrollment status considers both general enrollment status and semester rules
        $finalEnrollmentOpen = $enrollmentOpen && $canEnrollBySemester;
        
        // Get available strands
        $strands = Strand::where('is_active', true)->get();
        
        // Get existing enrollment with personal info and strand preferences
        $existingEnrollment = $this->getStudentEnrollmentWithDetails($user->id, $currentSchoolYear->id);
        
        // Get or create student personal info
        $studentPersonalInfo = StudentPersonalInfo::where('user_id', $user->id)->first();
        
        // Attach personal info to user for easy access in frontend
        $user->student_personal_info = $studentPersonalInfo;

        return Inertia::render('Student/Student_Enrollment', [
            'user' => $user,
            'currentSchoolYear' => $currentSchoolYear,
            'enrollmentOpen' => $finalEnrollmentOpen,
            'generalEnrollmentOpen' => $enrollmentOpen,
            'semesterRulesApplied' => $canEnrollBySemester,
            'studentType' => $studentType,
            'currentSemester' => $currentSchoolYear->semester === 1 ? '1st Semester' : '2nd Semester',
            'semesterRestriction' => $studentType === 'new' && $currentSchoolYear->semester !== 1 ? 'New students can only enroll in 1st semester' : null,
            'strands' => $strands,
            'existingEnrollment' => $existingEnrollment
        ]);
    }

    /**
     * Submit student enrollment with personal info and strand preferences
     */
    public function submitEnrollment(Request $request)
    {
        Log::info('Enrollment submission attempt', [
            'request_method' => $request->method(),
            'request_url' => $request->url(),
            'user_agent' => $request->userAgent(),
            'ip' => $request->ip()
        ]);

        $user = Auth::user();
        
        Log::info('Authentication check', [
            'user_authenticated' => $user ? true : false,
            'user_id' => $user ? $user->id : null,
            'user_role' => $user ? $user->role : null,
            'user_email' => $user ? $user->email : null
        ]);
        
        if (!$user || $user->role !== 'student') {
            Log::warning('Access denied for enrollment submission', [
                'user_id' => $user ? $user->id : null,
                'user_role' => $user ? $user->role : null,
                'reason' => !$user ? 'No authenticated user' : 'User role is not student'
            ]);
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$currentSchoolYear) {
            return response()->json(['error' => 'No active school year found.'], 404);
        }

        // Check if enrollment is open AND apply semester-specific rules
        $enrollmentOpen = $this->isEnrollmentOpen($currentSchoolYear);
        $studentType = $user->student_type ?? 'continuing';
        $canEnrollBySemester = $currentSchoolYear->canEnrollStudentType($studentType);

        if (!$enrollmentOpen || !$canEnrollBySemester) {
            $errorMessage = 'Enrollment is currently closed.';
            if (!$canEnrollBySemester && $studentType === 'new' && $currentSchoolYear->semester !== 1) {
                $errorMessage = 'New students can only enroll during the 1st semester.';
            }
            return response()->json(['error' => $errorMessage], 422);
        }

        // Get existing student personal info for validation
        $existingPersonalInfo = StudentPersonalInfo::where('user_id', $user->id)->first();
        
        // Debug: Log existing personal info
        Log::info('Checking existing personal info for LRN validation', [
            'user_id' => $user->id,
            'existing_personal_info' => $existingPersonalInfo ? [
                'id' => $existingPersonalInfo->id,
                'lrn' => $existingPersonalInfo->lrn,
                'user_id' => $existingPersonalInfo->user_id
            ] : null,
            'requested_lrn' => $request->lrn
        ]);
        
        // Convert string boolean values to actual booleans
        $requestData = $request->all();
        if (isset($requestData['four_ps'])) {
            $requestData['four_ps'] = filter_var($requestData['four_ps'], FILTER_VALIDATE_BOOLEAN);
        }
        
        // Validate request
        $lrnRule = 'required|string|max:20';
        if ($existingPersonalInfo) {
            $lrnRule .= '|unique:student_personal_info,lrn,' . $existingPersonalInfo->id;
        } else {
            $lrnRule .= '|unique:student_personal_info,lrn';
        }
        
        $validator = Validator::make($requestData, [
            // Personal Information
            'lrn' => $lrnRule,
            'birthdate' => 'required|date|before:today',
            'sex' => 'required|in:Male,Female',
            'address' => 'required|string|max:500',
            'guardian_name' => 'required|string|max:255',
            'guardian_contact' => 'required|string|max:20',
            'guardian_relationship' => 'required|string|max:100',
            
            // Additional Personal Information
            'extension_name' => 'nullable|string|max:10',
            'birth_place' => 'required|string|max:255',
            'religion' => 'required|string|max:100',
            'ip_community' => 'nullable|string|max:255',
            'four_ps' => 'required|boolean',
            'pwd_id' => 'nullable|string|max:50',
            
            // Previous School Information (for transferees)
            'previous_school' => 'required_if:student_type,transferee|nullable|string|max:255',
            'last_grade' => 'required_if:student_type,transferee|nullable|string|max:20',
            'last_sy' => 'required_if:student_type,transferee|nullable|string|max:20',
            'last_school' => 'required_if:student_type,transferee|nullable|string|max:255',
            
            // Emergency Contact Information
            'emergency_contact_name' => 'required|string|max:255',
            'emergency_contact_number' => 'required|string|max:20',
            'emergency_contact_relationship' => 'required|string|max:100',
            
            // Strand Preferences
            'first_strand_choice' => 'required|exists:strands,id',
            'second_strand_choice' => 'required|exists:strands,id|different:first_strand_choice',
            'third_strand_choice' => 'required|exists:strands,id|different:first_strand_choice,second_strand_choice',
            
            // Enrollment Details
            'intended_grade_level' => 'required|in:11,12',
            'student_type' => 'required|in:new,transferee,returnee',
            
            // Documents (optional)
            'psa_birth_certificate' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'report_card' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120'
        ]);

        if ($validator->fails()) {
            // Enhanced logging for LRN conflicts
            $errors = $validator->errors()->toArray();
            if (isset($errors['lrn'])) {
                // Check if there's another student with this LRN
                $conflictingRecord = StudentPersonalInfo::where('lrn', $request->lrn)
                    ->where('user_id', '!=', $user->id)
                    ->first();
                    
                Log::error('LRN validation conflict detected', [
                    'user_id' => $user->id,
                    'requested_lrn' => $request->lrn,
                    'existing_personal_info_id' => $existingPersonalInfo ? $existingPersonalInfo->id : null,
                    'existing_lrn' => $existingPersonalInfo ? $existingPersonalInfo->lrn : null,
                    'conflicting_record' => $conflictingRecord ? [
                        'id' => $conflictingRecord->id,
                        'user_id' => $conflictingRecord->user_id,
                        'lrn' => $conflictingRecord->lrn
                    ] : null,
                    'lrn_rule_used' => $lrnRule
                ]);
            }
            
            Log::error('Enrollment validation failed', [
                'user_id' => $user->id,
                'validation_errors' => $errors,
                'request_data' => $request->except(['psa_birth_certificate', 'report_card']) // Exclude files from logging
            ]);
            // Provide more specific error messages for common issues
            $customErrors = $validator->errors();
            $message = 'Please check your form data and try again.';
            
            if (isset($errors['lrn'])) {
                $message = 'The LRN you entered is already registered by another student. Please verify your LRN or contact the registrar if you believe this is an error.';
            }
            
            return response()->json([
                'error' => 'Validation failed',
                'message' => $message,
                'errors' => $customErrors
            ], 422);
        }

        // Check for existing enrollment - use both direct student_id lookup and student_personal_info_id lookup
        $existingEnrollment = Enrollment::where('student_id', $user->id)
            ->where('school_year_id', $currentSchoolYear->id)
            ->whereNotIn('status', ['rejected'])
            ->first();

        // Also check via student_personal_info_id if no direct enrollment found
        if (!$existingEnrollment && $existingPersonalInfo) {
            $existingEnrollment = Enrollment::where('student_personal_info_id', $existingPersonalInfo->id)
                ->where('school_year_id', $currentSchoolYear->id)
                ->whereNotIn('status', ['rejected'])
                ->first();
        }

        if ($existingEnrollment) {
            Log::info('Existing enrollment found', [
                'user_id' => $user->id,
                'enrollment_id' => $existingEnrollment->id,
                'status' => $existingEnrollment->status,
                'school_year_id' => $currentSchoolYear->id,
                'found_via' => $existingEnrollment->student_id ? 'student_id' : 'student_personal_info_id'
            ]);
            return response()->json(['error' => 'You already have an enrollment application for this school year.'], 422);
        }

        DB::beginTransaction();
        
        try {
            // Log request data for debugging
            Log::info('Enrollment submission started', [
                'user_id' => $user->id,
                'request_data' => collect($requestData)->except(['psa_birth_certificate', 'report_card'])->toArray()
            ]);
            // Get or create student personal info
            Log::info('Attempting to create/update student personal info', [
                'user_id' => $user->id,
                'request_fields' => [
                    'lrn' => $request->lrn,
                    'intended_grade_level' => $request->intended_grade_level,
                    'student_type' => $request->student_type,
                    'birthdate' => $request->birthdate,
                    'sex' => $request->sex,
                    'address' => $request->address,
                    'guardian_name' => $request->guardian_name,
                    'guardian_contact' => $request->guardian_contact,
                    'guardian_relationship' => $request->guardian_relationship,
                ]
            ]);
            
            $studentInfo = StudentPersonalInfo::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'lrn' => $request->lrn,
                    'grade_level' => 'Grade ' . $request->intended_grade_level,
                    'student_status' => $request->student_type,
                    'birthdate' => $request->birthdate,
                    'sex' => $request->sex,
                    'address' => $request->address,
                    'guardian_name' => $request->guardian_name,
                    'guardian_contact' => $request->guardian_contact,
                    'guardian_relationship' => $request->guardian_relationship,
                    
                    // Additional personal information
                    'extension_name' => $request->extension_name,
                    'birth_place' => $request->birth_place,
                    'religion' => $request->religion,
                    'ip_community' => $request->ip_community,
                    'four_ps' => $requestData['four_ps'] ? 1 : 0,
                    'pwd_id' => $request->pwd_id,
                    
                    // Previous school information (for transferees)
                    'previous_school' => $request->previous_school,
                    'last_grade' => $request->last_grade,
                    'last_sy' => $request->last_sy,
                    'last_school' => $request->last_school,
                    
                    // Emergency contact information
                    'emergency_contact_name' => $request->emergency_contact_name,
                    'emergency_contact_number' => $request->emergency_contact_number,
                    'emergency_contact_relationship' => $request->emergency_contact_relationship,
                ]
            );
            
            Log::info('Student personal info created/updated successfully', [
                'student_info_id' => $studentInfo->id
            ]);

            // Handle document uploads
            if ($request->hasFile('psa_birth_certificate')) {
                try {
                    $file = $request->file('psa_birth_certificate');
                    Log::info('Uploading PSA birth certificate', [
                        'original_name' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'mime_type' => $file->getMimeType()
                    ]);
                    
                    $path = $file->store('documents/psa_certificates', 'public');
                    $studentInfo->psa_birth_certificate = $path;
                    
                    Log::info('PSA birth certificate uploaded successfully', ['path' => $path]);
                } catch (\Exception $e) {
                    Log::error('PSA birth certificate upload failed', ['error' => $e->getMessage()]);
                    throw new \Exception('Failed to upload PSA birth certificate: ' . $e->getMessage());
                }
            }

            if ($request->hasFile('report_card')) {
                try {
                    $file = $request->file('report_card');
                    Log::info('Uploading report card', [
                        'original_name' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'mime_type' => $file->getMimeType()
                    ]);
                    
                    $path = $file->store('documents/report_cards', 'public');
                    $studentInfo->report_card = $path;
                    
                    Log::info('Report card uploaded successfully', ['path' => $path]);
                } catch (\Exception $e) {
                    Log::error('Report card upload failed', ['error' => $e->getMessage()]);
                    throw new \Exception('Failed to upload report card: ' . $e->getMessage());
                }
            }

            $studentInfo->save();

            // Delete existing strand preferences for this student BEFORE creating enrollment to avoid duplicates
            $deletedCount = StudentStrandPreference::where('student_personal_info_id', $studentInfo->id)->count();
            StudentStrandPreference::where('student_personal_info_id', $studentInfo->id)->delete();
            
            Log::info('Deleted existing strand preferences', [
                'student_personal_info_id' => $studentInfo->id,
                'deleted_count' => $deletedCount
            ]);

            // Force a fresh database query to ensure deletions are committed
            DB::statement('SELECT 1'); // This forces a database sync

            // Create enrollment record using first strand choice as primary
            $isTransferee = $request->student_type === 'transferee';
            $enrollmentData = [
                'student_personal_info_id' => $studentInfo->id,
                'strand_id' => $request->first_strand_choice, // Use first choice as primary strand
                'school_year_id' => $currentSchoolYear->id,
                'intended_grade_level' => $request->intended_grade_level,
                'status' => $isTransferee ? 'pending_evaluation' : 'pending_approval',
                'enrollment_type' => $isTransferee ? 'transferee' : 'regular',
                'enrollment_method' => 'self',
                'enrollment_date' => now()
            ];

            Log::info('Creating enrollment record', [
                'enrollment_data' => $enrollmentData
            ]);

            $enrollment = Enrollment::create($enrollmentData);
            
            Log::info('Enrollment record created successfully', [
                'enrollment_id' => $enrollment->id
            ]);
            
            // Verify no existing strand preferences remain
            $remainingPrefs = StudentStrandPreference::where('student_personal_info_id', $studentInfo->id)->count();
            Log::info('Verified strand preferences deletion', [
                'student_personal_info_id' => $studentInfo->id,
                'remaining_preferences' => $remainingPrefs
            ]);

            // Create new strand preferences
            $strandPreferences = [
                ['strand_id' => $request->first_strand_choice, 'preference_order' => 1],
                ['strand_id' => $request->second_strand_choice, 'preference_order' => 2],
                ['strand_id' => $request->third_strand_choice, 'preference_order' => 3]
            ];

            foreach ($strandPreferences as $preference) {
                try {
                    // Use updateOrCreate to handle duplicates gracefully
                    $strandPref = StudentStrandPreference::updateOrCreate(
                        [
                            'student_personal_info_id' => $studentInfo->id,
                            'preference_order' => $preference['preference_order']
                        ],
                        [
                            'strand_id' => $preference['strand_id']
                        ]
                    );
                    
                    Log::info('Created/Updated strand preference', [
                        'preference_id' => $strandPref->id,
                        'student_personal_info_id' => $studentInfo->id,
                        'strand_id' => $preference['strand_id'],
                        'preference_order' => $preference['preference_order'],
                        'was_recently_created' => $strandPref->wasRecentlyCreated
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create/update strand preference', [
                        'student_personal_info_id' => $studentInfo->id,
                        'strand_id' => $preference['strand_id'],
                        'preference_order' => $preference['preference_order'],
                        'error' => $e->getMessage()
                    ]);
                    throw $e;
                }
            }

            DB::commit();

            // Log enrollment submission
            Log::info('Enhanced enrollment submitted', [
                'user_id' => $user->id,
                'enrollment_id' => $enrollment->id,
                'student_type' => $request->student_type,
                'strand_preferences' => $strandPreferences
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Enrollment application submitted successfully.',
                'enrollment' => $enrollment->load(['strand', 'schoolYear', 'studentPersonalInfo.strandPreferences.strand'])
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollback();
            
            Log::error('Database error during enrollment submission', [
                'user_id' => $user->id,
                'sql_error' => $e->getMessage(),
                'sql_code' => $e->getCode(),
                'bindings' => $e->getBindings(),
                'request_data' => $request->except(['psa_birth_certificate', 'report_card'])
            ]);

            return response()->json([
                'error' => 'Database error occurred during enrollment.',
                'details' => config('app.debug') ? $e->getMessage() : 'Please check if all required fields are provided correctly.'
            ], 500);
            
        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Enhanced enrollment submission failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['psa_birth_certificate', 'report_card'])
            ]);

            return response()->json([
                'error' => 'Enrollment submission failed. Please try again.',
                'details' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get student enrollment with personal info and strand preferences
     */
    private function getStudentEnrollmentWithDetails($userId, $schoolYearId)
    {
        $enrollment = Enrollment::with([
            'strand',
            'schoolYear',
            'assignedSection.strand',
            'studentPersonalInfo.strandPreferences.strand'
        ])->whereHas('studentPersonalInfo', function($query) use ($userId) {
            $query->where('user_id', $userId);
        })->where('school_year_id', $schoolYearId)->first();

        if ($enrollment && $enrollment->studentPersonalInfo) {
            // Format strand preferences for easy frontend access
            $enrollment->strand_preferences = $enrollment->studentPersonalInfo->strandPreferences()
                ->with('strand')
                ->orderBy('preference_order')
                ->get()
                ->map(function($pref) {
                    return [
                        'strand_id' => $pref->strand_id,
                        'strand_name' => $pref->strand->name,
                        'preference_order' => $pref->preference_order
                    ];
                });
        }

        // Debug: Log enrollment data structure
        if ($enrollment) {
            Log::info('Enrollment data loaded', [
                'enrollment_id' => $enrollment->id,
                'assigned_section_id' => $enrollment->assigned_section_id,
                'assigned_section' => $enrollment->assignedSection ? [
                    'id' => $enrollment->assignedSection->id,
                    'section_name' => $enrollment->assignedSection->section_name,
                    'year_level' => $enrollment->assignedSection->year_level,
                    'strand_name' => $enrollment->assignedSection->strand ? $enrollment->assignedSection->strand->name : null
                ] : null
            ]);
        }

        return $enrollment;
    }

    /**
     * Check if enrollment is open
     */
    private function isEnrollmentOpen($schoolYear)
    {
        if (!$schoolYear->is_enrollment_open) {
            return false;
        }

        $now = now();
        
        // Check new enrollment date fields first
        if ($schoolYear->enrollment_start_date && $schoolYear->enrollment_end_date) {
            return $now->between($schoolYear->enrollment_start_date, $schoolYear->enrollment_end_date);
        }
        
        // Fallback to old enrollment date fields for backward compatibility
        if ($schoolYear->enrollment_start && $schoolYear->enrollment_end) {
            return $now->between($schoolYear->enrollment_start, $schoolYear->enrollment_end);
        }

        return $schoolYear->is_enrollment_open;
    }

    /**
     * Get current enrollment status for frontend polling
     */
    public function getEnrollmentStatus()
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'student') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        if (!$currentSchoolYear) {
            return response()->json([
                'enrollment' => [
                    'is_enrollment_open' => false,
                    'message' => 'No active school year found.'
                ]
            ]);
        }

        $enrollmentOpen = $this->isEnrollmentOpen($currentSchoolYear);

        // Apply semester-specific enrollment rules based on student type
        $studentType = $user->student_type ?? 'continuing';
        $canEnrollBySemester = $currentSchoolYear->canEnrollStudentType($studentType);

        // Final enrollment status considers both general enrollment status and semester rules
        $finalEnrollmentOpen = $enrollmentOpen && $canEnrollBySemester;

        return response()->json([
            'enrollment' => [
                'is_enrollment_open' => $finalEnrollmentOpen,
                'general_enrollment_open' => $enrollmentOpen,
                'semester_rules_applied' => $canEnrollBySemester,
                'student_type' => $studentType,
                'current_semester' => $currentSchoolYear->semester === 1 ? '1st Semester' : '2nd Semester',
                'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                'semester' => $currentSchoolYear->semester === 1 ? '1st Semester' : '2nd Semester',
                'semester_restriction' => $studentType === 'new' && $currentSchoolYear->semester !== 1 ? 'New students can only enroll in 1st semester' : null
            ]
        ]);
    }
}
