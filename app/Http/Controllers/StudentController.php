<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Strand;
use App\Models\SchoolYear;
use App\Models\Enrollment;
use App\Models\ClassDetail;
use App\Models\EnrollmentSubject;
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
        Log::info('Enrollment attempt started', ['user_id' => $request->user()->id]);

        try {
            $user = $request->user();

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

            Log::info('Starting validation', ['request_data_keys' => array_keys($request->all())]);

            $validated = $request->validate([
                'lrn' => 'required|string|size:12',
                'studentStatus' => 'required|string|in:New Student,Continuing,Transferee',
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
            ]);

            Log::info('Enrollment validation passed', ['user_id' => $user->id, 'student_id' => $student->id]);

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
                    'report_card' => $filePaths['reportCard'] ?? null,
                    'guardian_name' => $validated['guardianName'] ?? null,
                    'guardian_contact' => $validated['guardianContact'] ?? null,
                    'last_school' => $validated['lastSchool'] ?? null,
                ];

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
            } catch (\Exception $e) {
                Log::error('Error updating student personal information: ' . $e->getMessage());
                throw $e;
            }

            // Store enrollment data
            $enrollmentId = null;
            try {
                // Check for existing enrollment first to prevent duplicates
                $existingEnrollment = DB::table('enrollments')
                    ->where('student_id', $student->id)
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
                $enrollmentKey = [
                    'student_id' => $student->id,
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
                    $deleted = DB::table('student_strand_preferences')->where('student_id', $student->id)->delete();
                    Log::info('Deleted existing strand preferences', ['deleted' => $deleted, 'student_id' => $student->id]);

                    // Accept multiple key names and coerce to int
                    $first  = (int) ($validated['firstChoice']  ?? request()->input('firstChoice')  ?? request()->input('firstChoiceId')  ?? request()->input('first_strand_choice_id')  ?? 0);
                    $second = (int) ($validated['secondChoice'] ?? request()->input('secondChoice') ?? request()->input('secondChoiceId') ?? request()->input('second_strand_choice_id') ?? 0);
                    $third  = (int) ($validated['thirdChoice']  ?? request()->input('thirdChoice')  ?? request()->input('thirdChoiceId')  ?? request()->input('third_strand_choice_id')  ?? 0);

                    $choices = [1 => $first, 2 => $second, 3 => $third];
                    $existingIds = DB::table('strands')->whereIn('id', array_filter([$first, $second, $third]))->pluck('id')->all();

                    Log::info('Preparing strand preference rows', [
                        'student_id' => $student->id,
                        'choices' => $choices,
                        'existing_strand_ids' => $existingIds,
                        'has_school_year_col' => $hasSchoolYearCol,
                        'active_school_year_id' => $activeSchoolYearId,
                    ]);

                    $rows = [];
                    foreach ($choices as $order => $strandId) {
                        if (!empty($strandId) && in_array($strandId, $existingIds, true)) {
                            $row = [
                                'student_id' => $student->id,
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
                        'student_id' => $student->id,
                        'enrollment_id' => $enrollmentId,
                    ]);

                    if ($insertCount === 0) {
                        Log::warning('No strand preferences were inserted. Check payload and schema.', [
                            'student_id' => $student->id,
                            'choices' => $choices,
                            'existing_strand_ids' => $existingIds,
                        ]);
                    }
                }
            } catch (\Throwable $t) {
                Log::error('Strand preferences insert failed', [
                    'error' => $t->getMessage(),
                    'student_id' => $student->id,
                    'existing_columns' => Schema::hasTable('student_strand_preferences') ? DB::getSchemaBuilder()->getColumnListing('student_strand_preferences') : []
                ]);
            }

            // Philippine SHS System: Auto-enroll in full year subjects (both semesters)
            if ($enrollmentId && $strand) {
                try {
                    // Determine grade level (default to 11 for new SHS students)
                    $gradeLevel = $validated['gradeLevel'] ?? 11;
                    
                    // Auto-enroll in all subjects for the strand and grade level
                    EnrollmentSubject::autoEnrollFullYear($enrollmentId, $strand->id, $gradeLevel);
                    
                    Log::info('Philippine SHS: Auto-enrolled in full year subjects', [
                        'enrollment_id' => $enrollmentId,
                        'strand_id' => $strand->id,
                        'grade_level' => $gradeLevel
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to auto-enroll in subjects', [
                        'error' => $e->getMessage(),
                        'enrollment_id' => $enrollmentId
                    ]);
                    // Don't fail the enrollment, just log the error
                }
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
        $user = $request->user();
        $student = Student::where('user_id', $user->id)->first();

        if (!$student) {
            return response()->json([
                'status' => 'not_enrolled',
                'message' => 'Student record not found'
            ]);
        }

        // Resolve current enrollment status from enrollments table (active school year)
        $activeSy = SchoolYear::where('is_active', true)->first();
        $currentStatus = 'pending';
        if ($activeSy) {
            $latest = DB::table('enrollments')
                ->where('student_id', $student->id)
                ->where('school_year_id', $activeSy->id)
                ->orderByDesc('id')
                ->first();
            if ($latest) {
                $currentStatus = $latest->status ?? 'pending';
            }
        }

        // Get current class details for enrolled student (if approved)
        $classDetails = ClassDetail::with(['strand', 'section', 'schoolYear'])
            ->where('student_id', $student->id)
            ->when($currentStatus === 'approved', function ($q) {
                return $q->where('enrollment_status', 'approved');
            })
            ->first();

        return response()->json([
            'status' => $currentStatus,
            'strand' => $classDetails?->strand?->name,
            'section' => $classDetails?->section?->name,
            'school_year' => $classDetails?->schoolYear?->semester
        ]);
    }

    /**
     * Get student schedule data - real data for enrolled students
     */
    public function getScheduleData(Request $request)
    {
        try {
            $user = Auth::user();

            Log::info('getScheduleData called', ['user_id' => $user->id, 'role' => $user->role]);

            if (!$user || $user->role !== 'student') {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access'
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
                // Get the student's enrollment record (most recent first)
                $enrollment = DB::table('enrollments')
                    ->where('student_id', $studentPersonalInfo->id)
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

                // Show only classes for the student's assigned section and their enrollment school year
                $schedules = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->join('users', 'class.faculty_id', '=', 'users.id')
                    ->where('class.school_year_id', $enrollment->school_year_id)
                    ->where('class.section_id', $assignedSectionId)
                    ->where('class.is_active', true)
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
                            // Calculate end time
                            $startTime = \Carbon\Carbon::createFromFormat('H:i:s', $schedule->start_time);
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

            // Show all available classes (not student-specific) until schema is fixed
            $schedules = DB::table('class')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('users', 'class.faculty_id', '=', 'users.id')
                ->where('class.school_year_id', $currentSchoolYear->id)
                ->where('class.is_active', true)
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
                    // Calculate end time
                    $startTime = \Carbon\Carbon::createFromFormat('H:i:s', $schedule->start_time);
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

        if (!$user || $user->role !== 'student') {
            return redirect()->route('login')->with('error', 'Unauthorized access');
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
     * Display student enrollment page with required data
     */
    public function enrollmentPage(Request $request)
    {
        $user = $request->user();
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
            // Check enrollment status using the correct student_id (personal_info.id)
            $enrollment = DB::table('enrollments')
                ->where('student_id', $studentPersonalInfo->id)
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
                    'enrollment_status' => $enrollment->status,
                    'enrollment_id' => $enrollment->id
                ]);
            } else {
                Log::info('No enrollment found for student', [
                    'user_id' => $user->id,
                    'student_personal_info_id' => $studentPersonalInfo->id,
                    'school_year_id' => $activeSchoolYear->id
                ]);
            }
        } else {
            Log::info('Student enrollment check failed', [
                'user_id' => $user->id,
                'has_personal_info' => $studentPersonalInfo ? true : false,
                'has_active_school_year' => $activeSchoolYear ? true : false
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
}
