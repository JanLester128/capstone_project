<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentPersonalInfo;
use App\Models\Strand;
use App\Models\SchoolYear;
use App\Models\StudentStrandPreference;
use App\Models\Enrollment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Schema;

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
            $student = Student::with(['user', 'strand', 'section'])
                ->where('user_id', $user->id)
                ->first();

            if (! $student) {
                return response()->json(['message' => 'Student record not found.'], 404);
            }

            return response()->json($student);
        }

        // registrar / faculty / others with permission
        $students = Student::with(['user', 'strand', 'section'])->get();
        return response()->json($students);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $student = Student::with(['user', 'strand', 'section'])->find($id);

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
            'strandPreferences' => 'required|array|min:1|max:3',
            'strandPreferences.*' => 'exists:strands,id',
            'section_id' => 'sometimes|exists:sections,id',
        ]);

        $student->update($validated);

        return response()->json([
            'message' => 'Student updated successfully.',
            'student' => $student->load(['user', 'strand', 'section'])
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
        \Log::info('Enrollment attempt started', ['user_id' => $request->user()->id]);
        
        try {
            $user = $request->user();
            
            // Find or create the student record for the authenticated user
            $student = Student::where('user_id', $user->id)->first();
            
            if (!$student) {
                \Log::info('Creating new student record for user', ['user_id' => $user->id]);
                // Create a new student record if it doesn't exist
                $student = Student::create([
                    'user_id' => $user->id,
                    'enrollment_status' => 'pending'
                ]);
                \Log::info('Created new student record', ['student_id' => $student->id, 'user_id' => $user->id]);
            } else {
                \Log::info('Found existing student record', ['student_id' => $student->id]);
            }

            \Log::info('Starting validation', ['request_data_keys' => array_keys($request->all())]);

            $validated = $request->validate([
                'schoolYear' => 'required|string',
                'lrn' => 'required|string',
                'gradeLevel' => 'required|string',
                'nongraded' => 'nullable|string',
                'psa' => 'nullable|string',
                'lastName' => 'nullable|string', // Optional since pre-filled
                'firstName' => 'nullable|string', // Optional since pre-filled
                'middleName' => 'nullable|string', // Optional since pre-filled
                'extensionName' => 'nullable|string',
                'birthdate' => 'required|date',
                'age' => 'required|integer',
                'sex' => 'required|in:Male,Female',
                'birthPlace' => 'required|string',
                'address' => 'required|string',
                'religion' => 'nullable|string',
                'motherTongue' => 'nullable|string',
                'ipCommunity' => 'nullable|string',
                'fourPs' => 'nullable|string',
                'pwdId' => 'nullable|string',
                'lastGrade' => 'required|string',
                'lastSY' => 'nullable|string',
                // Strand preferences (using strand IDs)
                'firstChoice' => 'required|exists:strands,id',
                'secondChoice' => 'required|exists:strands,id',
                'thirdChoice' => 'required|exists:strands,id',
                // File uploads
                'psaBirthCertificate' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120',
                'reportCard' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120',
            ]);

            \Log::info('Enrollment validation passed', ['user_id' => $user->id, 'student_id' => $student->id]);

            // Handle file uploads
            $filePaths = [];
            try {
                if ($request->hasFile('psaBirthCertificate')) {
                    \Log::info('Processing PSA birth certificate upload');
                    $filePaths['psaBirthCertificate'] = $request->file('psaBirthCertificate')->store('enrollment_documents', 'public');
                    \Log::info('PSA birth certificate uploaded', ['path' => $filePaths['psaBirthCertificate']]);
                }
                if ($request->hasFile('reportCard')) {
                    \Log::info('Processing report card upload');
                    $filePaths['reportCard'] = $request->file('reportCard')->store('enrollment_documents', 'public');
                    \Log::info('Report card uploaded', ['path' => $filePaths['reportCard']]);
                }
            } catch (\Exception $e) {
                \Log::error('File upload error: ' . $e->getMessage());
                return redirect()->back()->with('error', 'File upload failed: ' . $e->getMessage())->withInput();
            }

            // Validate that required files were uploaded
            if (empty($filePaths['psaBirthCertificate']) || empty($filePaths['reportCard'])) {
                \Log::error('Required files missing', ['files' => $filePaths]);
                return redirect()->back()->withErrors([
                    'psaBirthCertificate' => empty($filePaths['psaBirthCertificate']) ? 'PSA Birth Certificate is required.' : null,
                    'reportCard' => empty($filePaths['reportCard']) ? 'Report Card is required.' : null
                ])->withInput();
            }

            // Get active school year - students can only enroll in active school year
            $schoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$schoolYear) {
                \Log::error('No active school year found');
                return redirect()->back()->with('error', 'No active school year found. Please contact the registrar to activate a school year.');
            }

            \Log::info('Found active school year', ['school_year_id' => $schoolYear->id]);

            // Find strand based on first choice (strand ID, not code)
            $strand = Strand::find($validated['firstChoice']);
            
            if (!$strand) {
                \Log::error('Strand not found', ['strand_id' => $validated['firstChoice']]);
                return redirect()->back()->withErrors(['firstChoice' => 'Selected strand not found.'])->withInput();
            }

            \Log::info('Found strand', ['strand_id' => $strand->id, 'strand_name' => $strand->name]);
            
            // Handle strand preferences - store in separate table
            $strandChoices = [
                $validated['firstChoice'],
                $validated['secondChoice'], 
                $validated['thirdChoice']
            ];
            
            \Log::info('Processing strand preferences', ['choices' => $strandChoices]);
            
            // Delete existing preferences
            $student->strandPreferences()->delete();
            
            // Create new preferences
            foreach ($strandChoices as $index => $strandId) {
                if ($strandId) {
                    try {
                        StudentStrandPreference::create([
                            'student_id' => $student->id,
                            'strand_id' => $strandId,
                            'preference_order' => $index + 1
                        ]);
                        \Log::info('Created strand preference', ['student_id' => $student->id, 'strand_id' => $strandId, 'order' => $index + 1]);
                    } catch (\Exception $e) {
                        \Log::error('Error creating strand preference: ' . $e->getMessage(), ['strand_id' => $strandId]);
                        throw $e;
                    }
                }
            }

            \Log::info('Updating student enrollment data');

            // Update student record with enrollment data (only non-personal fields)
            try {
                $student->update([
                    'strand_id' => $strand->id,
                    'school_year_id' => $schoolYear->id,
                    'enrollment_status' => 'pending'
                ]);
                \Log::info('Updated student enrollment data successfully');
            } catch (\Exception $e) {
                \Log::error('Error updating student enrollment data: ' . $e->getMessage());
                throw $e;
            }

            \Log::info('Updating student personal information');

            // Update student record with personal information (now in same table)
            try {
                $student->update([
                    'school_year' => $validated['schoolYear'],
                    'lrn' => $validated['lrn'],
                    'grade_level' => $validated['gradeLevel'],
                    'nongraded' => $validated['nongraded'] ?? null,
                    'psa' => $validated['psa'] ?? null,
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
                    'psa_birth_certificate' => $filePaths['psaBirthCertificate'] ?? null,
                    'report_card' => $filePaths['reportCard'] ?? null,
                ]);
                \Log::info('Updated student personal information successfully');
            } catch (\Exception $e) {
                \Log::error('Error updating student personal information: ' . $e->getMessage());
                throw $e;
            }

            \Log::info('Creating enrollment record');

            // Create enrollment record as main transaction
            try {
                $enrollment = new Enrollment();
                $enrollment->student_id = $student->id;  // Use student_id as shown in error
                $enrollment->school_year_id = $schoolYear->id;
                $enrollment->status = 'pending';
                $enrollment->save();
                
                \Log::info('Created enrollment record successfully', ['enrollment_id' => $enrollment->id]);
            } catch (\Exception $e) {
                \Log::error('Error creating enrollment record: ' . $e->getMessage());
                throw $e;
            }

            \Log::info('Enrollment completed successfully', [
                'student_id' => $student->id,
                'enrollment_id' => $enrollment->id,
                'strand_preferences_count' => count($strandChoices),
                'enrollment_status' => $student->enrollment_status
            ]);

            return redirect()->back()->with('success', 'Enrollment submitted successfully! Your application is now pending coordinator review.');
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error during enrollment', [
                'errors' => $e->errors(),
                'user_id' => $request->user()->id
            ]);
            return redirect()->back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            \Log::error('Enrollment error: ' . $e->getMessage(), [
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
        $student = Student::with(['strand', 'section', 'schoolYear'])
            ->where('user_id', $user->id)
            ->first();
        
        if (!$student) {
            return response()->json(['message' => 'Student record not found.'], 404);
        }

        return Inertia::render('Student/Student_Notifications', [
            'student' => $student,
            'enrollmentStatus' => [
                'status' => $student->enrollment_status,
                'strand' => $student->strand,
                'section' => $student->section
            ]
        ]);
    }

    /**
     * Display student profile page with personal information
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        $student = Student::with(['strand', 'section', 'schoolYear'])
            ->where('user_id', $user->id)
            ->first();

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
        $student = Student::with(['strand', 'section', 'schoolYear'])
            ->where('user_id', $user->id)
            ->first();

        if (!$student) {
            return response()->json([
                'status' => 'not_enrolled',
                'message' => 'Student record not found'
            ]);
        }

        return response()->json([
            'status' => $student->enrollment_status ?? 'pending',
            'strand' => $student->strand ? $student->strand->name : null,
            'section' => $student->section ? $student->section->name : null,
            'school_year' => $student->schoolYear ? $student->schoolYear->semester : null
        ]);
    }

    /**
     * Get student enrollment status and notifications
     */
    public function getNotifications(Request $request)
    {
        $user = $request->user();
        $student = Student::with(['strand', 'schoolYear'])
            ->where('user_id', $user->id)
            ->first();

        if (!$student) {
            return response()->json(['status' => 'not_found', 'notifications' => []]);
        }

        $notifications = [];
        
        // Get enrollment notifications from database
        $enrollmentNotifications = \DB::table('notifications')
            ->where('student_id', $student->id)
            ->where('type', 'enrollment')
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($enrollmentNotifications as $notification) {
            $notifications[] = [
                'id' => $notification->id,
                'type' => 'enrollment',
                'status' => $notification->status,
                'title' => $notification->title,
                'message' => $notification->message,
                'time' => \Carbon\Carbon::parse($notification->created_at)->diffForHumans(),
                'timestamp' => $notification->created_at,
                'read' => (bool) $notification->read_at,
                'priority' => $notification->priority ?? 'medium',
                'actionRequired' => (bool) $notification->action_required,
                'details' => json_decode($notification->details, true)
            ];
        }

        // Fallback: Create notification based on enrollment status if no database notifications
        if (empty($notifications)) {
            if ($student->enrollment_status === 'approved') {
                $notifications[] = [
                    'id' => 'fallback-1',
                    'type' => 'enrollment',
                    'status' => 'approved',
                    'title' => 'Pre-Enrollment Approved!',
                    'message' => 'Congratulations! Your pre-enrollment has been approved. You can now view your class schedule and subjects.',
                    'time' => 'Recently',
                    'timestamp' => now(),
                    'read' => false,
                    'priority' => 'high',
                    'actionRequired' => true,
                    'details' => [
                        'assignedStrand' => $student->strand->name ?? 'N/A',
                        'reviewedAt' => $student->reviewed_at
                    ]
                ];
            } elseif ($student->enrollment_status === 'rejected') {
                $notifications[] = [
                    'id' => 'fallback-2',
                    'type' => 'enrollment',
                    'status' => 'rejected',
                    'title' => 'Pre-Enrollment Application Update',
                    'message' => 'Your pre-enrollment application requires attention. Please contact the coordinator for more information.',
                    'time' => 'Recently',
                    'timestamp' => now(),
                    'read' => false,
                    'priority' => 'high',
                    'actionRequired' => true,
                    'details' => [
                        'coordinatorNotes' => $student->coordinator_notes,
                        'reviewedAt' => $student->reviewed_at
                    ]
                ];
            } else {
                $notifications[] = [
                    'id' => 'fallback-3',
                    'type' => 'enrollment',
                    'status' => 'pending',
                    'title' => 'Pre-Enrollment Application Submitted',
                    'message' => 'Your pre-enrollment application has been successfully submitted and is currently under coordinator review.',
                    'time' => 'Recently',
                    'timestamp' => now(),
                    'read' => false,
                    'priority' => 'medium',
                    'actionRequired' => false,
                    'details' => []
                ];
            }
        }

        return response()->json([
            'status' => $student->enrollment_status,
            'notifications' => $notifications,
            'strand' => $student->strand,
            'school_year' => $student->schoolYear
        ]);
    }

    public function getSchedule($studentId = null)
    {
        try {
            // If no studentId provided, get from authenticated user
            if (!$studentId) {
                $user = auth()->user();
                $student = Student::with(['personalInfo', 'strand', 'section'])
                    ->where('user_id', $user->id)
                    ->first();
                
                if (!$student) {
                    return Inertia::render('Student/Student_Schedule', [
                        'enrollmentStatus' => ['status' => 'not_enrolled'],
                        'corData' => null
                    ]);
                }
            } else {
                $student = Student::with(['strand', 'section'])->findOrFail($studentId);
            }
            
            // Fetch COR data from class table
            $corData = \DB::table('class')
                ->where('student_id', $student->id)
                ->where('enrollment_status', 'approved')
                ->select([
                    'subject_code',
                    'subject_name', 
                    'day_of_week',
                    'start_time',
                    'end_time',
                    'room',
                    'instructor_name',
                    'strand_name',
                    'registration_number',
                    'date_enrolled',
                    'student_name',
                    'student_lrn',
                    'grade_level',
                    'semester',
                    'school_year'
                ])
                ->get();

            // If this is a page request (no studentId), return Inertia response
            if (!$studentId) {
                if ($corData->isEmpty()) {
                    return Inertia::render('Student/Student_Schedule', [
                        'enrollmentStatus' => ['status' => $student->enrollment_status ?? 'pending'],
                        'corData' => null
                    ]);
                }

                // Group by day of week for display
                $weeklySchedule = $corData->groupBy('day_of_week')->map(function ($classes, $day) {
                    return [
                        'day' => $day,
                        'classes' => $classes->map(function ($class) {
                            return [
                                'subject' => $class->subject_name,
                                'code' => $class->subject_code,
                                'time' => date('g:i A', strtotime($class->start_time)) . ' - ' . date('g:i A', strtotime($class->end_time)),
                                'room' => $class->room,
                                'teacher' => $class->instructor_name
                            ];
                        })->toArray()
                    ];
                })->values()->toArray();

                // Get first record for student info
                $studentInfo = $corData->first();

                return Inertia::render('Student/Student_Schedule', [
                    'enrollmentStatus' => ['status' => 'approved'],
                    'corData' => [
                        'registration_number' => $studentInfo->registration_number ?? null,
                        'student_name' => $studentInfo->student_name ?? null,
                        'student_lrn' => $studentInfo->student_lrn ?? null,
                        'strand_name' => $studentInfo->strand_name ?? null,
                        'grade_level' => $studentInfo->grade_level ?? null,
                        'semester' => $studentInfo->semester ?? null,
                        'school_year' => $studentInfo->school_year ?? null,
                        'date_enrolled' => $studentInfo->date_enrolled ?? null,
                        'total_subjects' => $corData->count(),
                        'weekly_schedule' => $weeklySchedule
                    ]
                ]);
            }

            // API response for specific student ID
            if ($corData->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'enrollment_status' => $student->enrollment_status ?? 'pending',
                    'schedules' => [],
                    'student' => null,
                    'school_year' => null
                ]);
            }

            // Group schedules by day of week
            $schedulesByDay = $corData->groupBy('day_of_week')->map(function ($classes) {
                return $classes->map(function ($class) {
                    return [
                        'subject_name' => $class->subject_name,
                        'subject_code' => $class->subject_code,
                        'start_time' => date('g:i A', strtotime($class->start_time)),
                        'end_time' => date('g:i A', strtotime($class->end_time)),
                        'room' => $class->room,
                        'instructor_name' => $class->instructor_name
                    ];
                })->toArray();
            })->toArray();

            // Get first record for student info
            $studentInfo = $corData->first();

            return response()->json([
                'success' => true,
                'enrollment_status' => 'enrolled',
                'schedules' => $schedulesByDay,
                'student' => [
                    'name' => $studentInfo->student_name,
                    'lrn' => $studentInfo->student_lrn,
                    'strand' => $studentInfo->strand_name,
                    'grade_level' => $studentInfo->grade_level,
                    'semester' => $studentInfo->semester
                ],
                'school_year' => $studentInfo->school_year
            ]);

        } catch (\Exception $e) {
            \Log::error('Error fetching student schedule: ' . $e->getMessage());
            
            if (!$studentId) {
                return Inertia::render('Student/Student_Schedule', [
                    'enrollmentStatus' => ['status' => 'error'],
                    'corData' => null
                ]);
            }
            
            return response()->json([
                'success' => false,
                'enrollment_status' => 'error',
                'schedules' => [],
                'student' => null,
                'school_year' => null
            ]);
        }
    }

    public function getScheduleData(Request $request)
    {
        try {
            // Get the authenticated user
            $user = auth()->user();
            
            // Find the student record using the correct table name
            $student = \DB::table('student_personal_info')->where('user_id', $user->id)->first();
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student record not found'
                ], 404);
            }
            
            // Get current school year
            $currentSchoolYear = \DB::table('school_years')
                ->where('is_active', true)
                ->first();
                
            if (!$currentSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found'
                ], 404);
            }
            
            // Get student's enrolled classes with proper joins
            $schedules = \DB::table('class')
                ->join('class_details', 'class.id', '=', 'class_details.class_id')
                ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                ->join('users', 'class.faculty_id', '=', 'users.id')
                ->join('sections', 'class.section_id', '=', 'sections.id')
                ->where('class_details.student_id', $student->id)
                ->where('class.school_year_id', $currentSchoolYear->id)
                ->select([
                    'class.id',
                    'subjects.name as subject_name',
                    'subjects.code as subject_code',
                    'class.day_of_week',
                    'class.start_time',
                    'class.duration',
                    'users.firstname as faculty_firstname',
                    'users.lastname as faculty_lastname',
                    'sections.name as section_name'
                ])
                ->orderBy('class.day_of_week')
                ->orderBy('class.start_time')
                ->get();
            
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
                        'id' => $schedule->id,
                        'subject_name' => $schedule->subject_name,
                        'subject_code' => $schedule->subject_code,
                        'start_time' => $startTime->format('g:i A'),
                        'end_time' => $endTime->format('g:i A'),
                        'time_range' => $startTime->format('g:i A') . ' - ' . $endTime->format('g:i A'),
                        'faculty_name' => $schedule->faculty_firstname . ' ' . $schedule->faculty_lastname,
                        'section_name' => $schedule->section_name
                    ];
                });
            }
            
            // Get section name if student has section_id
            $sectionName = 'Not Assigned';
            if ($student->section_id) {
                $section = \DB::table('sections')->where('id', $student->section_id)->first();
                $sectionName = $section ? $section->name : 'Not Assigned';
            }
            
            return response()->json([
                'success' => true,
                'schedules' => $formattedSchedules,
                'student' => [
                    'name' => $user->firstname . ' ' . $user->lastname,
                    'lrn' => $student->lrn ?? 'N/A',
                    'grade_level' => 'Grade ' . ($student->grade_level ?? '11'),
                    'section' => $sectionName
                ],
                'school_year' => $currentSchoolYear->year_start . '-' . $currentSchoolYear->year_end,
                'enrollment_status' => $student->enrollment_status ?? 'pending'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching student schedule: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student schedule',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
