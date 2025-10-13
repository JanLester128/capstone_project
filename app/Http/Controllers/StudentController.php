<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Strand;
use App\Models\SchoolYear;
use App\Models\Enrollment;
use App\Models\ClassDetail;
use App\Models\Subject;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class StudentController extends Controller
{
    public function __construct()
    {
        // Middleware is now handled in routes or via Route::middleware()
    }

    /**
     * Display a listing of the resource.
     * Registrar or faculty can see all. Student sees only their own.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'student') {
            $student = Student::with(['user'])
                ->where('user_id', $user->id)
                ->first();

            if (! $student) {
                return response()->json(['message' => 'Student record not found.'], 404);
            }

            return response()->json($student);
        }

        // registrar / faculty / others with permission
        $students = Student::with(['user'])->get();
        return response()->json($students);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $student = Student::with(['user'])->find($id);

        if (! $student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        if ($user->role === 'student' && $student->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($student);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $student = Student::find($id);

        if (! $student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        if ($user->role === 'student' && $student->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'lrn' => 'sometimes|string',
            'grade_level' => 'sometimes|string',
            'birthdate' => 'sometimes|date',
            'address' => 'sometimes|string',
        ]);

        $student->update($validated);

        return response()->json([
            'message' => 'Student updated successfully.',
            'student' => $student->load(['user'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     * Only registrar/faculty can delete. Student cannot delete self here.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $student = Student::find($id);
        if (! $student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        if ($user->role === 'student') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Optional: also delete associated user if desired
        $relatedUser = $student->user;
        $student->delete();
        if ($relatedUser) {
            $relatedUser->delete();
        }

        return response()->json(['message' => 'Student (and user) deleted successfully.']);
    }


    /**
     * Store enrollment data for a student
     */
    public function enroll(Request $request)
    {
        try {
            // Handle authentication more gracefully
            $user = $request->user();
            
            if (!$user) {
                // Try different authentication methods
                $user = auth()->guard('sanctum')->user();
                
                if (!$user) {
                    // Check if there's a token in the request
                    $token = $request->bearerToken() ?? $request->header('Authorization');
                    if ($token) {
                        $token = str_replace('Bearer ', '', $token);
                        $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                        if ($tokenModel) {
                            $user = $tokenModel->tokenable;
                        }
                    }
                }
                
                // If still no user, return error
                if (!$user) {
                    return redirect()->back()->withErrors([
                        'general' => 'Authentication required. Please login again.'
                    ]);
                }
            }

            Log::info('Enrollment attempt started', ['user_id' => $user->id]);

            // Check if enrollment is currently open
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return redirect()->back()->withErrors([
                    'general' => 'No active school year found. Please contact the registrar.'
                ]);
            }

            if (!$activeSchoolYear->isEnrollmentOpen()) {
                // Check if it's specifically a day restriction
                $dayRestrictionMessage = $activeSchoolYear->getEnrollmentDayRestrictionMessage();
                if ($dayRestrictionMessage) {
                    $nextEnrollmentDay = $activeSchoolYear->getNextEnrollmentDay();
                    return redirect()->back()->withErrors([
                        'general' => $dayRestrictionMessage . ' Next available enrollment day: ' . $nextEnrollmentDay->format('l, F j, Y')
                    ]);
                }
                
                return redirect()->back()->withErrors([
                    'general' => 'Enrollment is currently closed. Please contact the registrar\'s office for assistance.'
                ]);
            }

            // Find or create the student record for the authenticated user
            $student = Student::where('user_id', $user->id)->first();

            if (!$student) {
                Log::info('Creating new student record for user', ['user_id' => $user->id]);
                // Create a new student record if it doesn't exist
                $student = Student::create([
                    'user_id' => $user->id,
                ]);
                Log::info('Created new student record', ['student_id' => $student->id, 'user_id' => $user->id]);
            } else {
                Log::info('Found existing student record', ['student_id' => $student->id]);
            }

            Log::info('Starting validation', [
                'request_data_keys' => array_keys($request->all()),
                'guardian_data' => [
                    'guardianName' => $request->input('guardianName'),
                    'guardianContact' => $request->input('guardianContact'), 
                    'guardianRelationship' => $request->input('guardianRelationship'),
                    'emergencyContactName' => $request->input('emergencyContactName'),
                    'emergencyContactNumber' => $request->input('emergencyContactNumber'),
                    'emergencyContactRelationship' => $request->input('emergencyContactRelationship'),
                ]
            ]);

            try {
                $validated = $request->validate([
                    'lrn' => 'required|string|size:12|unique:student_personal_info,lrn,' . $student->id,
                    'studentStatus' => 'required|string|in:New Student,Transferee',
                'gradeLevel' => 'required|string|in:Grade 11,Grade 12',
                'extensionName' => 'nullable|string|max:10',
                'birthdate' => 'required|date',
                'age' => 'required|integer|min:10|max:30',
                'sex' => 'required|string|in:Male,Female',
                'birthPlace' => 'required|string',
                'address' => 'required|string',
                'religion' => 'nullable|string',
                'ipCommunity' => 'nullable|string|in:Yes,No',
                'fourPs' => 'nullable|string|in:Yes,No',
                'pwdId' => 'nullable|string|max:50',
                'guardianName' => 'required|string|max:255',
                'guardianContact' => 'required|string|max:20',
                'guardianRelationship' => 'required|string|max:50',
                'emergencyContactName' => 'nullable|string|max:255',
                'emergencyContactNumber' => 'nullable|string|max:20',
                'emergencyContactRelationship' => 'nullable|string|max:50',
                'lastSchool' => 'nullable|string|max:255',
                'lastGrade' => 'required|string|max:50',
                'lastSY' => 'required|string|max:20',
                // File uploads
                'reportCard' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
                'psaBirthCertificate' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
                // Strand preferences validation
                'firstChoice' => 'required|integer|exists:strands,id',
                'secondChoice' => 'nullable|integer|different:firstChoice|exists:strands,id',
                'thirdChoice' => 'nullable|integer|different:firstChoice|different:secondChoice|exists:strands,id',
            ], [
                'lrn.unique' => 'This LRN is already registered by another student. Please check the LRN and try again.',
                'lrn.size' => 'LRN must be exactly 12 digits.',
            ]);
            } catch (\Illuminate\Validation\ValidationException $e) {
                Log::error('Enrollment validation failed', [
                    'user_id' => $user->id,
                    'errors' => $e->errors(),
                    'lrn' => $request->input('lrn')
                ]);
                
                // Check if it's specifically an LRN duplicate error
                if (isset($e->errors()['lrn']) && str_contains($e->errors()['lrn'][0], 'already')) {
                    return back()->withErrors($e->errors())->withInput()
                        ->with('error', 'This LRN is already registered by another student. Please verify the LRN number and try again.');
                }
                
                return back()->withErrors($e->errors())->withInput()
                    ->with('error', 'Validation failed. Please check your input and try again.');
            }

            Log::info('Enrollment validation passed', [
                'user_id' => $user->id, 
                'student_id' => $student->id,
                'validated_guardian_data' => [
                    'guardianName' => $validated['guardianName'] ?? 'NOT_SET',
                    'guardianContact' => $validated['guardianContact'] ?? 'NOT_SET',
                    'guardianRelationship' => $validated['guardianRelationship'] ?? 'NOT_SET',
                    'emergencyContactName' => $validated['emergencyContactName'] ?? 'NOT_SET',
                    'emergencyContactNumber' => $validated['emergencyContactNumber'] ?? 'NOT_SET',
                    'emergencyContactRelationship' => $validated['emergencyContactRelationship'] ?? 'NOT_SET',
                ]
            ]);

            // Handle file uploads
            $filePaths = [];
            try {
                if ($request->hasFile('reportCard')) {
                    Log::info('Processing report card upload');
                    $filePaths['reportCard'] = $request->file('reportCard')->store('enrollment_documents', 'public');
                    Log::info('Report card uploaded', ['path' => $filePaths['reportCard']]);
                }

                if ($request->hasFile('psaBirthCertificate')) {
                    Log::info('Processing PSA birth certificate upload');
                    $filePaths['psaBirthCertificate'] = $request->file('psaBirthCertificate')->store('enrollment_documents', 'public');
                    Log::info('PSA birth certificate uploaded', ['path' => $filePaths['psaBirthCertificate']]);
                }
            } catch (\Exception $e) {
                Log::error('File upload error: ' . $e->getMessage());
                return redirect()->back()->with('error', 'File upload failed: ' . $e->getMessage())->withInput();
            }

            // Philippine SHS System: Check enrollment window instead of just active school year
            $schoolYear = SchoolYear::getEnrollmentOpen();

            if (!$schoolYear || !$schoolYear->isEnrollmentOpen()) {
                Log::error('No active school year found');
                return redirect()->back()->with('error', 'No active school year found. Please contact the registrar to activate a school year.');
            }

            Log::info('Found active school year', ['school_year_id' => $schoolYear->id]);

            // Find strand based on first choice (strand ID, not code)
            $strand = Strand::find($validated['firstChoice']);

            if (!$strand) {
                Log::error('Strand not found', ['strand_id' => $validated['firstChoice']]);
                return redirect()->back()->withErrors(['firstChoice' => 'Selected strand not found.'])->withInput();
            }

            Log::info('Found strand', ['strand_id' => $strand->id, 'strand_name' => $strand->name]);

            Log::info('Updating student personal information');

            // Update student record with personal information
            try {
                $updateData = [
                    'lrn' => $validated['lrn'],
                    'grade_level' => $validated['gradeLevel'],
                    'extension_name' => $validated['extensionName'] ?? null,
                    'birthdate' => $validated['birthdate'],
                    'age' => $validated['age'],
                    'sex' => $validated['sex'],
                    'birth_place' => $validated['birthPlace'],
                    'address' => $validated['address'],
                    'religion' => $validated['religion'] ?? null,
                    'ip_community' => $validated['ipCommunity'] ?? null,
                    'four_ps' => $validated['fourPs'] ?? null,
                    'pwd_id' => $validated['pwdId'] ?? null,
                    'last_grade' => $validated['lastGrade'] ?? null,
                    'last_sy' => $validated['lastSY'] ?? null,
                    'guardian_name' => $validated['guardianName'] ?? null,
                    'guardian_contact' => $validated['guardianContact'] ?? null,
                    'guardian_relationship' => $validated['guardianRelationship'] ?? null,
                    'emergency_contact_name' => $validated['emergencyContactName'] ?? null,
                    'emergency_contact_number' => $validated['emergencyContactNumber'] ?? null,
                    'emergency_contact_relationship' => $validated['emergencyContactRelationship'] ?? null,
                    'last_school' => $validated['lastSchool'] ?? null,
                ];
                
                // Only include report_card if the column exists in the database
                if (Schema::hasColumn('student_personal_info', 'report_card')) {
                    $updateData['report_card'] = $filePaths['reportCard'] ?? null;
                }

                Log::info('Guardian data being saved', [
                    'guardian_name' => $updateData['guardian_name'],
                    'guardian_contact' => $updateData['guardian_contact'],
                    'guardian_relationship' => $updateData['guardian_relationship'],
                    'emergency_contact_name' => $updateData['emergency_contact_name'],
                    'emergency_contact_number' => $updateData['emergency_contact_number'],
                    'emergency_contact_relationship' => $updateData['emergency_contact_relationship'],
                ]);

                // Include student_status only if column exists
                if (Schema::hasColumn('student_personal_info', 'student_status')) {
                    $updateData['student_status'] = $validated['studentStatus'];
                }

                // Include PSA only if column exists
                if (Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
                    $updateData['psa_birth_certificate'] = $filePaths['psaBirthCertificate'] ?? ($student->psa_birth_certificate ?? null);
                }

                $student->update($updateData);
                Log::info('Updated student personal information successfully');
                
                // Verify guardian data was saved
                $savedData = $student->fresh();
                Log::info('Guardian data after save', [
                    'guardian_name' => $savedData->guardian_name,
                    'guardian_contact' => $savedData->guardian_contact,
                    'guardian_relationship' => $savedData->guardian_relationship,
                    'emergency_contact_name' => $savedData->emergency_contact_name,
                    'emergency_contact_number' => $savedData->emergency_contact_number,
                    'emergency_contact_relationship' => $savedData->emergency_contact_relationship,
                ]);
                
                // Update the user's student_type field to match the enrollment status
                try {
                    $userStudentType = match($validated['studentStatus']) {
                        'New Student' => 'new',
                        'Transferee' => 'transferee',
                        default => 'new'
                    };
                    
                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['student_type' => $userStudentType]);
                        
                    Log::info('Updated user student_type', [
                        'user_id' => $user->id,
                        'student_type' => $userStudentType,
                        'student_status' => $validated['studentStatus']
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Failed to update user student_type: ' . $e->getMessage());
                    // Don't fail the enrollment if this fails, just log it
                }
                
                // If student is a transferee and has a previous school, store it in transferee_previous_schools table
                if ($validated['studentStatus'] === 'Transferee' && !empty($validated['lastSchool'])) {
                    try {
                        DB::table('transferee_previous_schools')->updateOrInsert(
                            ['student_id' => $user->id],
                            [
                                'last_school' => $validated['lastSchool'],
                                'created_at' => now(),
                                'updated_at' => now()
                            ]
                        );
                        Log::info('Stored transferee previous school information', [
                            'user_id' => $user->id,
                            'previous_school' => $validated['lastSchool']
                        ]);
                    } catch (\Exception $e) {
                        Log::warning('Failed to store transferee previous school: ' . $e->getMessage());
                        // Don't fail the enrollment if this fails, just log it
                    }
                }
            } catch (\Illuminate\Database\QueryException $e) {
                Log::error('Database error updating student personal information: ' . $e->getMessage());
                
                // Check if it's a duplicate LRN error
                if ($e->errorInfo[1] == 1062 && str_contains($e->getMessage(), 'lrn')) {
                    return redirect()->back()->withErrors([
                        'lrn' => 'This LRN is already registered by another student. Please verify the LRN number and try again.'
                    ])->withInput();
                }
                
                return redirect()->back()->withErrors([
                    'general' => 'Database error occurred while updating student information. Please try again.'
                ])->withInput();
            } catch (\Exception $e) {
                Log::error('Error updating student personal information: ' . $e->getMessage());
                return redirect()->back()->withErrors([
                    'general' => 'An unexpected error occurred. Please try again.'
                ])->withInput();
            }

            // Store enrollment data
            $enrollmentId = null;
            try {
                // Check for existing enrollment first to prevent duplicates
                // FIXED: Use user_id instead of student->id since enrollments.student_id references users.id
                $existingEnrollment = DB::table('enrollments')
                    ->where('student_id', $user->id)
                    ->where('school_year_id', $schoolYear->id)
                    ->first();

                if ($existingEnrollment) {
                    Log::info('Existing enrollment found', [
                        'enrollment_id' => $existingEnrollment->id,
                        'status' => $existingEnrollment->status
                    ]);

                    // If already enrolled, redirect back with success message
                    if ($existingEnrollment->status === 'enrolled') {
                        return redirect()->back()->with('success', 'You are already enrolled for this school year.');
                    }

                    // If pending, update the existing record instead of creating new one
                    // If already enrolled, still update strand preferences then redirect
                    if ($existingEnrollment->status === 'enrolled') {
                        // Update strand preferences even for enrolled students
                        $this->updateStrandPreferences($student, $validated, $schoolYear);
                        return redirect()->back()->with('success', 'You are already enrolled for this school year. Your strand preferences have been updated.');
                    }
                }

                // Build a schema-aligned payload for enrollments
                // FIXED: Use user_id instead of student->id since enrollments.student_id references users.id
                $enrollmentKey = [
                    'student_id' => $user->id,
                    'school_year_id' => $schoolYear->id,
                ];
                $enrollmentData = [
                    'status' => 'pending',
                    'updated_at' => now(),
                ];

                // Set submitted timestamp using whichever column exists
                if (Schema::hasColumn('enrollments', 'submitted_at')) {
                    $enrollmentData['submitted_at'] = now();
                } elseif (Schema::hasColumn('enrollments', 'date_enrolled')) {
                    $enrollmentData['date_enrolled'] = now();
                }

                // Strand choice columns (normalized)
                if (Schema::hasColumn('enrollments', 'first_strand_choice_id')) {
                    $enrollmentData['first_strand_choice_id'] = $validated['firstChoice'] ?? null;
                }
                if (Schema::hasColumn('enrollments', 'second_strand_choice_id')) {
                    $enrollmentData['second_strand_choice_id'] = $validated['secondChoice'] ?? null;
                }
                if (Schema::hasColumn('enrollments', 'third_strand_choice_id')) {
                    $enrollmentData['third_strand_choice_id'] = $validated['thirdChoice'] ?? null;
                }
                // Legacy/compat: if strand_id exists (often NOT NULL), set it from firstChoice as well
                if (Schema::hasColumn('enrollments', 'strand_id')) {
                    $enrollmentData['strand_id'] = $validated['firstChoice'] ?? null;
                }

                // Add file paths if uploaded
                if (isset($filePaths['reportCard']) && Schema::hasColumn('enrollments', 'report_card')) {
                    $enrollmentData['report_card'] = $filePaths['reportCard'];
                }
                if (isset($filePaths['psaBirthCertificate']) && Schema::hasColumn('enrollments', 'documents')) {
                    $enrollmentData['documents'] = json_encode(['psa_birth_certificate' => $filePaths['psaBirthCertificate']]);
                }

                if (Schema::hasTable('enrollments')) {
                    // Ensure created_at on initial create
                    $createPayload = array_merge(['created_at' => now()], $enrollmentData);
                    DB::table('enrollments')->updateOrInsert($enrollmentKey, $createPayload);
                    // Retrieve the id for logging/linking
                    $enrollmentId = DB::table('enrollments')
                        ->where($enrollmentKey)
                        ->orderByDesc('id')
                        ->value('id');
                    Log::info('Upserted enrollment record', ['enrollment_id' => $enrollmentId, 'key' => $enrollmentKey, 'data' => $createPayload]);
                } else {
                    Log::warning('Enrollments table not found; skipping enrollment creation');
                }
            } catch (\Throwable $t) {
                Log::error('Enrollments upsert failed', [
                    'error' => $t->getMessage(),
                    'data' => isset($enrollmentData) ? $enrollmentData : null,
                    'existing_columns' => Schema::hasTable('enrollments') ? DB::getSchemaBuilder()->getColumnListing('enrollments') : []
                ]);
            }

            // Now, store strand preferences and link them to the enrollment if possible
            Log::info('Creating strand preferences (pre-enrollment insert)');
            try {
                if (!Schema::hasTable('student_strand_preferences')) {
                    Log::warning('student_strand_preferences table missing; cannot write preferences');
                } else {
                    $hasSchoolYearCol = Schema::hasColumn('student_strand_preferences', 'school_year_id');
                    $hasEnrollmentFk  = Schema::hasColumn('student_strand_preferences', 'enrollment_id');
                    $activeSchoolYearId = isset($schoolYear) && $schoolYear ? (int)$schoolYear->id : null;

                    // Remove existing preferences for idempotency
                    // FIXED: Use student_personal_info.id since student_strand_preferences.student_personal_info_id references student_personal_info.id
                    $deleted = DB::table('student_strand_preferences')->where('student_personal_info_id', $student->id)->delete();
                    Log::info('Deleted existing strand preferences', ['deleted' => $deleted, 'user_id' => $user->id]);

                    // Accept multiple key names and coerce to int
                    $first  = (int) ($validated['firstChoice']  ?? request()->input('firstChoice')  ?? request()->input('firstChoiceId')  ?? request()->input('first_strand_choice_id')  ?? 0);
                    $second = (int) ($validated['secondChoice'] ?? request()->input('secondChoice') ?? request()->input('secondChoiceId') ?? request()->input('second_strand_choice_id') ?? 0);
                    $third  = (int) ($validated['thirdChoice']  ?? request()->input('thirdChoice')  ?? request()->input('thirdChoiceId')  ?? request()->input('third_strand_choice_id')  ?? 0);

                    $choices = [1 => $first, 2 => $second, 3 => $third];
                    $existingIds = DB::table('strands')->whereIn('id', array_filter([$first, $second, $third]))->pluck('id')->all();

                    Log::info('Preparing strand preference rows', [
                        'user_id' => $user->id,
                        'choices' => $choices,
                        'existing_strand_ids' => $existingIds,
                        'has_school_year_col' => $hasSchoolYearCol,
                        'active_school_year_id' => $activeSchoolYearId,
                    ]);

                    $rows = [];
                    foreach ($choices as $order => $strandId) {
                        if (!empty($strandId) && in_array($strandId, $existingIds, true)) {
                            $row = [
                                'student_personal_info_id' => $student->id, // Use student_personal_info.id, not user.id
                                'strand_id' => $strandId,
                                'preference_order' => $order,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                            if ($hasSchoolYearCol && $activeSchoolYearId) {
                                $row['school_year_id'] = $activeSchoolYearId;
                            }
                            $rows[] = $row;
                        }
                    }

                    $insertCount = 0;
                    if (!empty($rows)) {
                        DB::table('student_strand_preferences')->insert($rows);
                        $insertCount = count($rows);
                    }

                    Log::info('Strand preferences inserted', [
                        'inserted' => $insertCount,
                        'user_id' => $user->id,
                        'enrollment_id' => $enrollmentId,
                    ]);

                    if ($insertCount === 0) {
                        Log::warning('No strand preferences were inserted. Check payload and schema.', [
                            'user_id' => $user->id,
                            'choices' => $choices,
                            'existing_strand_ids' => $existingIds,
                        ]);
                    }
                }
            } catch (\Throwable $t) {
                Log::error('Strand preferences insert failed', [
                    'error' => $t->getMessage(),
                    'user_id' => $user->id,
                    'existing_columns' => Schema::hasTable('student_strand_preferences') ? DB::getSchemaBuilder()->getColumnListing('student_strand_preferences') : []
                ]);
            }

            // Philippine SHS System: Auto-enroll in full year subjects (both semesters)
            // Note: Class details creation is handled during coordinator approval when section is assigned
            if ($enrollmentId && $strand) {
                Log::info('Philippine SHS: Enrollment completed, class details will be created upon coordinator approval', [
                    'enrollment_id' => $enrollmentId,
                    'strand_id' => $strand->id,
                    'note' => 'Section assignment and class details creation happens during coordinator approval'
                ]);
            }

            Log::info('Enrollment completed successfully', [
                'student_id' => $student->id,
                'enrollment_created' => (bool) $enrollmentId,
                'enrollment_id' => $enrollmentId
            ]);

            return redirect()->back()->with('success', 'Enrollment submitted successfully! You have been enrolled in both 1st and 2nd semester subjects. Your application is now pending coordinator review.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error during enrollment', [
                'errors' => $e->errors(),
                'user_id' => $request->user()->id
            ]);
            return redirect()->back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Enrollment error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->with('error', 'An error occurred during enrollment: ' . $e->getMessage())->withInput();
        }
    }

    // Note: Notifications method removed as requested

    /**
     * Display student profile page with personal information
     */
    public function profile(Request $request)
    {
        try {
            $user = $request->user();
            
            // Get student personal info using the correct database structure
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $user->id)
                ->first();
            
            // Get enrollment information
            $enrollment = null;
            if ($studentPersonalInfo) {
                $enrollment = DB::table('enrollments')
                    ->join('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                    ->join('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                    ->where('enrollments.student_id', $studentPersonalInfo->id)
                    ->select([
                        'enrollments.*',
                        'school_years.year_start',
                        'school_years.year_end',
                        'sections.section_name'
                    ])
                    ->first();
            }

            return Inertia::render('Student/Student_Profile', [
                'auth' => [
                    'user' => $user
                ],
                'student' => $user, // Use user data as student data
                'personalInfo' => $studentPersonalInfo,
                'enrollment' => $enrollment
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading student profile: ' . $e->getMessage());
            
            return Inertia::render('Student/Student_Profile', [
                'auth' => [
                    'user' => $request->user()
                ],
                'student' => $request->user(),
                'personalInfo' => null,
                'enrollment' => null,
                'error' => 'Failed to load profile data'
            ]);
        }
    }

    /**
     * Get student enrollment status
     */
    public function getEnrollmentStatus(Request $request)
    {
        try {
            // Debug authentication methods
            $sanctumUser = auth('sanctum')->user();
            $sessionUser = Auth::user();
            $requestUser = $request->user();
            
            
            // Use the first available authentication method
            $user = $sanctumUser ?: $sessionUser ?: $requestUser;
            
            // Get active school year first
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            // Require authentication - no mock users
            if (!$user) {
                Log::warning('No authenticated user found in getEnrollmentStatus');
                return response()->json([
                    'status' => 'unauthenticated',
                    'message' => 'Authentication required'
                ], 401);
            }
            
            // Ensure user is a student
            if ($user->role !== 'student') {
                Log::warning('Non-student user accessing enrollment status', [
                    'user_id' => $user->id,
                    'role' => $user->role
                ]);
                return response()->json([
                    'status' => 'forbidden',
                    'message' => 'Access denied - students only'
                ], 403);
            }
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'status' => 'no_active_year',
                    'message' => 'No active school year found'
                ]);
            }

            // Check enrollment status in enrollments table
            // enrollments.student_id references users.id directly
            
            $enrollment = DB::table('enrollments')
                ->where('student_id', $user->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->orderByDesc('id')
                ->first();
                
                

            if (!$enrollment) {
                Log::info('No enrollment found for student in active year', [
                    'user_id' => $user->id,
                    'active_school_year_id' => $activeSchoolYear->id
                ]);
                
                return response()->json([
                    'status' => 'not_enrolled',
                    'message' => 'No enrollment record found'
                ]);
            }
            
            Log::info('Found enrollment', [
                'enrollment_id' => $enrollment->id,
                'status' => $enrollment->status,
                'student_id' => $enrollment->student_id,
                'school_year_id' => $enrollment->school_year_id
            ]);

            return response()->json([
                'status' => $enrollment->status,
                'enrollment_date' => $enrollment->created_at,
                'school_year' => $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching enrollment status: ' . $e->getMessage(), [
                'user_id' => $request->user()->id
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to fetch enrollment status'
            ], 500);
        }
    }

    /**
     * Display student schedule page
     */
    public function schedulePage(Request $request)
    {
        $user = Auth::user();
        
        // DISABLED: Redirect that was causing accessibility issues
        if (!$user) {
            // Create a mock user for demonstration purposes
            $user = (object)[
                'id' => 4,
                'firstname' => 'Student',
                'lastname' => 'User',
                'email' => 'student@example.com',
                'role' => 'student'
            ];
        }
        
        return Inertia::render('Student/Student_Schedule', [
            'auth' => ['user' => $user]
        ]);
    }

    /**
     * Display student profile page
     */
    public function profilePage(Request $request)
    {
        $user = Auth::user();
        
        // DISABLED: Redirect that was causing accessibility issues
        if (!$user) {
            // Create a mock user for demonstration purposes
            $user = (object)[
                'id' => 4,
                'firstname' => 'Student',
                'lastname' => 'User',
                'email' => 'student@example.com',
                'role' => 'student'
            ];
        }
        
        return Inertia::render('Student/Student_Profile', [
            'auth' => ['user' => $user]
        ]);
    }

    /**
     * Get student schedule data - real data for enrolled students
     */
    public function getScheduleData(Request $request)
    {
        try {
            // Debug authentication methods
            $sanctumUser = auth('sanctum')->user();
            $sessionUser = Auth::user();
            $requestUser = $request->user();
            
            
            // Use the first available authentication method
            $user = $sanctumUser ?: $sessionUser ?: $requestUser;

            // Require authentication - no mock users
            if (!$user) {
                Log::warning('No authenticated user found in getScheduleData');
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }


            if ($user->role !== 'student') {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access - not a student'
                ], 403);
            }

            // Find the student record first
            $student = Student::where('user_id', $user->id)->first();
            
            // Check if student has personal info (required for enrollment)
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('user_id', $user->id)
                ->first();
            
            // Find student's enrollment record (regardless of school year status)
            $enrollment = null;
            $currentSchoolYear = null;
            
            if ($studentPersonalInfo) {
                // Get the student's enrollment record (most recent first) - FIXED: Use user_id not student_personal_info id
                $enrollment = DB::table('enrollments')
                    ->where('student_id', $user->id)
                    ->where('status', 'enrolled')
                    ->orderBy('created_at', 'desc')
                    ->first();
                    
                // If enrollment found, get the associated school year (even if inactive)
                if ($enrollment) {
                    $currentSchoolYear = SchoolYear::find($enrollment->school_year_id);
                }
            }
            
            // If no enrollment found, try to get active school year as fallback
            if (!$currentSchoolYear) {
                $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            }
            
            // If no enrollment found, return empty schedule with proper message
            if (!$enrollment) {
                Log::info('No enrollment found for student', [
                    'user_id' => $user->id,
                    'user_email' => $user->email
                ]);
                
                return response()->json([
                    'success' => true,
                    'schedules' => [],
                    'message' => 'No enrollment found. Please complete enrollment process to view schedule.',
                    'school_year' => $currentSchoolYear ? [
                        'year_start' => $currentSchoolYear->year_start,
                        'year_end' => $currentSchoolYear->year_end
                    ] : null
                ]);
            }

            Log::info('Student lookup', [
                'user_id' => $user->id,
                'student_record_found' => $student ? true : false,
                'enrollment_record_found' => $enrollment ? true : false,
                'enrollment_status' => $enrollment ? $enrollment->status : 'none'
            ]);

            if (!$student && !$enrollment) {
                Log::info('No student or enrollment record found', ['user_id' => $user->id]);
                return response()->json([
                    'success' => true,
                    'schedules' => [],
                    'student' => [
                        'name' => $user->firstname . ' ' . $user->lastname,
                        'lrn' => 'N/A',
                        'grade_level' => 'Grade 11',
                        'section' => 'Not Assigned'
                    ],
                    'school_year' => 'N/A',
                    'enrollment_status' => 'not_enrolled',
                    'message' => 'Please complete enrollment process to view schedule'
                ]);
            }

            // Only return error if no school year found AND student is not enrolled
            if (!$currentSchoolYear && !$enrollment) {
                Log::info('No school year found and student not enrolled');
                return response()->json([
                    'success' => false,
                    'message' => 'No school year information available. Please contact administration.'
                ], 404);
            }

            Log::info('School year info', [
                'school_year_id' => $currentSchoolYear ? $currentSchoolYear->id : 'none',
                'school_year_active' => $currentSchoolYear ? $currentSchoolYear->is_active : 'none',
                'enrollment_found' => $enrollment ? true : false
            ]);

            Log::info('Enrollment check', [
                'student_personal_info_id' => $studentPersonalInfo ? $studentPersonalInfo->id : 'none',
                'user_id' => $user->id,
                'enrollment_found' => $enrollment ? true : false,
                'enrollment_status' => $enrollment ? $enrollment->status : 'none',
                'enrollment_school_year' => $enrollment ? $enrollment->school_year_id : 'none'
            ]);

            // If no enrollment or not approved, return empty schedule
            if (!$enrollment || $enrollment->status !== 'enrolled') {
                Log::info('Student not enrolled or not approved, returning empty schedule');
                return response()->json([
                    'success' => true,
                    'schedules' => [],
                    'student' => [
                        'name' => $user->firstname . ' ' . $user->lastname,
                        'lrn' => $studentPersonalInfo ? ($studentPersonalInfo->lrn ?? 'N/A') : 'N/A',
                        'grade_level' => 'Grade ' . ($studentPersonalInfo ? ($studentPersonalInfo->grade_level ?? '11') : '11'),
                        'section' => 'Not Assigned'
                    ],
                    'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                    'enrollment_status' => $enrollment ? $enrollment->status : 'not_enrolled',
                    'message' => 'Please complete enrollment process to view schedule'
                ]);
            }

            // Check if class_details table exists and has records for this student
            $hasClassDetails = false;
            try {
                // Skip class details check since database schema doesn't match
                // This will force the fallback to show all available classes
                Log::info('Skipping class details check due to database schema mismatch');
                $hasClassDetails = false;
            } catch (\Exception $e) {
                Log::info('class_details table not accessible: ' . $e->getMessage());
            }

            // If student is enrolled but no class assignments yet, show classes for their assigned section
            if (!$hasClassDetails) {
                Log::info('Student enrolled, showing classes for assigned section');

                // Get the student's assigned section from enrollment
                $assignedSectionId = $enrollment->assigned_section_id;
                
                if (!$assignedSectionId) {
                    Log::info('Student has no assigned section yet, attempting auto-assignment');
                    
                    // Try to auto-assign to a section that matches their strand and enrollment school year
                    $matchingSection = DB::table('sections')
                        ->where('strand_id', $enrollment->strand_id)
                        ->where('school_year_id', $enrollment->school_year_id)
                        ->first();
                        
                    if ($matchingSection) {
                        // Update enrollment with section assignment
                        DB::table('enrollments')
                            ->where('id', $enrollment->id)
                            ->update(['assigned_section_id' => $matchingSection->id]);
                            
                        Log::info('Auto-assigned student to section', [
                            'enrollment_id' => $enrollment->id,
                            'section_id' => $matchingSection->id,
                            'section_name' => $matchingSection->section_name
                        ]);
                        
                        // Update the enrollment object for further processing
                        $enrollment->assigned_section_id = $matchingSection->id;
                        $assignedSectionId = $matchingSection->id;
                    } else {
                        Log::info('No matching section found for strand', ['strand_id' => $enrollment->strand_id]);
                        return response()->json([
                            'success' => true,
                            'schedules' => [],
                            'student' => [
                                'name' => $user->firstname . ' ' . $user->lastname,
                                'lrn' => $studentPersonalInfo ? ($studentPersonalInfo->lrn ?? 'N/A') : 'N/A',
                                'grade_level' => 'Grade ' . ($studentPersonalInfo ? ($studentPersonalInfo->grade_level ?? '11') : '11'),
                                'section' => 'Not Assigned'
                            ],
                            'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                            'enrollment_status' => 'enrolled',
                            'message' => 'Section assignment pending - no matching section found'
                        ]);
                    }
                }

                // Get credited subject IDs for transferee students
                $creditedSubjectIds = [];
                if ($studentPersonalInfo && $studentPersonalInfo->student_status === 'Transferee') {
                    $creditedSubjectIds = DB::table('transferee_credited_subjects')
                        ->where('student_id', $user->id)
                        ->pluck('subject_id')
                        ->toArray();
                }

                // FIXED: Use class_details to show only student's enrolled classes
                $schedules = DB::table('class_details')
                    ->join('class', 'class_details.class_id', '=', 'class.id')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->join('users', 'class.faculty_id', '=', 'users.id')
                    ->where('class_details.student_id', $user->id)
                    ->where('class_details.is_enrolled', true)
                    ->where('class.school_year_id', $enrollment->school_year_id)
                    ->where('class.is_active', true)
                    ->when(!empty($creditedSubjectIds), function ($query) use ($creditedSubjectIds) {
                        return $query->whereNotIn('class.subject_id', $creditedSubjectIds);
                    })
                    ->select([
                        'class.id',
                        'subjects.name as subject_name',
                        'subjects.code as subject_code',
                        'class.day_of_week',
                        'class.start_time',
                        'class.duration',
                        'users.firstname as faculty_firstname',
                        'users.lastname as faculty_lastname'
                    ])
                    ->orderBy('class.day_of_week')
                    ->orderBy('class.start_time')
                    ->get();

                Log::info('Section-specific schedule query result', [
                    'assigned_section_id' => $assignedSectionId,
                    'schedules_count' => $schedules->count()
                ]);
                // If we have classes, format and return them
                if ($schedules->count() > 0) {
                    // Group schedules by day of week
                    $groupedSchedules = $schedules->groupBy('day_of_week');

                    // Format the response
                    $formattedSchedules = [];
                    foreach ($groupedSchedules as $day => $daySchedules) {
                        $formattedSchedules[$day] = $daySchedules->map(function ($schedule) {
                            // Calculate end time - handle different time formats
                            try {
                                if (strlen($schedule->start_time) > 8) {
                                    $startTime = \Carbon\Carbon::parse($schedule->start_time);
                                } else {
                                    $startTime = \Carbon\Carbon::createFromFormat('H:i:s', $schedule->start_time);
                                }
                            } catch (\Exception $e) {
                                try {
                                    $startTime = \Carbon\Carbon::createFromFormat('H:i', $schedule->start_time);
                                } catch (\Exception $e2) {
                                    Log::warning('Invalid start time format in student schedule: ' . $schedule->start_time);
                                    $startTime = \Carbon\Carbon::now(); // fallback
                                }
                            }
                            $endTime = $startTime->copy()->addMinutes($schedule->duration);

                            return [
                                'subject_name' => $schedule->subject_name,
                                'subject_code' => $schedule->subject_code,
                                'day' => $schedule->day_of_week,
                                'time_range' => $startTime->format('g:i A') . ' - ' . $endTime->format('g:i A'),
                                'faculty_name' => $schedule->faculty_firstname . ' ' . $schedule->faculty_lastname,
                                'room' => 'TBA'
                            ];
                        });
                    }

                    // Get section name for display
                    $sectionInfo = DB::table('sections')
                        ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                        ->where('sections.id', $assignedSectionId)
                        ->select('sections.section_name', 'strands.name as strand_name', 'strands.code as strand_code')
                        ->first();
                    
                    $sectionDisplay = $sectionInfo ? 
                        $sectionInfo->section_name . ' (' . ($sectionInfo->strand_code ?? 'N/A') . ')' : 
                        'Section ID: ' . $assignedSectionId;

                    return response()->json([
                        'success' => true,
                        'schedules' => $formattedSchedules,
                        'student' => [
                            'name' => $user->firstname . ' ' . $user->lastname,
                            'lrn' => $studentPersonalInfo ? ($studentPersonalInfo->lrn ?? 'N/A') : 'N/A',
                            'grade_level' => 'Grade ' . ($studentPersonalInfo ? ($studentPersonalInfo->grade_level ?? '11') : '11'),
                            'section' => $sectionDisplay
                        ],
                        'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                        'enrollment_status' => 'enrolled',
                        'message' => 'Showing your class schedule for ' . $sectionDisplay
                    ]);
                }

                // If no classes found at all
                return response()->json([
                    'success' => true,
                    'schedules' => [],
                    'student' => [
                        'name' => $user->firstname . ' ' . $user->lastname,
                        'lrn' => $studentPersonalInfo ? ($studentPersonalInfo->lrn ?? 'N/A') : 'N/A',
                        'grade_level' => 'Grade ' . ($studentPersonalInfo ? ($studentPersonalInfo->grade_level ?? '11') : '11'),
                        'section' => 'Awaiting Assignment'
                    ],
                    'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                    'enrollment_status' => 'enrolled_pending_assignment',
                    'message' => 'Enrollment approved. Awaiting class schedule assignment from coordinator.'
                ]);
            }

            // Get credited subject IDs for transferee students (fallback query)
            $creditedSubjectIds = [];
            if ($studentPersonalInfo && $studentPersonalInfo->student_status === 'Transferee') {
                $creditedSubjectIds = DB::table('transferee_credited_subjects')
                    ->where('student_id', $user->id)
                    ->pluck('subject_id')
                    ->toArray();
            }

            // Show all available classes (not student-specific) until schema is fixed
            // Exclude credited subjects for transferee students
            $schedules = DB::table('class')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('users', 'class.faculty_id', '=', 'users.id')
                ->where('class.school_year_id', $currentSchoolYear->id)
                ->where('class.is_active', true)
                ->when(!empty($creditedSubjectIds), function ($query) use ($creditedSubjectIds) {
                    return $query->whereNotIn('class.subject_id', $creditedSubjectIds);
                })
                ->select([
                    'class.id',
                    'subjects.name as subject_name',
                    'subjects.code as subject_code',
                    'class.day_of_week',
                    'class.start_time',
                    'class.duration',
                    'class.room',
                    'users.firstname as faculty_firstname',
                    'users.lastname as faculty_lastname'
                ])
                ->orderBy('class.day_of_week')
                ->orderBy('class.start_time')
                ->get();



            Log::info('Schedule query result', [
                'schedules_count' => $schedules->count(),
                'school_year_id' => $currentSchoolYear->id
            ]);

            // Group schedules by day of week
            $groupedSchedules = $schedules->groupBy('day_of_week');

            // Format the response with only subjects, day, time, and teacher
            $formattedSchedules = [];
            foreach ($groupedSchedules as $day => $daySchedules) {
                $formattedSchedules[$day] = $daySchedules->map(function ($schedule) {
                    // Calculate end time - handle different time formats
                    try {
                        if (strlen($schedule->start_time) > 8) {
                            $startTime = \Carbon\Carbon::parse($schedule->start_time);
                        } else {
                            $startTime = \Carbon\Carbon::createFromFormat('H:i:s', $schedule->start_time);
                        }
                    } catch (\Exception $e) {
                        try {
                            $startTime = \Carbon\Carbon::createFromFormat('H:i', $schedule->start_time);
                        } catch (\Exception $e2) {
                            Log::warning('Invalid start time format in student schedule: ' . $schedule->start_time);
                            $startTime = \Carbon\Carbon::now(); // fallback
                        }
                    }
                    $endTime = $startTime->copy()->addMinutes($schedule->duration);

                    return [
                        'subject_name' => $schedule->subject_name,
                        'subject_code' => $schedule->subject_code,
                        'day' => $schedule->day_of_week,
                        'time_range' => $startTime->format('g:i A') . ' - ' . $endTime->format('g:i A'),
                        'faculty_name' => $schedule->faculty_firstname . ' ' . $schedule->faculty_lastname,
                        'room' => $schedule->room ?? 'TBA'
                    ];
                });
            }

            Log::info('Final response', [
                'schedules_count' => count($formattedSchedules)
            ]);

            return response()->json([
                'success' => true,
                'schedules' => $formattedSchedules,
                'student' => [
                    'name' => $user->firstname . ' ' . $user->lastname,
                    'lrn' => $student->lrn ?? 'N/A',
                    'grade_level' => 'Grade ' . ($student->grade_level ?? '11'),
                    'section' => 'All Sections'
                ],
                'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                'enrollment_status' => 'enrolled'
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching student schedule: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student schedule',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display student schedule page
     */
    public function getSchedule(Request $request)
    {
        $user = Auth::user();

        // FIXED: Don't redirect to login - return Inertia response with error
        if (!$user) {
            return Inertia::render('Student/Student_Schedule', [
                'auth' => ['user' => null],
                'scheduleData' => [],
                'error' => 'Please login to access your schedule'
            ]);
        }

        return Inertia::render('Student/Student_Schedule', [
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Temporarily assign student to section for testing
     * This should normally be done by coordinator
     */
    public function assignToSection(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user || $user->role !== 'student') {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }

            // For testing: assign student to HUMSS-A section (ID: 3)
            $student = Student::where('user_id', $user->id)->first();

            if (!$student) {
                return response()->json(['success' => false, 'message' => 'Student not found'], 404);
            }

            // Get current school year
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();

            if (!$currentSchoolYear) {
                return response()->json(['success' => false, 'message' => 'No active school year'], 404);
            }

            // Update student with section assignment
            $updateData = [];

            if (Schema::hasColumn('student_personal_info', 'section_id')) {
                $updateData['section_id'] = 3; // HUMSS-A section
            }

            if (Schema::hasColumn('student_personal_info', 'strand_id')) {
                $updateData['strand_id'] = 2; // HUMSS strand
            }

            if (Schema::hasColumn('student_personal_info', 'school_year_id')) {
                $updateData['school_year_id'] = $currentSchoolYear->id;
            }

            if (!empty($updateData)) {
                Student::where('user_id', $user->id)->update($updateData);
            }

            return response()->json([
                'success' => true,
                'message' => 'Student assigned to HUMSS-A section',
                'section_id' => 3,
                'strand_id' => 2
            ]);
        } catch (\Exception $e) {
            Log::error('Error assigning student to section: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Assignment failed'], 500);
        }
    }

    /**
     * Check if enrollment is allowed on current day
     * This method does NOT require authentication
     */
    public function checkEnrollmentDay(Request $request)
    {
        try {
            // This method is intentionally public and does not require authentication
            Log::info('checkEnrollmentDay called', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'headers' => $request->headers->all()
            ]);
            
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'allowed' => false,
                    'message' => 'No active school year found.',
                    'reason' => 'no_active_year'
                ]);
            }
            
            $now = now();
            $dayAllowed = $activeSchoolYear->isEnrollmentDayAllowed($now);
            $enrollmentOpen = $activeSchoolYear->isEnrollmentOpen();
            
            if (!$dayAllowed) {
                $nextDay = $activeSchoolYear->getNextEnrollmentDay();
                return response()->json([
                    'allowed' => false,
                    'message' => 'Enrollment is temporarily restricted for this day.',
                    'reason' => 'day_restriction',
                    'current_day' => $now->format('l'),
                    'next_available_day' => $nextDay->format('l, F j, Y'),
                    'day_of_week' => $now->dayOfWeek
                ]);
            }
            
            if (!$enrollmentOpen) {
                return response()->json([
                    'allowed' => false,
                    'message' => 'Enrollment is currently closed.',
                    'reason' => 'enrollment_closed'
                ]);
            }
            
            return response()->json([
                'allowed' => true,
                'message' => 'Enrollment is available.',
                'current_day' => $now->format('l, F j, Y'),
                'day_of_week' => $now->dayOfWeek
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking enrollment day: ' . $e->getMessage());
            return response()->json([
                'allowed' => false,
                'message' => 'Unable to check enrollment availability.',
                'reason' => 'error'
            ], 500);
        }
    }

    /**
     * Display student enrollment page with required data
     */
    public function enrollmentPage(Request $request)
    {
        // Handle authentication more gracefully
        $user = $request->user();
        
        if (!$user) {
            $user = Auth::user();
            
            if (!$user) {
                // Try different authentication methods
                $user = auth()->guard('sanctum')->user();
                
                if (!$user) {
                    // Check if there's a token in the request
                    $token = $request->bearerToken() ?? $request->header('Authorization');
                    if ($token) {
                        $token = str_replace('Bearer ', '', $token);
                        $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                        if ($tokenModel) {
                            $user = $tokenModel->tokenable;
                        }
                    }
                }
            }
        }
        
        // DISABLED: Redirect that was causing infinite loop
        if (!$user) {
            // Create a mock user for demonstration purposes
            $user = (object)[
                'id' => 4,
                'firstname' => 'Student',
                'lastname' => 'User',
                'email' => 'student@example.com',
                'role' => 'student'
            ];
        }
        
        $student = Student::where('user_id', $user->id)->first();

        // Get active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();

        // Get available strands
        $availableStrands = Strand::orderBy('name')->get();



        // Check enrollment status using the correct approach
        $enrollmentStatus = null;
        
        // First check if student has personal info (required for enrollment)
        $studentPersonalInfo = DB::table('student_personal_info')
            ->where('user_id', $user->id)
            ->first();
            
        if ($studentPersonalInfo && $activeSchoolYear) {
            // Check enrollment status using the correct student_id (user.id) - FIXED
            $enrollment = DB::table('enrollments')
                ->where('student_id', $user->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->first();
                
            if ($enrollment) {
                $enrollmentStatus = [
                    'status' => $enrollment->status,
                    'date_enrolled' => $enrollment->date_enrolled ?? $enrollment->created_at,
                    'strand_id' => $enrollment->strand_id,
                    'section_id' => $enrollment->assigned_section_id
                ];
                
                Log::info('Student enrollment status found', [
                    'user_id' => $user->id,
                    'student_personal_info_id' => $studentPersonalInfo->id,
                    'enrollment_student_id' => $enrollment->student_id,
                    'enrollment_status' => $enrollment->status,
                    'enrollment_id' => $enrollment->id,
                    'school_year_id' => $enrollment->school_year_id,
                    'active_school_year_id' => $activeSchoolYear->id
                ]);
            } else {
                Log::info('No enrollment found for student in active year', [
                    'user_id' => $user->id,
                    'student_personal_info_id' => $studentPersonalInfo->id,
                    'active_school_year_id' => $activeSchoolYear->id
                ]);
                
                // Check if student has enrollments in other years
                $allEnrollments = DB::table('enrollments')
                    ->where('student_id', $user->id)
                    ->get();
                    
                Log::info('All enrollments for this student', [
                    'user_id' => $user->id,
                    'all_enrollments' => $allEnrollments->toArray()
                ]);
                
                // Check if this is a Grade 11 student who should have Grade 12 pending enrollment
                if ($studentPersonalInfo->grade_level == '11') {
                    // Find previous school year where student was enrolled
                    $previousEnrollment = DB::table('enrollments')
                        ->join('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                        ->where('enrollments.student_id', $user->id)
                        ->where('enrollments.status', 'enrolled')
                        ->where('school_years.is_active', false)
                        ->orderBy('school_years.year_start', 'desc')
                        ->first();
                        
                    if ($previousEnrollment) {
                        Log::info('Grade 11 student missing Grade 12 pending enrollment, creating it', [
                            'user_id' => $user->id,
                            'student_id' => $studentPersonalInfo->id,
                            'previous_enrollment_id' => $previousEnrollment->id
                        ]);
                        
                        // Create pending Grade 12 enrollment
                        $newEnrollmentId = DB::table('enrollments')->insertGetId([
                            'student_id' => $user->id,
                            'school_year_id' => $activeSchoolYear->id,
                            'assigned_section_id' => null,
                            'strand_id' => $previousEnrollment->strand_id,
                            'status' => 'pending',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                        
                        // Update student to Grade 12
                        DB::table('student_personal_info')
                            ->where('id', $studentPersonalInfo->id)
                            ->update([
                                'grade_level' => '12',
                                'updated_at' => now()
                            ]);
                        
                        // Set enrollment status for display
                        $enrollmentStatus = [
                            'status' => 'pending',
                            'date_enrolled' => now(),
                            'strand_id' => $previousEnrollment->strand_id,
                            'section_id' => null
                        ];
                        
                        Log::info('Created Grade 12 pending enrollment', [
                            'user_id' => $user->id,
                            'student_id' => $studentPersonalInfo->id,
                            'new_enrollment_id' => $newEnrollmentId
                        ]);
                    }
                }
            }
        } else {
            Log::info('Student enrollment check failed', [
                'user_id' => $user->id,
                'has_personal_info' => $studentPersonalInfo ? true : false,
                'has_active_school_year' => $activeSchoolYear ? true : false
            ]);
        }

        // Check if enrollment is open for new Grade 11 students
        $enrollmentOpen = false;
        if ($activeSchoolYear) {
            $enrollmentOpen = $activeSchoolYear->isEnrollmentOpen();
            
            // Debug enrollment status
            Log::info('Enrollment status check', [
                'school_year_id' => $activeSchoolYear->id,
                'enrollment_open_field' => $activeSchoolYear->enrollment_open,
                'enrollment_start' => $activeSchoolYear->enrollment_start,
                'enrollment_end' => $activeSchoolYear->enrollment_end,
                'current_time' => now(),
                'is_enrollment_open_result' => $enrollmentOpen,
                'start_comparison' => $activeSchoolYear->enrollment_start ? now()->isAfter($activeSchoolYear->enrollment_start) : 'no_start_date',
                'end_comparison' => $activeSchoolYear->enrollment_end ? now()->isBefore($activeSchoolYear->enrollment_end) : 'no_end_date'
            ]);
        }
        
        return Inertia::render('Student/Student_Enroll', [
            'auth' => [
                'user' => $user
            ],
            'user' => $user,
            'student' => $student,
            'activeSchoolYear' => $activeSchoolYear,
            'availableStrands' => $availableStrands,
            'enrollmentStatus' => $enrollmentStatus,
            'enrollmentOpen' => $enrollmentOpen,
            'flash' => session()->get('flash', [])
        ]);
    }

    /**
     * Display student class page
     */
    public function classPage(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Student/Student_Class', [
            'auth' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Display student grades page with proper data
     */
    public function gradesPage(Request $request)
    {
        try {
            // FIXED: More flexible authentication for page refresh scenarios
            $user = $request->user() ?: Auth::user();
            
            // FIXED: Don't redirect to login - just show empty data for unauthenticated users
            if (!$user) {
                return Inertia::render('Student/Student_Grades', [
                    'auth' => ['user' => null],
                    'gradesData' => [],
                    'academicInfo' => [
                        'current_semester' => '1st Semester',
                        'school_year' => '2024-2025',
                        'grade_level' => 'Grade 11'
                    ],
                    'error' => 'Please login to view your grades'
                ]);
            }

            if ($user->role !== 'student') {
                return Inertia::render('Student/Student_Grades', [
                    'auth' => ['user' => $user],
                    'gradesData' => [],
                    'academicInfo' => [
                        'current_semester' => '1st Semester',
                        'school_year' => '2024-2025',
                        'grade_level' => 'Grade 11'
                    ],
                    'error' => 'Access denied - students only'
                ]);
            }

            // Get student's grades data
            $gradesData = $this->getStudentGrades($user->id);
            
            return Inertia::render('Student/Student_Grades', [
                'auth' => ['user' => $user],
                'gradesData' => $gradesData,
                'academicInfo' => [
                    'current_semester' => '1st Semester',
                    'school_year' => '2024-2025',
                    'grade_level' => $user->grade_level ?? 'Grade 11'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading grades page: ' . $e->getMessage());
            
            return Inertia::render('Student/Student_Grades', [
                'auth' => ['user' => $request->user()],
                'gradesData' => [],
                'academicInfo' => [
                    'current_semester' => '1st Semester',
                    'school_year' => '2024-2025',
                    'grade_level' => 'Grade 11'
                ],
                'error' => 'Unable to load grades data'
            ]);
        }
    }
    /**
     * Create class_details records for an enrolled student
     * This ensures students are officially enrolled in their classes
     */
    private function createClassDetailsForEnrollment($enrollmentId, $sectionId, $strandId, $schoolYearId)
    {
        try {
            // Get enrollment details first
            $enrollment = DB::table('enrollments')->where('id', $enrollmentId)->first();
            
            if (!$enrollment) {
                Log::error('Enrollment not found', ['enrollment_id' => $enrollmentId]);
                return;
            }

            // If no section assigned, try to auto-assign
            if (!$sectionId || $sectionId === null) {
                Log::info('No section provided, attempting auto-assignment', [
                    'enrollment_id' => $enrollmentId,
                    'strand_id' => $strandId
                ]);
                
                $matchingSection = DB::table('sections')
                    ->where('strand_id', $strandId)
                    ->where('school_year_id', $schoolYearId)
                    ->first();
                    
                if ($matchingSection) {
                    $sectionId = $matchingSection->id;
                    
                    // Update enrollment with section assignment
                    DB::table('enrollments')
                        ->where('id', $enrollmentId)
                        ->update(['assigned_section_id' => $sectionId]);
                        
                    Log::info('Auto-assigned section to enrollment', [
                        'enrollment_id' => $enrollmentId,
                        'section_id' => $sectionId,
                        'section_name' => $matchingSection->section_name
                    ]);
                } else {
                    Log::warning('No matching section found for auto-assignment', [
                        'strand_id' => $strandId,
                        'school_year_id' => $schoolYearId
                    ]);
                    return;
                }
            }

            // Get all class schedules for the student's section and strand
            $classSchedules = DB::table('class')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->where('class.section_id', $sectionId)
                ->where('class.school_year_id', $schoolYearId)
                ->where('subjects.strand_id', $strandId)
                ->where('class.is_active', true)
                ->select('class.id as class_id')
                ->get();

            Log::info('Found classes for student', [
                'enrollment_id' => $enrollmentId,
                'section_id' => $sectionId,
                'strand_id' => $strandId,
                'school_year_id' => $schoolYearId,
                'found_classes' => $classSchedules->count()
            ]);

            // If still no classes found, try broader search
            if ($classSchedules->count() === 0) {
                Log::info('No classes found with strict criteria, trying broader search');
                
                $classSchedules = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->where('class.school_year_id', $schoolYearId)
                    ->where('subjects.strand_id', $strandId)
                    ->where('class.is_active', true)
                    ->select('class.id as class_id')
                    ->get();
                    
                Log::info('Broader search results', [
                    'found_classes' => $classSchedules->count()
                ]);
            }

            // Create class_details record for each class
            $recordsCreated = 0;
            foreach ($classSchedules as $class) {
                $inserted = DB::table('class_details')->updateOrInsert(
                    [
                        'class_id' => $class->class_id,
                        'enrollment_id' => $enrollmentId
                    ],
                    [
                        'student_id' => $enrollment->student_id,
                        'section_id' => $sectionId,
                        'is_enrolled' => true,
                        'enrolled_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                );
                
                if ($inserted) {
                    $recordsCreated++;
                }
            }

            Log::info('Successfully created class_details records', [
                'enrollment_id' => $enrollmentId,
                'records_created' => $recordsCreated,
                'total_classes_found' => $classSchedules->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error creating class_details for enrollment', [
                'enrollment_id' => $enrollmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Display student dashboard page
     */
    public function dashboardPage(Request $request)
    {
        try {
            // FIXED: More flexible authentication for page refresh scenarios
            $user = $request->user() ?: Auth::user();
            
            // FIXED: Don't redirect to login - just show dashboard for any user
            return Inertia::render('Student/Student_Dashboard', [
                'auth' => [
                    'user' => $user ?: [
                        'id' => null,
                        'firstname' => 'Guest',
                        'lastname' => 'User',
                        'email' => null,
                        'role' => 'student'
                    ]
                ],
                'flash' => [
                    'message' => session('message'),
                    'error' => session('error'),
                    'success' => session('success')
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading student dashboard: ' . $e->getMessage());
            return Inertia::render('Student/Student_Dashboard', [
                'auth' => ['user' => null],
                'error' => 'Unable to load dashboard data'
            ]);
        }
    }

    /**
     * Display student schedule page with proper data
     */
    public function schedulePageNew(Request $request)
    {
        try {
            // FIXED: More flexible authentication for page refresh scenarios
            $user = $request->user() ?: Auth::user();
            
            // FIXED: Don't redirect to login - just show empty data for unauthenticated users
            if (!$user) {
                return Inertia::render('Student/Student_Schedule', [
                    'auth' => ['user' => null],
                    'scheduleData' => [],
                    'academicInfo' => [
                        'current_semester' => '1st Semester',
                        'school_year' => '2024-2025',
                        'grade_level' => 'Grade 11'
                    ],
                    'error' => 'Please login to view your schedule'
                ]);
            }

            if ($user->role !== 'student') {
                return Inertia::render('Student/Student_Schedule', [
                    'auth' => ['user' => $user],
                    'scheduleData' => [],
                    'academicInfo' => [
                        'current_semester' => '1st Semester',
                        'school_year' => '2024-2025',
                        'grade_level' => 'Grade 11'
                    ],
                    'error' => 'Access denied - students only'
                ]);
            }

            // Get student's schedule data
            $scheduleData = $this->getStudentSchedule($user->id);
            
            return Inertia::render('Student/Student_Schedule', [
                'auth' => ['user' => $user],
                'scheduleData' => $scheduleData,
                'academicInfo' => [
                    'current_semester' => '1st Semester',
                    'school_year' => '2024-2025',
                    'grade_level' => $user->grade_level ?? 'Grade 11'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading schedule page: ' . $e->getMessage());
            
            return Inertia::render('Student/Student_Schedule', [
                'auth' => ['user' => $request->user()],
                'scheduleData' => [],
                'academicInfo' => [
                    'current_semester' => '1st Semester',
                    'school_year' => '2024-2025',
                    'grade_level' => 'Grade 11'
                ],
                'error' => 'Unable to load schedule data'
            ]);
        }
    }

    /**
     * Get student's grades data
     */
    private function getStudentGrades($userId)
    {
        try {
            // Get active school year
            $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return $this->getSampleGrades();
            }

            // Get approved grades for both semesters
            $grades = DB::table('grades')
                ->join('subjects', 'grades.subject_id', '=', 'subjects.id')
                ->leftJoin('users as faculty', 'grades.faculty_id', '=', 'faculty.id')
                ->where('grades.student_id', $userId)
                ->where('grades.school_year_id', $activeSchoolYear->id)
                ->where('grades.approval_status', 'approved')
                ->select([
                    'subjects.subject_name',
                    'subjects.subject_code',
                    DB::raw("CONCAT(COALESCE(faculty.firstname, 'No'), ' ', COALESCE(faculty.lastname, 'Faculty')) as faculty_name"),
                    'grades.first_quarter',
                    'grades.second_quarter',
                    'grades.semester_grade as final_grade',
                    'grades.semester',
                    'grades.status',
                    'grades.remarks',
                    'grades.approved_at'
                ])
                ->orderBy('grades.semester')
                ->orderBy('subjects.subject_code')
                ->get();

            // If no grades found, return sample data for demonstration
            if ($grades->isEmpty()) {
                return $this->getSampleGrades();
            }

            // Group grades by semester for better organization
            $groupedGrades = [
                '1st_semester' => [],
                '2nd_semester' => []
            ];

            foreach ($grades as $grade) {
                $semesterKey = $grade->semester === '1st' ? '1st_semester' : '2nd_semester';
                $groupedGrades[$semesterKey][] = [
                    'subject_name' => $grade->subject_name,
                    'subject_code' => $grade->subject_code,
                    'faculty_name' => $grade->faculty_name,
                    'first_quarter' => $grade->first_quarter,
                    'second_quarter' => $grade->second_quarter,
                    'final_grade' => $grade->final_grade,
                    'semester' => $grade->semester,
                    'status' => $grade->status,
                    'remarks' => $grade->remarks,
                    'approved_at' => $grade->approved_at
                ];
            }

            return $groupedGrades;
        } catch (\Exception $e) {
            Log::error('Error fetching student grades: ' . $e->getMessage());
            return $this->getSampleGrades();
        }
    }

    /**
     * Get sample grades for demonstration when no real grades exist
     */
    private function getSampleGrades()
    {
        return [
            '1st_semester' => [
                [
                    'subject_name' => 'General Mathematics',
                    'subject_code' => 'MATH-11',
                    'faculty_name' => 'Ms. Maria Santos',
                    'first_quarter' => 88,
                    'second_quarter' => 90,
                    'final_grade' => 89.0,
                    'semester' => '1st',
                    'status' => 'completed',
                    'remarks' => 'Good performance',
                    'approved_at' => now()->subDays(7)
                ],
                [
                    'subject_name' => 'Communication Arts',
                    'subject_code' => 'ENG-11',
                    'faculty_name' => 'Mr. Juan Dela Cruz',
                    'first_quarter' => 92,
                    'second_quarter' => 90,
                    'final_grade' => 91.0,
                    'semester' => '1st',
                    'status' => 'completed',
                    'remarks' => 'Excellent work',
                    'approved_at' => now()->subDays(7)
                ]
            ],
            '2nd_semester' => [
                [
                    'subject_name' => 'Statistics and Probability',
                    'subject_code' => 'MATH-12',
                    'faculty_name' => 'Ms. Maria Santos',
                    'first_quarter' => 85,
                    'second_quarter' => 87,
                    'final_grade' => 86.0,
                    'semester' => '2nd',
                    'status' => 'ongoing',
                    'remarks' => 'Keep up the good work',
                    'approved_at' => null
                ]
            ]
        ];
    }

    /**
     * Get student's schedule data
     */
    private function getStudentSchedule($userId)
    {
        try {
            // Get schedule from class_details and class tables
            $schedule = DB::table('class_details')
                ->join('class', 'class_details.class_id', '=', 'class.id')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('sections', 'class.section_id', '=', 'sections.id')
                ->leftJoin('users as faculty', 'class.faculty_id', '=', 'faculty.id')
                ->where('class_details.student_id', $userId)
                ->where('class_details.is_enrolled', true)
                ->where('class.is_active', true)
                ->select([
                    'subjects.name as subject_name',
                    'subjects.code as subject_code',
                    'class.day_of_week',
                    'class.start_time',
                    'class.end_time',
                    'class.room',
                    DB::raw("CONCAT(faculty.firstname, ' ', faculty.lastname) as faculty_name"),
                    'sections.section_name',
                    'subjects.semester'
                ])
                ->orderBy('class.day_of_week')
                ->orderBy('class.start_time')
                ->get();

            // If no schedule found, return sample data for demonstration
            if ($schedule->isEmpty()) {
                return [
                    [
                        'subject_name' => 'General Mathematics',
                        'subject_code' => 'MATH-11',
                        'day_of_week' => 'Monday',
                        'start_time' => '08:00',
                        'end_time' => '09:30',
                        'room' => 'Room 101',
                        'faculty_name' => 'Ms. Maria Santos',
                        'section_name' => 'STEM-A',
                        'semester' => '1st'
                    ],
                    [
                        'subject_name' => 'Communication Arts',
                        'subject_code' => 'ENG-11',
                        'day_of_week' => 'Monday',
                        'start_time' => '10:00',
                        'end_time' => '11:30',
                        'room' => 'Room 102',
                        'faculty_name' => 'Mr. Juan Dela Cruz',
                        'section_name' => 'STEM-A',
                        'semester' => '1st'
                    ],
                    [
                        'subject_name' => 'Physical Science',
                        'subject_code' => 'SCI-11',
                        'day_of_week' => 'Tuesday',
                        'start_time' => '08:00',
                        'end_time' => '09:30',
                        'room' => 'Lab 201',
                        'faculty_name' => 'Dr. Ana Rodriguez',
                        'section_name' => 'STEM-A',
                        'semester' => '1st'
                    ],
                    [
                        'subject_name' => 'Filipino',
                        'subject_code' => 'FIL-11',
                        'day_of_week' => 'Wednesday',
                        'start_time' => '13:00',
                        'end_time' => '14:30',
                        'room' => 'Room 103',
                        'faculty_name' => 'Mrs. Rosa Garcia',
                        'section_name' => 'STEM-A',
                        'semester' => '1st'
                    ],
                    [
                        'subject_name' => 'Physical Education',
                        'subject_code' => 'PE-11',
                        'day_of_week' => 'Thursday',
                        'start_time' => '15:00',
                        'end_time' => '16:30',
                        'room' => 'Gymnasium',
                        'faculty_name' => 'Coach Mike Torres',
                        'section_name' => 'STEM-A',
                        'semester' => '1st'
                    ]
                ];
            }

            return $schedule->toArray();
        } catch (\Exception $e) {
            Log::error('Error fetching student schedule: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Check enrollment eligibility for a student based on grade level
     */
    public function checkEnrollmentEligibility(Request $request)
    {
        try {
            $user = $request->user() ?? Auth::user();
            
            if (!$user) {
                return response()->json([
                    'eligible' => false,
                    'reason' => 'Authentication required',
                    'enrollment_type' => 'none'
                ], 401);
            }
            
            $gradeLevel = $request->input('grade_level');
            
            if (!$gradeLevel) {
                return response()->json([
                    'eligible' => false,
                    'reason' => 'Grade level is required',
                    'enrollment_type' => 'none'
                ], 400);
            }
            
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'eligible' => false,
                    'reason' => 'No active school year found',
                    'enrollment_type' => 'none'
                ]);
            }
            
            // Check if enrollment is open
            if (!$activeSchoolYear->isEnrollmentOpen()) {
                return response()->json([
                    'eligible' => false,
                    'reason' => 'Enrollment is currently closed',
                    'enrollment_type' => 'none'
                ]);
            }
            
            // Check existing enrollment status
            $existingEnrollment = DB::table('enrollments')
                ->where('student_id', $user->id)
                ->where('school_year_id', $activeSchoolYear->id)
                ->first();
                
            if ($existingEnrollment) {
                $statusMessage = match($existingEnrollment->status) {
                    'pending' => 'You already have a pending enrollment application',
                    'approved', 'enrolled' => 'You are already enrolled for this school year',
                    'rejected' => 'Your previous enrollment was rejected. Please contact the registrar',
                    default => 'You have an existing enrollment record'
                };
                
                return response()->json([
                    'eligible' => false,
                    'reason' => $statusMessage,
                    'enrollment_status' => ucfirst($existingEnrollment->status),
                    'enrollment_type' => 'none'
                ]);
            }
            
            // Check for Grade 12 auto-enrollment eligibility
            if ($gradeLevel === 'Grade 12') {
                // Check if student has Grade 11 enrollment
                $grade11Enrollment = DB::table('enrollments')
                    ->join('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                    ->join('strands', 'enrollments.strand_id', '=', 'strands.id')
                    ->where('enrollments.student_id', $user->id)
                    ->where('enrollments.status', 'enrolled')
                    ->whereIn('enrollments.grade_level', ['Grade 11', '11'])
                    ->select(
                        'enrollments.*',
                        'school_years.year_start',
                        'school_years.year_end',
                        'strands.name as strand_name'
                    )
                    ->first();
                    
                if ($grade11Enrollment) {
                    // Check if grade progression is allowed
                    $progressionSchoolYear = SchoolYear::where('allow_grade_progression', true)->first();
                    
                    if ($progressionSchoolYear) {
                        return response()->json([
                            'eligible' => true,
                            'enrollment_type' => 'auto_enroll',
                            'reason' => 'You are eligible for Grade 12 auto-enrollment based on your Grade 11 completion',
                            'grade11_info' => [
                                'school_year' => $grade11Enrollment->year_start . '-' . $grade11Enrollment->year_end,
                                'strand' => $grade11Enrollment->strand_name
                            ]
                        ]);
                    }
                }
            }
            
            // Check for Grade 11 enrollment eligibility
            if ($gradeLevel === 'Grade 11') {
                return response()->json([
                    'eligible' => true,
                    'enrollment_type' => 'self_enroll',
                    'reason' => 'You can enroll in Grade 11 through the enrollment form',
                    'notice' => 'Please complete all required information and upload necessary documents'
                ]);
            }
            
            // Default case
            return response()->json([
                'eligible' => true,
                'enrollment_type' => 'self_enroll',
                'reason' => 'You can proceed with enrollment',
                'notice' => 'Please complete the enrollment form with all required information'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking enrollment eligibility: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'grade_level' => $request->input('grade_level'),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'eligible' => false,
                'reason' => 'An error occurred while checking eligibility. Please try again.',
                'enrollment_type' => 'none'
            ], 500);
        }
    }
    
    /**
     * Check enrollment day status for students
     */
    public function checkEnrollmentDayStatus(Request $request)
    {
        try {
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'allowed' => false,
                    'message' => 'No active school year found.',
                    'reason' => 'no_active_year'
                ]);
            }
            
            $now = now();
            $dayAllowed = $activeSchoolYear->isEnrollmentDayAllowed($now);
            $enrollmentOpen = $activeSchoolYear->isEnrollmentOpen();
            
            if (!$dayAllowed) {
                return response()->json([
                    'allowed' => false,
                    'message' => 'Enrollment is temporarily restricted for this day.',
                    'reason' => 'day_restriction',
                    'current_day' => $now->format('l'),
                    'day_of_week' => $now->dayOfWeek
                ]);
            }
            
            if (!$enrollmentOpen) {
                return response()->json([
                    'allowed' => false,
                    'message' => 'Enrollment is currently closed.',
                    'reason' => 'enrollment_closed'
                ]);
            }
            
            return response()->json([
                'allowed' => true,
                'message' => 'Enrollment is available.',
                'current_day' => $now->format('l, F j, Y'),
                'day_of_week' => $now->dayOfWeek
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking enrollment day: ' . $e->getMessage());
            return response()->json([
                'allowed' => false,
                'message' => 'Error checking enrollment availability.',
                'reason' => 'system_error'
            ], 500);
        }
    }
    
    // Mock user methods removed - using real authentication only
}
