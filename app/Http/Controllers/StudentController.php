<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Strand;
use App\Models\SchoolYear;
use App\Models\Enrollment;
use App\Models\ClassDetail;
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
                'schoolYear' => 'required|string',
                'lrn' => 'required|digits:12',
                'studentStatus' => 'required|string|in:New Student,Continuing,Transferee',
                'gradeLevel' => 'required|string',
                'extensionName' => 'nullable|string',
                'birthdate' => 'required|date',
                'age' => 'required|integer|min:10|max:30',
                'sex' => 'required|string|in:Male,Female',
                'birthPlace' => 'required|string',
                'address' => 'required|string',
                'religion' => 'nullable|string',
                'ipCommunity' => 'nullable|string',
                'fourPs' => 'nullable|string',
                'pwdId' => 'nullable|string',
                'lastGrade' => 'required|string',
                'lastSY' => 'required|string',
                'reportCard' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120',
                'image' => 'required|file|mimes:jpeg,jpg,png|max:5120',
                'psaBirthCertificate' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:5120',
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
                
                if ($request->hasFile('image')) {
                    Log::info('Processing image upload');
                    $filePaths['image'] = $request->file('image')->store('enrollment_documents', 'public');
                    Log::info('Image uploaded', ['path' => $filePaths['image']]);
                }
            } catch (\Exception $e) {
                Log::error('File upload error: ' . $e->getMessage());
                return redirect()->back()->with('error', 'File upload failed: ' . $e->getMessage())->withInput();
            }

            // Get active school year - students can only enroll in active school year
            $schoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$schoolYear) {
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
                    'school_year' => $validated['schoolYear'],
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
                    'image' => $filePaths['image'] ?? null,
                ];

                // Include student_status only if column exists
                if (Schema::hasColumn('student_personal_info', 'student_status')) {
                    $updateData['student_status'] = $validated['studentStatus'];
                }

                // Include guardian fields only if columns exist
                if (Schema::hasColumn('student_personal_info', 'guardian_name')) {
                    $updateData['guardian_name'] = $validated['guardianName'] ?? null;
                }

                if (Schema::hasColumn('student_personal_info', 'guardian_contact')) {
                    $updateData['guardian_contact'] = $validated['guardianContact'] ?? null;
                }

                if (Schema::hasColumn('student_personal_info', 'last_school')) {
                    $updateData['last_school'] = $validated['lastSchool'] ?? null;
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
                    if ($existingEnrollment->status === 'pending') {
                        Log::info('Updating existing pending enrollment');
                        $enrollmentId = $existingEnrollment->id;
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
                                'enrollment_id' => $enrollmentId, // Add enrollment_id to link preferences to enrollment
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

            Log::info('Enrollment completed successfully', [
                'student_id' => $student->id,
                'enrollment_created' => (bool) $enrollmentId,
                'enrollment_id' => $enrollmentId
            ]);

            return redirect()->back()->with('success', 'Enrollment submitted successfully! Your application is now pending coordinator review.');
            
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

    /**
     * Display student notifications page with enrollment status
     */
    public function notifications(Request $request)
    {
        $user = $request->user();
        $student = Student::where('user_id', $user->id)->first();
        
        if (!$student) {
            return response()->json(['message' => 'Student record not found.'], 404);
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

        // Get current class details for enrolled student (if already approved)
        $classDetails = ClassDetail::with(['strand', 'section', 'schoolYear'])
            ->where('student_id', $student->id)
            ->when($currentStatus === 'approved', function($q){ return $q->where('enrollment_status', 'approved'); })
            ->first();

        return Inertia::render('Student/Student_Notifications', [
            'student' => $student,
            'enrollmentStatus' => [
                'status' => $currentStatus,
                'strand' => $classDetails?->strand,
                'section' => $classDetails?->section
            ]
        ]);
    }

    /**
     * Display student profile page with personal information
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        $student = Student::where('user_id', $user->id)->first();

        return Inertia::render('Student/Student_Profile', [
            'auth' => [
                'user' => $user
            ],
            'student' => $student,
            'personalInfo' => $student // Personal info is now part of student model
        ]);
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
            ->when($currentStatus === 'approved', function($q){ return $q->where('enrollment_status', 'approved'); })
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
            
            // Find the student record
            $student = Student::where('user_id', $user->id)->first();
            
            if (!$student) {
                Log::info('Student record not found', ['user_id' => $user->id]);
                return response()->json([
                    'success' => false,
                    'message' => 'Student record not found'
                ], 404);
            }
            
            // Get current school year
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
                
            if (!$currentSchoolYear) {
                Log::info('No active school year found');
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found'
                ], 404);
            }
            
            Log::info('Active school year found', ['school_year_id' => $currentSchoolYear->id]);
            
            // First, check if the student has any enrollment record
            $enrollment = DB::table('enrollments')
                ->where('student_id', $student->id)
                ->where('school_year_id', $currentSchoolYear->id)
                ->first();
            
            Log::info('Enrollment check', [
                'student_id' => $student->id,
                'user_id' => $user->id,
                'enrollment_found' => $enrollment ? true : false,
                'enrollment_status' => $enrollment ? $enrollment->status : 'none'
            ]);
            
            // If no enrollment or not approved, return empty schedule
            if (!$enrollment || $enrollment->status !== 'enrolled') {
                Log::info('Student not enrolled or not approved, returning empty schedule');
                return response()->json([
                    'success' => true,
                    'schedules' => [],
                    'student' => [
                        'name' => $user->firstname . ' ' . $user->lastname,
                        'lrn' => $student->lrn ?? 'N/A',
                        'grade_level' => 'Grade ' . ($student->grade_level ?? '11'),
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
                $classDetailsCount = DB::table('class_details')
                    ->where('student_id', $user->id)
                    ->where('is_enrolled', true)
                    ->count();
                $hasClassDetails = $classDetailsCount > 0;
                
                Log::info('Class details check', [
                    'has_class_details' => $hasClassDetails,
                    'count' => $classDetailsCount
                ]);
            } catch (\Exception $e) {
                Log::info('class_details table not accessible: ' . $e->getMessage());
            }
            
            // If student is enrolled but no class assignments yet, show all available classes as fallback
            if (!$hasClassDetails) {
                Log::info('Student enrolled but no class assignments, showing all available classes as fallback');
                
                // Fallback: Show all available classes for the school year
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
                
                Log::info('Fallback schedule query result', [
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
                    
                    return response()->json([
                        'success' => true,
                        'schedules' => $formattedSchedules,
                        'student' => [
                            'name' => $user->firstname . ' ' . $user->lastname,
                            'lrn' => $student->lrn ?? 'N/A',
                            'grade_level' => 'Grade ' . ($student->grade_level ?? '11'),
                            'section' => 'All Available Classes'
                        ],
                        'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                        'enrollment_status' => 'enrolled',
                        'message' => 'Showing available classes. Specific assignments pending coordinator approval.'
                    ]);
                }
                
                // If no classes found at all
                return response()->json([
                    'success' => true,
                    'schedules' => [],
                    'student' => [
                        'name' => $user->firstname . ' ' . $user->lastname,
                        'lrn' => $student->lrn ?? 'N/A',
                        'grade_level' => 'Grade ' . ($student->grade_level ?? '11'),
                        'section' => 'Awaiting Assignment'
                    ],
                    'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                    'enrollment_status' => 'enrolled_pending_assignment',
                    'message' => 'Enrollment approved. Awaiting class schedule assignment from coordinator.'
                ]);
            }
            
            // Fetch only the class schedules that this specific student is enrolled in
            $schedules = DB::table('class')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('users', 'class.faculty_id', '=', 'users.id')
                ->join('class_details', 'class.id', '=', 'class_details.class_id')
                ->where('class.school_year_id', $currentSchoolYear->id)
                ->where('class.is_active', true)
                ->where('class_details.student_id', $user->id) // Filter by current student
                ->where('class_details.is_enrolled', true) // Only enrolled classes
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
        
        // Check if student already has enrollment status
        $enrollmentStatus = $student ? $student->enrollment_status : null;

        return Inertia::render('Student/Student_Enroll', [
            'auth' => [
                'user' => $user
            ],
            'user' => $user,
            'student' => $student,
            'activeSchoolYear' => $activeSchoolYear,
            'availableStrands' => $availableStrands,
            'enrollmentStatus' => $enrollmentStatus
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
