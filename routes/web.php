<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\Request;
use App\Http\Controllers\RegistrarController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\CoordinatorController;
use App\Http\Controllers\TransfereeController;
use App\Models\User;
use App\Models\TransfereeSubjectCredit;
use App\Models\StudentPersonalInfo;

// Include debug routes
require __DIR__.'/debug_enrollment.php';

// Debug routes removed - using proper logging in controllers instead

// Debug users table structure
Route::get('/debug/users-table', function() {
    $columns = DB::select('DESCRIBE users');
    return response()->json([
        'users_table_columns' => $columns
    ], 200, [], JSON_PRETTY_PRINT);
});

// Debug student report data
Route::get('/debug/student-report-data', function() {
    $activeSchoolYear = App\Models\SchoolYear::where('is_active', true)->first();
    
    $enrollments = DB::table('enrollments as e')
        ->join('users as u', 'e.student_id', '=', 'u.id')
        ->where('u.role', 'student')
        ->select('e.*', 'u.username', 'u.email')
        ->get();
    
    $studentsWithPersonalInfo = DB::table('enrollments as e')
        ->join('users as u', 'e.student_id', '=', 'u.id')
        ->join('student_personal_info as spi', 'u.id', '=', 'spi.user_id')
        ->where('u.role', 'student')
        ->select('e.*', 'u.username', 'u.email', 'spi.lrn', 'spi.student_status')
        ->get();
    
    return response()->json([
        'active_school_year' => $activeSchoolYear,
        'total_enrollments' => $enrollments->count(),
        'enrollments_sample' => $enrollments->take(3),
        'students_with_personal_info' => $studentsWithPersonalInfo->count(),
        'students_sample' => $studentsWithPersonalInfo->take(3)
    ], 200, [], JSON_PRETTY_PRINT);
});

// Debug enrollment data for student
Route::get('/debug/enrollment/{studentId}', function($studentId) {
    $currentSchoolYear = App\Models\SchoolYear::where('is_active', true)->first();
    
    $enrollments = DB::table('enrollments')
        ->where('student_id', $studentId)
        ->get();
    
    $enrollmentsWithSchoolYear = DB::table('enrollments')
        ->where('student_id', $studentId)
        ->where('school_year_id', $currentSchoolYear->id ?? 1)
        ->get();
    
    $enrollmentsWithStatus = DB::table('enrollments')
        ->where('student_id', $studentId)
        ->where('school_year_id', $currentSchoolYear->id ?? 1)
        ->whereIn('status', ['enrolled', 'approved'])
        ->get();
    
    return response()->json([
        'student_id' => $studentId,
        'current_school_year' => $currentSchoolYear,
        'all_enrollments' => $enrollments->toArray(),
        'enrollments_current_year' => $enrollmentsWithSchoolYear->toArray(),
        'enrollments_with_status' => $enrollmentsWithStatus->toArray()
    ], 200, [], JSON_PRETTY_PRINT);
});

// Debug class table data
Route::get('/debug/class-data/{sectionId}', function($sectionId) {
    $classes = DB::table('class')
        ->join('subjects', 'class.subject_id', '=', 'subjects.id')
        ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
        ->where('class.section_id', $sectionId)
        ->select([
            'class.id',
            'class.section_id',
            'class.subject_id',
            'class.faculty_id',
            'class.day_of_week',
            'class.start_time',
            'class.end_time',
            'class.school_year_id',
            'class.is_active',
            'subjects.code as subject_code',
            'subjects.name as subject_name',
            'faculty.firstname as faculty_firstname',
            'faculty.lastname as faculty_lastname'
        ])
        ->get();
    
    $classDetails = DB::table('class_details')
        ->where('class_details.section_id', $sectionId)
        ->get();
    
    return response()->json([
        'section_id' => $sectionId,
        'class_records_count' => $classes->count(),
        'class_records' => $classes->toArray(),
        'class_details_count' => $classDetails->count(),
        'class_details' => $classDetails->toArray()
    ], 200, [], JSON_PRETTY_PRINT);
});

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Root route - redirect to login
Route::get('/', function () {
    return redirect('/login');
});

// Login page route - temporarily remove guest middleware to fix redirect loops
Route::get('/login', function () {
    // Check if user is already authenticated and redirect them
    if (Auth::check()) {
        $user = Auth::user();
        $redirectUrl = match ($user->role) {
            'registrar' => '/registrar/dashboard',
            'faculty', 'coordinator' => '/faculty/dashboard',
            'student' => '/student/dashboard',
            default => '/dashboard'
        };
        return redirect($redirectUrl);
    }
    
    return Inertia::render('Auth/Login');
})->name('login');

// Login POST route - remove guest middleware to fix conflicts
Route::post('/login', [AuthController::class, 'login'])->name('login.post');

// Logout route - requires authentication
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// Auth logout route for compatibility (frontend uses /auth/logout)
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth')->name('auth.logout');






// User info endpoint for AuthManager
Route::get('/auth/user', function (Request $request) {
    $user = $request->user() ?: Auth::user();

    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'Not authenticated'
        ], 401);
    }

    return response()->json([
        'success' => true,
        'user' => [
            'id' => $user->id,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'role' => $user->role,
            'is_coordinator' => $user->is_coordinator ?? false,
            'student_type' => $user->student_type ?? null,
            'last_login_at' => $user->last_login_at
        ]
    ]);
})->name('auth.user');

// Favicon routes to prevent 404 errors
Route::get('/favicon-32x32.png', function () {
    return response('', 204); // No content response
});

Route::get('/favicon-16x16.png', function () {
    return response('', 204); // No content response
});

Route::get('/favicon.ico', function () {
    return response('', 204); // No content response
});

// COMPLETE FIX: Create all necessary data for Faculty Enrollment
 



// REGISTRAR ROUTES
Route::prefix('registrar')->middleware(['auth'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [App\Http\Controllers\RegistrarController::class, 'dashboard'])
        ->name('registrar.dashboard');
    
    // Settings (consolidated enrollment settings)
    Route::post('/school-years/{schoolYear}/enrollment-settings', [App\Http\Controllers\RegistrarController::class, 'updateEnrollmentSettings'])
        ->name('registrar.enrollment.settings.update');

    // Faculty Management (Routes moved outside auth middleware - see line 1819)
    // Routes moved outside auth middleware - see lines 1825-1827

    // Strand Management
    Route::get('/strands', [App\Http\Controllers\RegistrarController::class, 'strandsPage'])
        ->name('registrar.strands');
    Route::post('/strands', [App\Http\Controllers\RegistrarController::class, 'createStrand'])
        ->name('registrar.strands.create');
    Route::put('/strands/{id}', [App\Http\Controllers\RegistrarController::class, 'updateStrand'])
        ->name('registrar.strands.update');
    Route::delete('/strands/{id}', [App\Http\Controllers\RegistrarController::class, 'deleteStrand'])
        ->name('registrar.strands.delete');

    // Subject Management
    Route::get('/subjects', [App\Http\Controllers\RegistrarController::class, 'subjectsPage'])
        ->name('registrar.subjects');
    Route::post('/subjects', [App\Http\Controllers\RegistrarController::class, 'createSubject'])
        ->name('registrar.subjects.create');
    Route::put('/subjects/{id}', [App\Http\Controllers\RegistrarController::class, 'updateSubject'])
        ->name('registrar.subjects.update');
    Route::delete('/subjects/{id}', [App\Http\Controllers\RegistrarController::class, 'deleteSubject'])
        ->name('registrar.subjects.delete');

    // Section Management
    Route::get('/sections', [App\Http\Controllers\RegistrarController::class, 'sectionsPage'])
        ->name('registrar.sections');
    Route::post('/sections', [App\Http\Controllers\RegistrarController::class, 'createSection'])
        ->name('registrar.sections.create');
    Route::put('/sections/{id}', [App\Http\Controllers\RegistrarController::class, 'updateSection'])
        ->name('registrar.sections.update');
    Route::delete('/sections/{id}', [App\Http\Controllers\RegistrarController::class, 'deleteSection'])
        ->name('registrar.sections.delete');

    // School Year Management  
    Route::get('/school-years', [App\Http\Controllers\RegistrarController::class, 'schoolYearsPage'])
        ->name('registrar.school-years');
    // Route moved outside auth middleware - see line 1822
    // Route moved outside auth middleware - see line 1831
    Route::delete('/school-years/{id}', [App\Http\Controllers\RegistrarController::class, 'deleteSchoolYear'])
        ->name('registrar.school-years.delete');
    // Route moved outside auth middleware - see line 1841

    // Profile Management
    Route::get('/profile', [App\Http\Controllers\RegistrarController::class, 'profilePage'])
        ->name('registrar.profile');

    // Faculty/Coordinator Dashboard
    Route::get('/faculty/enrollment', [CoordinatorController::class, 'enrollmentPage'])
        ->name('faculty.enrollment');

    // Enrollment Management
    Route::get('/enrollment', [App\Http\Controllers\RegistrarController::class, 'enrollmentPage'])
        ->name('registrar.enrollment');
    Route::post('/enrollment/{id}/approve', [App\Http\Controllers\RegistrarController::class, 'approveEnrollment'])
        ->name('registrar.enrollment.approve');
    Route::post('/enrollment/{id}/reject', [App\Http\Controllers\RegistrarController::class, 'rejectEnrollment'])
        ->name('registrar.enrollment.reject');

    // Grade Approval Management
    Route::get('/grades', [App\Http\Controllers\RegistrarController::class, 'gradeApprovalPage'])
        ->name('registrar.grades');
    Route::post('/grades/approve', [App\Http\Controllers\RegistrarController::class, 'approveGrades'])
        ->name('registrar.grades.approve');
    
    // Debug route for testing
    Route::post('/grades/test', function(\Illuminate\Http\Request $request) {
        return response()->json([
            'success' => true,
            'message' => 'Test endpoint working',
            'data' => $request->all()
        ]);
    })->name('registrar.grades.test');


    // Reports
    Route::get('/reports', [App\Http\Controllers\ReportsController::class, 'registrarReports'])
        ->name('registrar.reports');
    Route::post('/reports/students', [App\Http\Controllers\ReportsController::class, 'studentsReport'])
        ->name('registrar.reports.students');
    Route::post('/reports/grades', [App\Http\Controllers\ReportsController::class, 'gradesReport'])
        ->name('registrar.reports.grades');
    Route::post('/reports/faculty-loads', [App\Http\Controllers\ReportsController::class, 'facultyLoadsReport'])
        ->name('registrar.reports.faculty-loads');

    // Additional Registrar Pages (moved back inside auth middleware)
    Route::get('/class', [App\Http\Controllers\RegistrarController::class, 'classPage'])->name('registrar.class');
    Route::get('/registrar/subjects/cor/{sectionId}', [App\Http\Controllers\RegistrarController::class, 'sectionCOR'])
        ->name('registrar.subjects.cor');
    
    // Transferee Approval Routes
    Route::get('/transferee-approvals', [App\Http\Controllers\RegistrarController::class, 'transfereeApprovals'])
        ->name('registrar.transferee.approvals');
    
    Route::post('/transferee-evaluations/{enrollment}/approve', [App\Http\Controllers\RegistrarController::class, 'approveTransfereeEvaluation'])
        ->name('registrar.transferee.approve');
    
    Route::post('/transferee-evaluations/{enrollment}/reject', [App\Http\Controllers\RegistrarController::class, 'rejectTransfereeEvaluation'])
        ->name('registrar.transferee.reject');
    Route::get('/subjects/cor/{sectionId}/{studentId?}', [App\Http\Controllers\RegistrarController::class, 'sectionCOR'])->name('registrar.section.cor');
    Route::get('/profile', [App\Http\Controllers\RegistrarController::class, 'profilePage'])->name('registrar.profile');
    Route::get('/settings', [App\Http\Controllers\RegistrarController::class, 'settingsPage'])->name('registrar.settings');
    Route::post('/settings/toggle-enrollment', [App\Http\Controllers\RegistrarController::class, 'toggleEnrollment'])->name('registrar.settings.toggle-enrollment');
    Route::get('/schedules', [App\Http\Controllers\ScheduleController::class, 'index'])->name('registrar.schedules');
    Route::get('/faculty-loads', [App\Http\Controllers\FacultyLoadController::class, 'index'])->name('registrar.faculty-loads');
    Route::get('/academic-calendar', [App\Http\Controllers\RegistrarController::class, 'academicCalendarPage'])->name('registrar.academic-calendar');
    Route::get('/summer-schedule', [App\Http\Controllers\RegistrarController::class, 'summerSchedulePage'])->name('registrar.summer-schedule');
    Route::get('/grades/pending', [App\Http\Controllers\RegistrarController::class, 'pendingGrades'])->name('registrar.grades.pending');
    Route::get('/school-years', [App\Http\Controllers\RegistrarController::class, 'schoolYearsPage'])->name('registrar.school-years');
    Route::get('/grades/students/pending', [App\Http\Controllers\RegistrarController::class, 'getStudentsWithPendingGrades'])->name('registrar.grades.students.pending');

    // Faculty Management
    Route::get('/faculty', [App\Http\Controllers\RegistrarController::class, 'facultyPage'])->name('registrar.faculty');
    Route::post('/faculty', [App\Http\Controllers\RegistrarController::class, 'createFaculty'])->name('registrar.faculty.create');
    Route::put('/faculty/{id}', [App\Http\Controllers\RegistrarController::class, 'updateFaculty'])->name('registrar.faculty.update');
    Route::delete('/faculty/{id}', [App\Http\Controllers\RegistrarController::class, 'deleteFaculty'])->name('registrar.faculty.delete');
    Route::post('/faculty/{id}/send-email', [App\Http\Controllers\RegistrarController::class, 'sendFacultyEmail'])->name('registrar.faculty.send-email');
    Route::post('/faculty/{id}/toggle-status', [App\Http\Controllers\RegistrarController::class, 'toggleFacultyStatus'])->name('registrar.faculty.toggle-status');

    // Enrolled Students Management
    Route::get('/enrolled-students', [App\Http\Controllers\RegistrarController::class, 'enrolledStudentsPage'])->name('registrar.enrolled-students');

    // School Years Management
    Route::post('/school-years', [App\Http\Controllers\RegistrarController::class, 'createSchoolYear'])->name('registrar.school-years.create');
    Route::put('/school-years/{id}', [App\Http\Controllers\RegistrarController::class, 'updateSchoolYear'])->name('registrar.school-years.update');
    Route::delete('/school-years/{id}', [App\Http\Controllers\RegistrarController::class, 'deleteSchoolYear'])->name('registrar.school-years.delete');
    Route::post('/school-years/{id}/toggle-status', [App\Http\Controllers\RegistrarController::class, 'toggleSchoolYearStatus'])->name('registrar.school-years.toggle-status');
});

// COR (Certificate of Registration) Routes
Route::middleware(['auth'])->group(function () {
    // View COR in browser
    Route::get('/cor/{studentId}', [RegistrarController::class, 'viewCOR'])
        ->name('cor.view');

    // Download COR as PDF
    Route::get('/cor/{studentId}/pdf', [RegistrarController::class, 'generateCORPDF'])
        ->name('cor.pdf');

    // API endpoint for section schedules
    Route::get('/api/sections/{sectionId}/schedules', [RegistrarController::class, 'getSectionSchedulesAPI'])
        ->name('api.section.schedules');
    
    // API endpoint for available sections (not full)
    Route::get('/api/sections/available', [RegistrarController::class, 'getAvailableSections'])
        ->name('api.sections.available');

    // Grade Input Request Management
    Route::get('/grade-input-requests', [RegistrarController::class, 'getPendingGradeInputRequests'])
        ->name('registrar.grade-input-requests');
    Route::post('/grade-input-requests/{id}/approve', [RegistrarController::class, 'approveGradeInputRequest'])
        ->name('registrar.grade-input-requests.approve');
    Route::post('/grade-input-requests/{id}/reject', [RegistrarController::class, 'rejectGradeInputRequest'])
        ->name('registrar.grade-input-requests.reject');
    Route::get('/api/grade-input-requests', [RegistrarController::class, 'getAllGradeInputRequests'])
        ->name('api.grade-input-requests');
});

// FACULTY ROUTES
Route::prefix('faculty')->middleware(['auth'])->group(function () {
    // Dashboard
    Route::get('/dashboard', function () {
        return Inertia::render('Faculty/Faculty_Dashboard');
    })->name('faculty.dashboard');

    // Faculty Pages (moved back inside auth middleware)
    Route::get('/grades', [App\Http\Controllers\FacultyController::class, 'gradesPage'])->name('faculty.grades');
    Route::get('/classes', [App\Http\Controllers\FacultyController::class, 'classesPage'])->name('faculty.classes');
    Route::get('/schedule', [App\Http\Controllers\FacultyController::class, 'schedulePage'])->name('faculty.schedule');
    Route::get('/loads', [App\Http\Controllers\FacultyController::class, 'loadDashboard'])->name('faculty.loads');
    Route::get('/semester', [App\Http\Controllers\FacultyController::class, 'semesterDashboard'])->name('faculty.semester');
    Route::get('/grade-encoding/{classId}', [App\Http\Controllers\FacultyController::class, 'gradeEncoding'])->name('faculty.grade-encoding');
    Route::get('/grade-progression', [App\Http\Controllers\FacultyController::class, 'gradeProgressionPage'])->name('faculty.grade-progression');
    Route::get('/reports', [App\Http\Controllers\FacultyReportsController::class, 'index'])->name('faculty.reports');
    Route::post('/reports/students', [App\Http\Controllers\FacultyReportsController::class, 'studentsReport'])->name('faculty.reports.students');
    Route::post('/reports/grades', [App\Http\Controllers\FacultyReportsController::class, 'gradesReport'])->name('faculty.reports.grades');

    // Grade Management
    Route::get('/semester', [App\Http\Controllers\FacultyController::class, 'semesterDashboard'])->name('faculty.semester');
    Route::get('/grade-encoding/{classId}', [App\Http\Controllers\FacultyController::class, 'gradeEncoding'])->name('faculty.grade-encoding');
    Route::post('/grades/save', [App\Http\Controllers\FacultyController::class, 'saveGrades'])->name('faculty.grades.save');
    Route::get('/grades/status', [App\Http\Controllers\FacultyController::class, 'gradeStatusOverview'])->name('faculty.grades.status');

    // Grade Input Request Management
    Route::post('/grade-input-request', [App\Http\Controllers\FacultyController::class, 'requestGradeInput'])->name('faculty.grade-input-request');
    Route::get('/grade-input-requests', [App\Http\Controllers\FacultyController::class, 'getGradeInputRequests'])->name('faculty.grade-input-requests');
    Route::get('/grade-input-permission/{classId}/{quarter}', [App\Http\Controllers\FacultyController::class, 'checkGradeInputPermission'])->name('faculty.grade-input-permission');

    // Coordinator Reports (accessible by coordinators)
    Route::middleware(['auth'])->group(function () {
        Route::get('/coordinator-reports', [App\Http\Controllers\CoordinatorReportsController::class, 'index'])->name('faculty.coordinator-reports');
        Route::post('/coordinator-reports/enrolled-students', [App\Http\Controllers\CoordinatorReportsController::class, 'enrolledStudentsReport'])->name('faculty.coordinator-reports.enrolled-students');
        Route::post('/coordinator-reports/students-by-strand', [App\Http\Controllers\CoordinatorReportsController::class, 'studentsByStrandReport'])->name('faculty.coordinator-reports.students-by-strand');
        Route::post('/coordinator-reports/students-by-section', [App\Http\Controllers\CoordinatorReportsController::class, 'studentsBySectionReport'])->name('faculty.coordinator-reports.students-by-section');
    });
});

// Check student_strand_preferences table structure
Route::get('/debug/check-strand-preferences-table', function () {
    try {
        $columns = Schema::getColumnListing('student_strand_preferences');
        $sampleData = DB::table('student_strand_preferences')->limit(3)->get();

        return response()->json([
            'table_exists' => Schema::hasTable('student_strand_preferences'),
            'columns' => $columns,
            'sample_data' => $sampleData->toArray(),
            'total_records' => DB::table('student_strand_preferences')->count()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'table_exists' => Schema::hasTable('student_strand_preferences')
        ]);
    }
});

// COMPREHENSIVE DEBUG: Check entire enrollment pipeline
Route::get('/debug/full-enrollment-debug', function () {
    $debug = [];

    // Step 1: Check active school year
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
    $debug['step1_school_year'] = [
        'found' => $activeSchoolYear ? true : false,
        'data' => $activeSchoolYear
    ];

    if (!$activeSchoolYear) {
        return response()->json(['error' => 'No active school year', 'debug' => $debug]);
    }

    // Step 2: Check total users and students
    $totalUsers = DB::table('users')->count();
    $studentUsers = DB::table('users')->where('role', 'student')->get();
    $debug['step2_users'] = [
        'total_users' => $totalUsers,
        'student_count' => $studentUsers->count(),
        'students' => $studentUsers->toArray()
    ];

    // Step 3: Check enrollments table
    $totalEnrollments = DB::table('enrollments')->count();
    $allEnrollments = DB::table('enrollments')->get();
    $debug['step3_enrollments'] = [
        'total_enrollments' => $totalEnrollments,
        'enrollments' => $allEnrollments->toArray()
    ];

    // Step 4: Test exact CoordinatorController query
    $coordinatorQuery = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('users.role', 'student')
        ->whereIn('enrollments.status', ['pending', 'approved', 'rejected', 'enrolled'])
        ->select([
            'users.id as user_id',
            'users.firstname',
            'users.lastname',
            'users.email',
            'users.student_type',
            'student_personal_info.grade_level',
            'student_personal_info.student_status',
            'student_personal_info.address',
            'enrollments.status as enrollment_status',
            'enrollments.id as enrollment_id',
            'enrollments.created_at as enrollment_date',
            'enrollments.grade_level as enrollment_grade_level',
            'enrollments.intended_grade_level'
        ])
        ->get();

    $debug['step4_coordinator_query'] = [
        'result_count' => $coordinatorQuery->count(),
        'results' => $coordinatorQuery->toArray(),
        'raw_sql' => DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->where('users.role', 'student')
            ->whereIn('enrollments.status', ['pending', 'approved', 'rejected', 'enrolled'])
            ->toSql()
    ];

    // Step 5: Check for missing student_personal_info records
    $studentsWithoutPersonalInfo = [];
    foreach ($studentUsers as $student) {
        $personalInfo = DB::table('student_personal_info')->where('user_id', $student->id)->first();
        if (!$personalInfo) {
            $studentsWithoutPersonalInfo[] = $student;
        }
    }
    $debug['step5_missing_personal_info'] = $studentsWithoutPersonalInfo;

    return response()->json([
        'summary' => [
            'active_school_year' => $activeSchoolYear ? $activeSchoolYear->id : 'NONE',
            'total_users' => $totalUsers,
            'student_users' => $studentUsers->count(),
            'total_enrollments' => $totalEnrollments,
            'coordinator_query_results' => $coordinatorQuery->count(),
            'students_missing_personal_info' => count($studentsWithoutPersonalInfo)
        ],
        'debug' => $debug
    ]);
});


// Check basic database data
Route::get('/debug/basic-data-check', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
    $totalUsers = DB::table('users')->count();
    $studentUsers = DB::table('users')->where('role', 'student')->count();
    $totalEnrollments = DB::table('enrollments')->count();
    $currentYearEnrollments = $activeSchoolYear ? DB::table('enrollments')->where('school_year_id', $activeSchoolYear->id)->count() : 0;

    return response()->json([
        'active_school_year' => $activeSchoolYear,
        'total_users' => $totalUsers,
        'student_users' => $studentUsers,
        'total_enrollments' => $totalEnrollments,
        'current_year_enrollments' => $currentYearEnrollments,
        'sample_students' => DB::table('users')->where('role', 'student')->limit(3)->get(['id', 'firstname', 'lastname', 'email', 'student_type']),
        'sample_enrollments' => DB::table('enrollments')->limit(3)->get(['id', 'student_id', 'school_year_id', 'status', 'created_at'])
    ]);
});

// Test exact CoordinatorController query
Route::get('/debug/coordinator-query', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

    if (!$activeSchoolYear) {
        return response()->json(['error' => 'No active school year found']);
    }

    // Exact same query as CoordinatorController
    $enrollments = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('users.role', 'student')
        ->whereIn('enrollments.status', ['pending', 'approved', 'rejected', 'enrolled'])
        ->select([
            'users.id as user_id',
            'users.firstname',
            'users.lastname',
            'users.email',
            'users.student_type',
            'student_personal_info.grade_level',
            'student_personal_info.student_status',
            'student_personal_info.address',
            'enrollments.status as enrollment_status',
            'enrollments.id as enrollment_id',
            'enrollments.created_at as enrollment_date',
            'enrollments.grade_level as enrollment_grade_level',
            'enrollments.intended_grade_level'
        ])
        ->orderBy('enrollments.created_at', 'desc')
        ->get();

    return response()->json([
        'active_school_year' => $activeSchoolYear,
        'query_result_count' => $enrollments->count(),
        'enrollments' => $enrollments,
        'raw_sql' => DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->where('users.role', 'student')
            ->whereIn('enrollments.status', ['pending', 'approved', 'rejected', 'enrolled'])
            ->toSql()
    ]);
});

// Check enrollment data specifically
Route::get('/debug/enrollment-data', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

    if (!$activeSchoolYear) {
        return response()->json(['error' => 'No active school year found']);
    }

    $enrollments = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('users.role', 'student')
        ->select([
            'users.id as user_id',
            'users.firstname',
            'users.lastname',
            'users.email',
            'users.student_type',
            'student_personal_info.grade_level',
            'student_personal_info.student_status',
            'enrollments.status as enrollment_status',
            'enrollments.id as enrollment_id',
            'enrollments.created_at as enrollment_date'
        ])
        ->get();

    return response()->json([
        'active_school_year' => $activeSchoolYear,
        'total_enrollments' => $enrollments->count(),
        'enrollments' => $enrollments,
        'enrollment_statuses' => $enrollments->pluck('enrollment_status')->unique(),
        'student_types' => $enrollments->pluck('student_type')->unique()
    ]);
});

// Check current auth status for debugging
Route::get('/debug/check-auth', function (Request $request) {
    return response()->json([
        'auth_check' => Auth::check(),
        'auth_user' => Auth::user() ? [
            'id' => Auth::user()->id,
            'email' => Auth::user()->email,
            'role' => Auth::user()->role
        ] : null,
        'session_id' => session()->getId(),
        'has_session_token' => session()->has('auth_token'),
        'cookie_token' => $request->cookie('auth_token') ? 'present' : 'missing',
        'session_data_keys' => array_keys(session()->all())
    ]);
});

// Test authentication status
Route::get('/debug/auth-status', function (Request $request) {
    return response()->json([
        'auth_check' => Auth::check(),
        'auth_user' => Auth::user(),
        'session_token' => session('auth_token'),
        'cookie_token' => $request->cookie('auth_token'),
        'bearer_token' => $request->bearerToken(),
        'session_id' => session()->getId(),
        'session_data' => session()->all()
    ]);
});

// Fix faculty password status
Route::get('/debug/fix-faculty-passwords', function () {
    $facultyUsers = DB::table('users')
        ->where('role', 'faculty')
        ->orWhere('role', 'coordinator')
        ->get();

    $updated = 0;
    foreach ($facultyUsers as $user) {
        // Set password_changed to true for existing faculty (assume they've already changed it)
        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'password_changed' => true
            ]);
        $updated++;
    }

    return response()->json([
        'message' => 'Fixed faculty password status',
        'updated_users' => $updated,
        'faculty_users' => $facultyUsers->pluck('email')
    ]);
});

// Check users table structure
Route::get('/debug/users-structure', function () {
    $columns = Schema::getColumnListing('users');
    $sampleUser = DB::table('users')->where('role', 'faculty')->first();

    return response()->json([
        'columns' => $columns,
        'sample_faculty_user' => $sampleUser,
        'has_password_changed' => in_array('password_changed', $columns),
        'has_password_change_required' => in_array('password_change_required', $columns)
    ]);
});

// Fix enrollment data for existing records
Route::get('/debug/fix-enrollment-data', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

    // Get enrollments that might be missing the new fields
    $enrollments = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('users.role', 'student')
        ->whereNull('enrollments.grade_level') // Find records missing grade_level
        ->select('enrollments.id', 'enrollments.intended_grade_level', 'users.student_type')
        ->get();

    $updated = 0;
    foreach ($enrollments as $enrollment) {
        // Set grade_level based on intended_grade_level or default to Grade 11
        $gradeLevel = $enrollment->intended_grade_level ?: 'Grade 11';

        DB::table('enrollments')
            ->where('id', $enrollment->id)
            ->update([
                'grade_level' => $gradeLevel,
                'enrollment_method' => 'self',
                'has_grade_11_enrollment' => false,
                'cor_generated' => false
            ]);
        $updated++;
    }

    return response()->json([
        'message' => 'Fixed enrollment data',
        'updated_records' => $updated,
        'active_school_year' => $activeSchoolYear->id
    ]);
});

// Debug route for enrollment data - check what's in database
Route::get('/debug/enrollment-check', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

    $enrollments = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('users.role', 'student')
        ->select([
            'enrollments.id as enrollment_id',
            'enrollments.status',
            'enrollments.grade_level',
            'users.id as user_id',
            'users.firstname',
            'users.lastname',
            'users.student_type',
            'student_personal_info.student_status',
            'enrollments.created_at'
        ])
        ->get();

    return response()->json([
        'active_school_year' => $activeSchoolYear,
        'total_enrollments' => $enrollments->count(),
        'enrollments' => $enrollments,
        'query_used' => 'enrollments JOIN users JOIN student_personal_info WHERE school_year_id = ' . $activeSchoolYear->id
    ]);
});

// Debug route for enrollment data
Route::get('/debug/enrollment', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

    $enrollments = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('users.role', 'student')
        ->whereIn('enrollments.status', ['pending', 'approved', 'rejected', 'enrolled'])
        ->select([
            'users.id as user_id',
            'users.firstname',
            'users.lastname',
            'users.email',
            'users.student_type',
            'student_personal_info.grade_level',
            'student_personal_info.student_status',
            'student_personal_info.address',
            'enrollments.status as enrollment_status',
            'enrollments.id as enrollment_id',
            'enrollments.created_at as enrollment_date'
        ])
        ->orderBy('enrollments.created_at', 'desc')
        ->get();

    return response()->json([
        'active_school_year' => $activeSchoolYear,
        'total_enrollments' => $enrollments->count(),
        'enrollments' => $enrollments
    ]);
});

// Forgot Password Pages
Route::get('/forgot-password', [App\Http\Controllers\PasswordResetController::class, 'showForgotPasswordForm'])
    ->name('forgot.password');

Route::get('/reset-password', [App\Http\Controllers\PasswordResetController::class, 'showResetPasswordForm'])
    ->name('reset.password');

// Password Reset API Routes
Route::post('/auth/forgot-password', [App\Http\Controllers\PasswordResetController::class, 'sendResetLinkEmail'])
    ->name('password.email');

Route::post('/auth/reset-password', [App\Http\Controllers\PasswordResetController::class, 'reset'])
    ->name('password.reset');

// Registrar Register Page
Route::get('/register/registrar', fn() => Inertia::render('Auth/Login'))
    ->name('register.registrar');

/*
|--------------------------------------------------------------------------
| CSRF Cookie Route
|--------------------------------------------------------------------------
*/

// Sanctum CSRF cookie route
Route::get('/sanctum/csrf-cookie', [\Laravel\Sanctum\Http\Controllers\CsrfCookieController::class, 'show'])
    ->middleware('web');

/*
|--------------------------------------------------------------------------
| Dashboard Routes (Outside Auth Middleware for Testing)
|--------------------------------------------------------------------------
*/

// Student API routes - moved here to fix 404 errors
Route::get('/student/schedule-data', [App\Http\Controllers\StudentController::class, 'getScheduleData'])->name('student.schedule.data');
Route::get('/student/cor-schedule-data', [App\Http\Controllers\StudentController::class, 'getCORScheduleData'])->name('student.cor.schedule.data');
Route::get('/student/enrollment-status', [App\Http\Controllers\StudentController::class, 'getEnrollmentStatus'])->name('student.enrollment.status');

// FIXED: Student dashboard route - use controller method for consistent auth handling
Route::get('/student/dashboard', [App\Http\Controllers\StudentController::class, 'dashboardPage'])
    ->name('student.dashboard');

// FIXED: Student grades route - use controller method for consistent auth handling
Route::get('/student/grades', [App\Http\Controllers\StudentController::class, 'gradesPage'])
    ->name('student.grades');

// FIXED: Student schedule route - use controller method for consistent auth handling
Route::get('/student/schedule', [App\Http\Controllers\StudentController::class, 'schedulePageNew'])
    ->name('student.schedule');

// FIXED: Student enrollment routes - Enhanced with personal info and strand preferences
Route::get('/student/enrollment', [App\Http\Controllers\StudentEnrollmentController::class, 'enrollmentPage'])
    ->name('student.enrollment');

Route::post('/student/enroll', [App\Http\Controllers\StudentEnrollmentController::class, 'submitEnrollment'])
    ->name('student.enroll');

// Debug route to test enrollment controller
Route::post('/student/enroll-debug', function(Illuminate\Http\Request $request) {
    \Illuminate\Support\Facades\Log::info('Debug enrollment request received', [
        'method' => $request->method(),
        'headers' => $request->headers->all(),
        'input' => $request->except(['psa_birth_certificate', 'report_card']),
        'files' => $request->hasFile('psa_birth_certificate') ? 'PSA file present' : 'No PSA file',
        'user' => \Illuminate\Support\Facades\Auth::user() ? \Illuminate\Support\Facades\Auth::user()->id : 'No user'
    ]);
    
    try {
        return app(\App\Http\Controllers\StudentEnrollmentController::class)->submitEnrollment($request);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Debug enrollment error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json(['error' => 'Debug error: ' . $e->getMessage()], 500);
    }
})->name('student.enroll.debug');

// Faculty COR Preview Route - moved outside auth middleware to prevent loops
Route::get('/faculty/enrollments/{enrollment}/cor-preview', [App\Http\Controllers\CoordinatorController::class, 'getCORPreview'])
    ->name('faculty.enrollments.cor-preview');

// Debug route to check school years
Route::get('/debug/school-years', function () {
    $schoolYears = \App\Models\SchoolYear::all(['id', 'year_start', 'year_end', 'semester', 'start_date', 'end_date']);
    return response()->json([
        'current_date' => now()->toDateString(),
        'school_years' => $schoolYears
    ]);
});

// Debug route to test COR preview
Route::get('/debug/cor-preview/{enrollmentId}', function ($enrollmentId) {
    try {
        $controller = new \App\Http\Controllers\CoordinatorController();
        return $controller->getCORPreview($enrollmentId);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Debug COR Preview Error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
})->name('debug.cor.preview');

// API route to check COR printing status - moved outside auth middleware
Route::get('/api/cor-printing-status', function() {
    return response()->json([
        'enabled' => cache('cor_printing_enabled', true) // Default to true if not set
    ]);
});

// Coordinator Enrollment Approval Routes
Route::middleware(['auth'])->group(function () {
    Route::get('/coordinator/enrollments', [App\Http\Controllers\CoordinatorEnrollmentController::class, 'enrollmentApprovalPage'])
        ->name('coordinator.enrollments');
    
    Route::post('/coordinator/enrollments/{enrollment}/approve-and-enroll', [App\Http\Controllers\CoordinatorController::class, 'approveEnrollment'])
        ->name('coordinator.enrollments.approve');
    
    Route::get('/coordinator/enrollments/{enrollment}/student-details', [App\Http\Controllers\CoordinatorController::class, 'getStudentDetails'])
        ->name('coordinator.enrollments.student-details');
    
    Route::post('/coordinator/enrollments/{enrollment}/return', [App\Http\Controllers\CoordinatorEnrollmentController::class, 'returnEnrollment'])
        ->name('coordinator.enrollments.return');
    
    Route::post('/coordinator/enrollments/{id}/reject', [App\Http\Controllers\CoordinatorEnrollmentController::class, 'rejectEnrollment'])
        ->name('coordinator.enrollments.reject');
    
    // COR Preview route
    Route::get('/coordinator/enrollments/{enrollment}/cor-preview', [App\Http\Controllers\CoordinatorController::class, 'getCORPreview'])
        ->name('coordinator.enrollments.cor-preview');
    
    // COR Regeneration route
    Route::post('/coordinator/enrollments/{enrollment}/regenerate-cor', [App\Http\Controllers\CoordinatorController::class, 'regenerateCOR'])
        ->name('coordinator.enrollments.regenerate-cor');

    // Semester Progression routes
    Route::get('/coordinator/progression/eligible', [App\Http\Controllers\CoordinatorController::class, 'getEligibleForProgression'])
        ->name('coordinator.progression.eligible');
    Route::post('/coordinator/progression/enroll', [App\Http\Controllers\CoordinatorController::class, 'enrollSemesterProgression'])
        ->name('coordinator.progression.enroll');

    // Summer Class routes
    Route::get('/coordinator/summer-class/students', [App\Http\Controllers\CoordinatorController::class, 'getStudentsForSummerClass'])
        ->name('coordinator.summer-class.students');
    Route::post('/coordinator/summer-class/enroll', [App\Http\Controllers\CoordinatorController::class, 'enrollSummerClass'])
        ->name('coordinator.summer-class.enroll');

    // Summer Schedule Management routes
    Route::get('/registrar/summer-schedules', [App\Http\Controllers\RegistrarController::class, 'getSummerSchedules'])
        ->name('registrar.summer-schedules.get');
    Route::post('/registrar/summer-schedules', [App\Http\Controllers\RegistrarController::class, 'createSummerSchedule'])
        ->name('registrar.summer-schedules.create');
    Route::put('/registrar/summer-schedules/{id}', [App\Http\Controllers\RegistrarController::class, 'updateSummerSchedule'])
        ->name('registrar.summer-schedules.update');
    Route::delete('/registrar/summer-schedules/{id}', [App\Http\Controllers\RegistrarController::class, 'deleteSummerSchedule'])
        ->name('registrar.summer-schedules.delete');
    Route::post('/registrar/summer-schedules/update-status', [App\Http\Controllers\RegistrarController::class, 'updateSummerRequiredStatus'])
        ->name('registrar.summer-schedules.update-status');

    // Get sections for progression enrollment
    Route::get('/coordinator/sections', [App\Http\Controllers\CoordinatorController::class, 'getSections'])
        ->name('coordinator.sections');
    
    // COR Preview Route for Faculty - moved outside auth middleware to prevent loops
    
    // COR Preview Route for Registrars
    Route::get('/registrar/enrollments/{enrollment}/cor-preview', [App\Http\Controllers\RegistrarController::class, 'getCORPreview'])
        ->name('registrar.enrollments.cor-preview');
    
    // COR Printing Settings Route for Registrars
    Route::post('/registrar/cor-printing-settings', [App\Http\Controllers\RegistrarController::class, 'updateCORPrintingSettings'])
        ->name('registrar.cor.printing.settings');
    
    // API route to check COR printing status - moved outside auth middleware

    // COR (Certificate of Registration) Routes
    Route::get('/cor/{id}', [App\Http\Controllers\CORController::class, 'show'])
        ->name('cor.show');
    Route::get('/cor/{id}/print', [App\Http\Controllers\CORController::class, 'printCOR'])
        ->name('cor.print');
    Route::post('/enrollments/{id}/generate-cor', [App\Http\Controllers\CORController::class, 'generateCOR'])
        ->name('cor.generate');
    Route::post('/cor/{id}/regenerate', [App\Http\Controllers\CORController::class, 'regenerateCOR'])
        ->name('cor.regenerate');
    Route::get('/cors', [App\Http\Controllers\CORController::class, 'index'])
        ->name('cors.index');
    
    // Student COR route
    Route::get('/student/cor', [App\Http\Controllers\CORController::class, 'studentCOR'])
        ->name('student.cor');
});

// Session management page for registrars
Route::get('/registrar/sessions', function () {
    return Inertia::render('Registrar/SessionManagement');
})->name('registrar.sessions');

// Student registration routes
Route::get('/register/student', function () {
    return Inertia::render('Auth/StudentRegister');
})->name('register.student');

Route::post('/register/student', [App\Http\Controllers\AuthController::class, 'registerStudent'])
    ->name('register.student.submit');

// Email verification routes
Route::post('/auth/send-verification-code', [App\Http\Controllers\AuthController::class, 'sendVerificationCode'])
    ->name('auth.send-verification-code');

Route::post('/auth/verify-code', [App\Http\Controllers\AuthController::class, 'verifyCode'])
    ->name('auth.verify-code');

Route::post('/auth/resend-verification-code', [App\Http\Controllers\AuthController::class, 'resendVerificationCode'])
    ->name('auth.resend-verification-code');

// Enrollment Management Routes
Route::prefix('enrollment')->group(function () {
    // NOTE: Student enrollment routes are defined above outside this prefix to avoid conflicts

    // Coordinator/Registrar enrollment management routes
    Route::get('/review', [App\Http\Controllers\EnrollmentController::class, 'getEnrollmentsForReview'])
        ->name('enrollment.review');

    Route::post('/{enrollment}/approve', [App\Http\Controllers\EnrollmentController::class, 'approveEnrollment'])
        ->name('enrollment.approve');
    
    Route::post('/{enrollment}/reject', [App\Http\Controllers\EnrollmentController::class, 'rejectEnrollment'])
        ->name('enrollment.reject');
    
    Route::post('/{enrollment}/evaluate', [App\Http\Controllers\EnrollmentController::class, 'evaluateTransferee'])
        ->name('enrollment.evaluate');
    
    Route::get('/{enrollment}/evaluate', [App\Http\Controllers\EnrollmentController::class, 'showTransfereeEvaluation'])
        ->name('enrollment.evaluate.show');
    
    Route::get('/transferee/management', [App\Http\Controllers\CoordinatorController::class, 'transfereeManagement'])
        ->name('enrollment.transferee.management');
    
    Route::post('/{enrollment}/return-for-revision', [App\Http\Controllers\EnrollmentController::class, 'returnForRevision'])
        ->name('enrollment.return-revision');
    
    Route::get('/{enrollment}/history', [App\Http\Controllers\EnrollmentController::class, 'getEvaluationHistory'])
        ->name('enrollment.history');
});

/*
|--------------------------------------------------------------------------
| System Information Routes
|--------------------------------------------------------------------------
*/

// System status page (for administrators)
Route::get('/system/status', function () {
    return Inertia::render('System/Status', [
        'system_info' => [
            'status' => 'operational',
            'timestamp' => now(),
            'version' => '1.0.0',
            'environment' => app()->environment()
        ]
    ]);
})->name('system.status');

// Enrollment information page (public)
Route::get('/enrollment/info', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

    return Inertia::render('Public/EnrollmentInfo', [
        'enrollment_status' => [
            'is_open' => $activeSchoolYear ? $activeSchoolYear->isEnrollmentOpen() : false,
            'school_year' => $activeSchoolYear ? [
                'year_start' => $activeSchoolYear->year_start,
                'year_end' => $activeSchoolYear->year_end,
                'semester' => $activeSchoolYear->semester
            ] : null
        ]
    ]);
})->name('enrollment.info');

// Student API routes moved to routes/student.php to prevent conflicts



// Note: Grade progression now handled by Faculty_RoleBasedDashboard and Faculty_Grade12Enrollment

// Faculty Enrollment Page - handle auth in controller
Route::get('/faculty/enrollment', [App\Http\Controllers\CoordinatorController::class, 'enrollmentPage'])
    ->middleware('auth:sanctum')
    ->name('faculty.enrollment');

// Semester Progression Management
Route::get('/faculty/semester-progression', function () {
    return Inertia::render('Faculty/SemesterProgression');
})->middleware('auth:sanctum')->name('faculty.semester-progression');

// Note: Manual enrollment and student management routes removed - no corresponding controller methods
// Note: Progression page now integrated into role-based dashboard

// Note: Full Academic Year COR now handled by Blade views in FullAcademicYearController
// Old React component route removed - use /cor/view/{studentId} instead

// Password Change Routes - CSRF protection included by default in web.php
Route::get('/auth/change-password', function (Request $request) {
    $userType = $request->get('userType', 'faculty');
    
    return Inertia::render('Auth/ChangePassword', [
        'userType' => $userType
    ]);
})->name('auth.change-password');

Route::post('/auth/change-password', [App\Http\Controllers\AuthController::class, 'changePassword'])
    ->name('auth.change-password.submit');


/*
|--------------------------------------------------------------------------
| Protected Routes (Requires Login)
|--------------------------------------------------------------------------
*/
Route::group(['middleware' => 'auth:sanctum'], function () {

    // Current authenticated user
    Route::get('/user', fn(Request $request) => $request->user())
        ->name('user');

    // Refresh user data (for when coordinator status changes)
    Route::get('/user/refresh', function (Request $request) {
        $user = $request->user();
        if ($user) {
            // Refresh user data from database
            $user->refresh();
            return response()->json([
                'success' => true,
                'user' => $user
            ]);
        }
        return response()->json(['success' => false], 401);
    })->name('user.refresh');


    // Debug route to check database data
    Route::get('/debug/database', [App\Http\Controllers\ScheduleController::class, 'debugDatabaseData'])
        ->name('debug.database');

    // Debug route to check authentication data
    Route::get('/debug/auth', function () {
        return Inertia::render('Debug/AuthDebug');
    })->name('debug.auth');

    // Debug route to set faculty as coordinator
    Route::get('/debug/set-coordinator/{userId}', function ($userId) {
        $user = \App\Models\User::find($userId);
        if (!$user) {
            return response()->json(['error' => 'User not found']);
        }

        $user->is_coordinator = true;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'User set as coordinator',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'is_coordinator' => $user->is_coordinator
            ]
        ]);
    })->name('debug.set.coordinator');


    // Debug route for testing database schema
    Route::get('/debug-schema', function () {
        return response()->json([
            'year_column' => Schema::hasColumn('school_years', 'year'),
            'start_date_column' => Schema::hasColumn('school_years', 'start_date'),
            'end_date_column' => Schema::hasColumn('school_years', 'end_date'),
            'year_start_column' => Schema::hasColumn('school_years', 'year_start'),
            'year_end_column' => Schema::hasColumn('school_years', 'year_end'),
            'existing_records' => DB::table('school_years')->count()
        ]);
    });

    // Student routes are now handled in routes/student.php

    // Faculty Grading API Routes
    Route::prefix('faculty')->group(function () {
        Route::get('/grades/overview', [App\Http\Controllers\FacultyController::class, 'gradeStatusOverview'])->name('faculty.grades.overview');
        
        // Faculty Reports API Routes
        Route::post('/reports/students', [App\Http\Controllers\FacultyController::class, 'generateStudentListReport'])->name('faculty.reports.students');
        Route::post('/reports/grades', [App\Http\Controllers\FacultyController::class, 'generateGradesReport'])->name('faculty.reports.grades');
    });

    Route::prefix('registrar')->group(function () {

        // Schedule Management Routes (Requires Active School Year) - GET route moved outside auth middleware
        Route::prefix('schedules')->middleware(['require.active.school.year'])->group(function () {
            Route::post('/', [ScheduleController::class, 'store'])->name('registrar.schedules.store');
            Route::post('/bulk', [ScheduleController::class, 'bulkCreate'])->name('registrar.schedules.bulk');
            Route::put('/{schedule}', [ScheduleController::class, 'update'])->name('registrar.schedules.update');
            Route::delete('/{schedule}', [ScheduleController::class, 'destroy'])->name('registrar.schedules.destroy');
            Route::post('/bulk-assign', [ScheduleController::class, 'bulkAssign'])->name('registrar.schedules.bulk-assign');
            Route::get('/conflicts', [ScheduleController::class, 'checkConflicts'])->name('registrar.schedules.conflicts');
            Route::get('/check-data', [ScheduleController::class, 'checkScheduleData'])->name('registrar.schedules.check-data');
        });

        // Faculty Management (GET route moved outside auth middleware)
        // Route moved outside auth middleware - see line 1820
        // Routes moved outside auth middleware - see lines 1825-1827

        // Faculty Load Management Routes
        Route::prefix('faculty-loads')->group(function () {
            Route::post('/assign', [App\Http\Controllers\FacultyLoadController::class, 'assignLoad'])->name('registrar.faculty-loads.assign');
            Route::delete('/{classId}', [App\Http\Controllers\FacultyLoadController::class, 'removeLoad'])->name('registrar.faculty-loads.remove');
            Route::put('/{facultyId}/limit', [App\Http\Controllers\FacultyLoadController::class, 'updateLoadLimit'])->name('registrar.faculty-loads.limit');
            Route::post('/check-conflicts', [App\Http\Controllers\FacultyLoadController::class, 'checkScheduleConflicts'])->name('registrar.faculty-loads.conflicts');
        });

        // School Year Management Routes
        // Route moved outside auth middleware - see line 1822
        // Route moved outside auth middleware - see line 1831
        Route::delete('/school-years/{id}', [RegistrarController::class, 'deleteSchoolYear'])->name('registrar.school-years.delete');
        // Route moved outside auth middleware - see line 1841

        // Academic Calendar Management Routes
        Route::prefix('school-years')->group(function () {
            Route::put('/{schoolYearId}/calendar', [RegistrarController::class, 'updateAcademicCalendar'])->name('registrar.academic-calendar.update');
            Route::put('/{schoolYearId}/toggle-enrollment', [RegistrarController::class, 'toggleEnrollmentStatus'])->name('registrar.academic-calendar.toggle-enrollment');
            Route::get('/{schoolYearId}/calendar-info', [RegistrarController::class, 'getAcademicCalendarInfo'])->name('registrar.academic-calendar.info');
        });

        // Academic Calendar API Routes
        Route::get('/enrollment-periods', [RegistrarController::class, 'getEnrollmentPeriods'])->name('registrar.enrollment-periods');
        Route::get('/grading-periods/{schoolYearId?}', [RegistrarController::class, 'getGradingPeriods'])->name('registrar.grading-periods');

        // Route moved outside auth middleware - see line 1823

        // Section Management (GET route moved outside auth middleware, Requires Active School Year for creation/modification)
        Route::post('/sections', [RegistrarController::class, 'createSection'])->middleware(['require.active.school.year'])->name('registrar.sections.create');
        Route::put('/sections/{id}', [RegistrarController::class, 'updateSection'])->middleware(['require.active.school.year'])->name('registrar.sections.update');
        Route::delete('/sections/{id}', [RegistrarController::class, 'deleteSection'])->name('registrar.sections.delete');

        // Class/Subject Management (GET routes moved outside auth middleware)
        Route::post('/strands', [RegistrarController::class, 'createStrand'])->name('registrar.strands.create');
        Route::put('/strands/{id}', [RegistrarController::class, 'updateStrand'])->name('registrar.strands.update');
        Route::delete('/strands/{id}', [RegistrarController::class, 'deleteStrand'])->name('registrar.strands.delete');
        Route::post('/subjects', [RegistrarController::class, 'createSubject'])->middleware(['require.active.school.year'])->name('registrar.subjects.create');
        Route::put('/subjects/{id}', [RegistrarController::class, 'updateSubject'])->middleware(['require.active.school.year'])->name('registrar.subjects.update');
        Route::delete('/subjects/{id}', [RegistrarController::class, 'deleteSubject'])->name('registrar.subjects.delete');

        // Semester Management (GET route moved outside auth middleware)
        Route::post('/semesters', [RegistrarController::class, 'createSemester'])->name('registrar.semesters.create');
        Route::put('/semesters/{id}', [RegistrarController::class, 'updateSemester'])->name('registrar.semesters.update');
        Route::delete('/semesters/{id}', [RegistrarController::class, 'deleteSemester'])->name('registrar.semesters.delete');

        // Profile Management (GET route moved outside auth middleware)

        // School Year Status
        Route::get('/school-year-status', function () {
            return response()->json(\App\Services\SchoolYearService::getStatusForFrontend());
        })->name('registrar.school-year-status');
        Route::put('/profile', [RegistrarController::class, 'updateProfile'])->name('registrar.profile.update');

        // Grades Management - Updated for Philippine SHS (GET route moved outside auth middleware)

        // NEW: Student-based grade approval system (GET route moved outside auth middleware)
        Route::post('/grades/students/{studentId}/approve', [RegistrarController::class, 'approveStudentGrades'])->name('registrar.grades.student.approve');
        Route::post('/grades/students/{studentId}/reject', [RegistrarController::class, 'rejectStudentGrades'])->name('registrar.grades.student.reject');

        // Grade management routes (GET route moved outside auth middleware)

        // ✅ FIXED: Added missing grade approval routes
        Route::post('/grades/{gradeId}/approve', [RegistrarController::class, 'approveGrade'])->name('registrar.grades.approve');
        Route::post('/grades/{gradeId}/reject', [RegistrarController::class, 'rejectGrade'])->name('registrar.grades.reject');
        Route::post('/grades/bulk-approve', [RegistrarController::class, 'bulkApproveGrades'])->name('registrar.grades.bulk.approve');
        Route::post('/grades/bulk-reject', [RegistrarController::class, 'bulkRejectGrades'])->name('registrar.grades.bulk.reject');

        // ✅ NEW: Registrar-only grade editing
        Route::put('/grades/{gradeId}/edit', [RegistrarController::class, 'editGrade'])->name('registrar.grades.edit');


        // NEW: Semester-based subject filtering
        Route::get('/subjects/by-semester', [RegistrarController::class, 'getSubjectsBySemester'])->name('registrar.subjects.by-semester');

        // Faculty Assignment Management Routes
        Route::get('/faculty-assignments', function () {
            return Inertia::render('Registrar/Faculty');
        })->name('registrar.faculty-assignments');
        Route::get('/faculty-assignments/data', [RegistrarController::class, 'getFacultyAssignments'])->name('registrar.faculty-assignments.data');
        Route::post('/assign-adviser', [RegistrarController::class, 'assignAdviser'])->name('registrar.assign-adviser');
        Route::post('/assign-teaching', [RegistrarController::class, 'assignTeaching'])->name('registrar.assign-teaching');
        Route::delete('/remove-adviser', [RegistrarController::class, 'removeAdviser'])->name('registrar.remove-adviser');
        Route::delete('/remove-teaching', [RegistrarController::class, 'removeTeaching'])->name('registrar.remove-teaching');

        // Simplified Reports Generation Routes - Only Essential Reports
        Route::post('/reports/students', [RegistrarController::class, 'generateStudentListReport'])->name('registrar.reports.students');
        Route::post('/reports/grades', [RegistrarController::class, 'generateGradesReport'])->name('registrar.reports.grades');
        Route::post('/reports/faculty-loads', [RegistrarController::class, 'generateFacultyLoadsReport'])->name('registrar.reports.faculty-loads');
        Route::post('/reports/enrollment-analytics', [RegistrarController::class, 'getEnrollmentAnalytics'])->name('registrar.reports.enrollment-analytics');

        // School Year Management Routes (GET route moved outside auth middleware)
        // Route moved outside auth middleware - see line 1822
        Route::post('/school-years/create-full-year', [RegistrarController::class, 'createFullAcademicYear'])->name('registrar.school-years.create-full-year');
        // Route moved outside auth middleware - see line 1831
        Route::delete('/school-years/{id}', [RegistrarController::class, 'deleteSchoolYear'])->name('registrar.school-years.delete');
        Route::put('/school-years/{id}/activate', [RegistrarController::class, 'activateSchoolYear'])->name('registrar.school-years.activate');
        Route::post('/activate-school-year/{id}', [RegistrarController::class, 'activateSchoolYear'])->name('registrar.activate-school-year');
        Route::get('/check-schedule-integrity', [RegistrarController::class, 'checkScheduleIntegrity'])->name('registrar.check-schedule-integrity');
        Route::post('/clear-active-year-schedules', [RegistrarController::class, 'clearActiveYearSchedules'])->name('registrar.clear-active-year-schedules');
        Route::post('/trigger-grade12-progression', [RegistrarController::class, 'triggerGrade12Progression'])->name('registrar.trigger-grade12-progression');
        Route::get('/trigger-grade12-progression', [RegistrarController::class, 'triggerGrade12Progression'])->name('registrar.trigger-grade12-progression-get');
        Route::put('/school-years/{id}/toggle', [RegistrarController::class, 'toggleSchoolYear'])->name('registrar.school-years.toggle');
        Route::put('/school-years/deactivate-expired', [RegistrarController::class, 'deactivateExpired'])->name('registrar.school-years.deactivate-expired');
        Route::get('/school-years/status/{id?}', [RegistrarController::class, 'getSemesterStatus'])->name('registrar.school-years.status');
        Route::post('/school-years/auto-deactivate', [RegistrarController::class, 'autoDeactivateExpired'])->name('registrar.school-years.auto-deactivate');

        // Settings routes (GET route moved outside auth middleware)
        Route::get('/settings', [RegistrarController::class, 'settingsPage'])->name('registrar.settings');
        Route::post('/settings/toggle-enrollment', [RegistrarController::class, 'toggleEnrollment'])->name('registrar.settings.toggle-enrollment');
        Route::post('/settings/toggle-faculty-cor-print', [RegistrarController::class, 'toggleFacultyCorPrint'])
            ->name('registrar.settings.toggle-faculty-cor-print');
        Route::post('/settings/toggle-coordinator-cor-print', [RegistrarController::class, 'toggleCoordinatorCorPrint'])
            ->name('registrar.settings.toggle-coordinator-cor-print');

        // Reports routes (GET route moved outside auth middleware)
        Route::get('/reports/filter-options', [RegistrarController::class, 'getReportFilterOptions'])->name('registrar.reports.filter-options');
        Route::get('/reports/generate', [RegistrarController::class, 'generateReport'])->name('registrar.reports.generate');
        Route::get('/reports/export', [RegistrarController::class, 'exportReport'])->name('registrar.reports.export');

        // Fix enrollment issues
        Route::post('/fix-enrollment-issues', [RegistrarController::class, 'fixEnrollmentIssues'])->name('registrar.fix-enrollment-issues');

        // Dashboard data routes
        Route::get('/dashboard-stats', [RegistrarController::class, 'getDashboardStatsApi'])->name('registrar.dashboard-stats');
        Route::get('/enrolled-students-per-strand', [RegistrarController::class, 'getEnrolledStudentsPerStrand'])->name('registrar.enrolled-students-per-strand');


    });

    // Philippine SHS System Routes
    Route::group([], function () {
        // School year progression status
        Route::get('/school-years/progression-status', [RegistrarController::class, 'getProgressionStatus'])
            ->name('school-years.progression-status');

        // Student grade progression
        Route::post('/students/progress-grade', [FacultyController::class, 'progressStudentGrade'])
            ->name('students.progress-grade');


        Route::get('/students/{studentId}/grades/summary', [FacultyController::class, 'getStudentGradesSummary'])
            ->name('student.grades.summary');

        Route::post('/grades/validate', [FacultyController::class, 'validateGradeInput'])
            ->name('grades.validate');
    });


    // Student Summer Enrollment Routes
    Route::prefix('student')->group(function () {
        Route::get('/summer-enrollment', function () {
            return Inertia::render('Student/StudentSummerEnrollment', [
                'auth' => [
                    'user' => Auth::user()
                ]
            ]);
        })->name('student.summer-enrollment');

        Route::get('/summer-eligibility', [RegistrarController::class, 'generateSummerEnrollment'])
            ->name('student.summer-eligibility');

        Route::post('/summer-enrollment', [RegistrarController::class, 'processSummerEnrollment'])
            ->name('student.summer-enrollment.process');
    });

    // Note: School Years routes are now handled within the registrar prefix above
    // These duplicate routes have been removed to prevent conflicts

    /*
    |--------------------------------------------------------------------------
    | Dashboard Statistics Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('dashboard')->group(function () {
        Route::get('/students/count', [RegistrarController::class, 'getStudentsCount']);
        Route::get('/sections/count', [RegistrarController::class, 'getSectionsCount']);
        Route::get('/faculty/count', [RegistrarController::class, 'getFacultyCount']);
        Route::get('/classes/count', [RegistrarController::class, 'getClassesCount']);
        Route::get('/coordinators/count', [RegistrarController::class, 'getCoordinatorsCount']);
    });


    // Student dashboard route moved outside auth middleware

    

    // Session management routes
    Route::post('/auth/validate-session', [App\Http\Controllers\AuthController::class, 'validateSession'])
        ->name('auth.validate-session');
    
    Route::post('/auth/force-logout', [App\Http\Controllers\AuthController::class, 'forceLogoutUser'])
        ->name('auth.force-logout');
    
    Route::get('/auth/active-sessions', [App\Http\Controllers\AuthController::class, 'getActiveSessions'])
        ->name('auth.active-sessions');





    // Enrollment day status check - using proper controller method
    Route::get('/student/enrollment-day-status', [App\Http\Controllers\StudentController::class, 'checkEnrollmentDayStatus'])
        ->name('student.enrollment.day.status');
    Route::get('/student/enrollment-status', [App\Http\Controllers\StudentEnrollmentController::class, 'getEnrollmentStatus'])
        ->name('student.enrollment.status');
    Route::get('/student/profile', [App\Http\Controllers\StudentController::class, 'profilePage'])
        ->name('student.profile');

    // REMOVED: Student grades route moved to authenticated group at top of file

    Route::prefix('student')->group(function () {

        // Student Grades Page - moved outside auth middleware to prevent loops

        // NEW: Get grades for specific semester
        Route::get('/grades/{semester}', [App\Http\Controllers\StudentController::class, 'getSemesterGrades'])
            ->name('student.grades.semester');

        // NEW: Get complete academic record
        Route::get('/academic-record', [App\Http\Controllers\StudentController::class, 'getAcademicRecord'])
            ->name('student.academic.record');

        // Enroll Page - Philippine SHS System
        // Note: Enrollment routes moved to main section using StudentEnrollmentController

        // Student notifications
        Route::get('/notifications', [App\Http\Controllers\StudentController::class, 'getNotifications'])->name('student.notifications');

        // (Optional) 
        Route::get('/', [AuthController::class, 'listStudents'])->name('students.index');
        Route::get('/{id}', [AuthController::class, 'showStudent'])->name('students.show');
        Route::put('/{id}', [AuthController::class, 'updateStudent'])->name('students.update');
        Route::delete('/{id}', [AuthController::class, 'deleteStudent'])->name('students.delete');
    });


    // Faculty dashboard route moved outside auth middleware

    Route::prefix('faculty')->group(function () {

        // Faculty Schedule - Temporary simple test
        Route::get('/schedule-test', function () {
            return response()->json([
                'message' => 'Schedule route is working!',
                'user' => \Illuminate\Support\Facades\Auth::user(),
                'timestamp' => now()
            ]);
        })->name('faculty.schedule.test');

        // Faculty Schedule (GET route moved outside auth middleware)
        // Debug route to test faculty schedule access
        Route::get('/schedule-debug', function () {
            $user = \Illuminate\Support\Facades\Auth::user();

            return response()->json([
                'authenticated' => !!$user,
                'user_id' => $user ? $user->id : null,
                'user_role' => $user ? $user->role : null,
                'user_email' => $user ? $user->email : null,
                'is_coordinator' => $user ? ($user->is_coordinator ?? false) : false,
                'session_data' => session()->all(),
                'auth_check' => \Illuminate\Support\Facades\Auth::check(),
                'route_exists' => \Illuminate\Support\Facades\Route::has('faculty.schedule'),
                'can_access_schedule' => $user && in_array($user->role, ['faculty', 'coordinator'])
            ]);
        })->name('faculty.schedule.debug');

        // Faculty Classes (GET route moved outside auth middleware)
        // Excel Export/Import (Put specific routes before generic ones)
        Route::get('/classes/{classId}/export-students', [App\Http\Controllers\FacultyController::class, 'exportStudentList'])
            ->name('faculty.classes.export-students');

        // Simple test route to verify faculty access
        Route::get('/test-access', function () {
            return response()->json([
                'message' => 'Faculty routes are accessible',
                'timestamp' => now(),
                'user' => \Illuminate\Support\Facades\Auth::user()
            ]);
        })->name('faculty.test.access');
        Route::get('/test-export-simple', function () {
            \Illuminate\Support\Facades\Log::info('🔥 SIMPLE TEST ROUTE CALLED');
            return response('Simple test route is working! Time: ' . now(), 200, [
                'Content-Type' => 'text/plain'
            ]);
        });

        // View Class Students
        Route::get('/classes/{classId}/students', [App\Http\Controllers\FacultyController::class, 'viewClassStudents'])
            ->name('faculty.classes.students');

        // Student Profile
        Route::get('/student/{studentId}/profile', [App\Http\Controllers\FacultyController::class, 'viewStudentProfile'])
            ->name('faculty.student.profile');

        // Input Grades - Updated for semester-based grading
        Route::get('/classes/{classId}/student/{studentId}/grades', [App\Http\Controllers\FacultyController::class, 'inputStudentGrades'])
            ->name('faculty.student.grades');

        // Save Grades - Now requires semester parameter
        Route::post('/classes/{classId}/student/{studentId}/grades', [App\Http\Controllers\FacultyController::class, 'saveStudentGrades'])
            ->name('faculty.student.grades.save');

        // ✅ FIXED: Added grade submission routes for approval workflow
        Route::post('/grades/{gradeId}/submit-for-approval', [App\Http\Controllers\FacultyController::class, 'submitGradeForApproval'])
            ->name('faculty.grades.submit');
        Route::post('/students/{studentId}/submit-grades-for-approval', [App\Http\Controllers\FacultyController::class, 'submitStudentGradesForApproval'])
            ->name('faculty.student.grades.submit.all');

        // Simplified batch submit route
        Route::post('/submit-all-grades-for-approval', [App\Http\Controllers\FacultyController::class, 'submitAllGradesForApproval'])
            ->name('faculty.grades.submit.all');

        // Test POST route
        Route::post('/test-post-grades', function () {
            \Illuminate\Support\Facades\Log::info('🔥 TEST POST ROUTE CALLED');
            return response()->json([
                'success' => true,
                'message' => 'Test POST route working',
                'timestamp' => now()
            ]);
        });


        Route::get('/classes/{classId}/export', [App\Http\Controllers\FacultyController::class, 'exportClassRecord'])
            ->name('faculty.classes.export');
        Route::post('/classes/{classId}/import', [App\Http\Controllers\FacultyController::class, 'importClassGrades'])
            ->name('faculty.classes.import');


        // Faculty Grade Management (GET route moved outside auth middleware) - Updated for Philippine SHS
        // Get section and subject grades (both semesters)
        Route::get('/grades/section/{sectionId}/subject/{subjectId}', [App\Http\Controllers\FacultyController::class, 'getSectionSubjectGrades'])
            ->name('faculty.grades.section.subject');

        // Fetch existing grades - moved outside auth middleware to fix refresh issue
        Route::get('/grades/fetch', [App\Http\Controllers\FacultyController::class, 'fetchGrades'])
            ->name('faculty.grades.fetch.public');

        // Fix missing COR and class_details for enrolled students
        Route::get('/fix/generate-missing-cors', function() {
            $enrolledStudents = \App\Models\Enrollment::where('status', 'enrolled')
                ->whereDoesntHave('certificateOfRegistration')
                ->with(['studentPersonalInfo.user', 'assignedSection', 'strand', 'schoolYear'])
                ->get();
            
            $results = [];
            foreach ($enrolledStudents as $enrollment) {
                try {
                    $corService = new \App\Services\CORService();
                    $cor = $corService->generateCOR($enrollment, 1); // Generated by admin
                    $results[] = "✅ Generated COR {$cor->cor_number} for student {$enrollment->studentPersonalInfo->user->firstname} {$enrollment->studentPersonalInfo->user->lastname}";
                } catch (\Exception $e) {
                    $results[] = "❌ Failed for enrollment {$enrollment->id}: " . $e->getMessage();
                }
            }
            
            return response()->json([
                'message' => 'COR generation completed',
                'results' => $results
            ]);
        })->name('fix.generate-cors');

        // Debug route to check enrollment and assignment status
        Route::get('/debug/enrollment-status/{sectionId}/{subjectId}', function ($sectionId, $subjectId) {
            $faculty = Auth::user() ?? App\Models\User::where('role', 'faculty')->first();

            $debug = [
                'faculty' => [
                    'id' => $faculty->id,
                    'name' => $faculty->firstname . ' ' . $faculty->lastname,
                    'role' => $faculty->role
                ],
                'section' => App\Models\Section::find($sectionId),
                'subject' => App\Models\Subject::find($subjectId),
                'class_assignment' => DB::table('class')
                    ->where('faculty_id', $faculty->id)
                    ->where('section_id', $sectionId)
                    ->where('subject_id', $subjectId)
                    ->where('is_active', true)
                    ->first(),
                'enrollments_in_section' => DB::table('enrollments')
                    ->join('users', 'enrollments.student_id', '=', 'users.id')
                    ->where('enrollments.assigned_section_id', $sectionId)
                    ->select('users.firstname', 'users.lastname', 'enrollments.status', 'users.role')
                    ->get(),
                'enrolled_students' => DB::table('enrollments')
                    ->join('users', 'enrollments.student_id', '=', 'users.id')
                    ->where('enrollments.assigned_section_id', $sectionId)
                    ->whereIn('enrollments.status', ['enrolled', 'approved'])
                    ->where('users.role', 'student')
                    ->select('users.id', 'users.firstname', 'users.lastname', 'enrollments.status')
                    ->get()
            ];

            return response()->json($debug, 200, [], JSON_PRETTY_PRINT);
        })->name('faculty.debug.enrollment');

        // Test auth route
        Route::post('/test-auth', function (Request $request) {
            $user = Auth::user();
            return response()->json([
                'authenticated' => !!$user,
                'user_id' => $user ? $user->id : null,
                'user_role' => $user ? $user->role : null,
                'auth_check' => Auth::check(),
                'request_data' => $request->all(),
                'headers' => $request->headers->all()
            ]);
        })->name('faculty.test.auth');

        // Clear auth loop route (for debugging)
        Route::get('/clear-auth-loop', function () {
            return response()->json([
                'message' => 'Auth loop cleared',
                'instructions' => 'Clear browser localStorage and sessionStorage, then refresh'
            ]);
        })->name('clear.auth.loop');

        // Debug route to check users (REMOVE IN PRODUCTION)
        Route::get('/debug-users', function () {
            $users = DB::table('users')->select('id', 'firstname', 'lastname', 'email', 'role', 'created_at')->get();
            return response()->json([
                'total_users' => $users->count(),
                'users' => $users,
                'registrar_exists' => DB::table('users')->where('role', 'registrar')->exists(),
                'faculty_exists' => DB::table('users')->where('role', 'faculty')->exists(),
                'student_exists' => DB::table('users')->where('role', 'student')->exists()
            ]);
        })->name('debug.users');


        // Clear application cache (for debugging)
        Route::get('/clear-cache', function () {
            try {
                Artisan::call('config:clear');
                Artisan::call('route:clear');
                Artisan::call('cache:clear');
                Artisan::call('view:clear');

                return response()->json([
                    'message' => 'All caches cleared successfully',
                    'cleared' => ['config', 'routes', 'cache', 'views'],
                    'instructions' => 'Try refreshing the page now'
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Cache clear failed',
                    'error' => $e->getMessage()
                ]);
            }
        })->name('clear.cache');

        // Emergency auth reset route (for debugging loops)
        Route::get('/reset-auth', function () {
            // Clear all possible auth data
            session()->flush();
            session()->regenerate();

            return response()->json([
                'message' => 'All authentication data cleared',
                'instructions' => [
                    '1. Clear browser localStorage and sessionStorage',
                    '2. Clear browser cookies for this domain',
                    '3. Refresh the page',
                    '4. Try logging in again'
                ]
            ]);
        })->name('reset.auth');

        // Clear redirect loops route (accessible without auth)
        Route::get('/clear-redirect-loops', function () {
            return response()->json([
                'message' => 'Redirect loop prevention activated',
                'instructions' => [
                    'Open browser console and run:',
                    'sessionStorage.clear(); localStorage.clear(); location.reload();'
                ],
                'script' => 'sessionStorage.clear(); localStorage.clear(); location.reload();'
            ]);
        })->name('clear.redirect.loops');

        // Debug routes for faculty schedule and class issues
        Route::get('/debug-data', function () {
            $classSchedules = \Illuminate\Support\Facades\DB::table('class')->get();
            $facultyUsers = \Illuminate\Support\Facades\DB::table('users')->where('role', 'faculty')->orWhere('role', 'coordinator')->get();
            $subjects = \Illuminate\Support\Facades\DB::table('subjects')->get();
            $sections = \Illuminate\Support\Facades\DB::table('sections')->get();

            return response()->json([
                'class_schedules' => $classSchedules,
                'faculty_users' => $facultyUsers,
                'subjects' => $subjects,
                'sections' => $sections
            ]);
        })->name('faculty.debug.data');

        // Quick fix route to assign current faculty to existing schedules
        Route::get('/fix-assignments', function () {
            $facultyUser = \Illuminate\Support\Facades\DB::table('users')->where('role', 'faculty')->orWhere('role', 'coordinator')->first();

            if ($facultyUser) {
                // Get current schedule assignments
                $beforeAssignment = \Illuminate\Support\Facades\DB::table('class')
                    ->select('id', 'faculty_id', 'subject_id', 'day_of_week', 'start_time', 'school_year_id')
                    ->get();

                // Update ALL class schedules to be assigned to this faculty member
                $updated = \Illuminate\Support\Facades\DB::table('class')
                    ->update(['faculty_id' => $facultyUser->id]);

                // Get after assignment
                $afterAssignment = \Illuminate\Support\Facades\DB::table('class')
                    ->select('id', 'faculty_id', 'subject_id', 'day_of_week', 'start_time', 'school_year_id')
                    ->get();

                return response()->json([
                    'message' => 'Faculty assignments updated',
                    'faculty_id' => $facultyUser->id,
                    'faculty_name' => $facultyUser->firstname . ' ' . $facultyUser->lastname,
                    'total_schedules' => $afterAssignment->count(),
                    'updated_schedules' => $updated,
                    'before_assignment' => $beforeAssignment,
                    'after_assignment' => $afterAssignment
                ]);
            }

            return response()->json(['message' => 'No faculty user found']);
        })->name('faculty.fix.assignments');

        // Quick fix: Assign schedules to faculty user ID 1 (for testing)
        Route::get('/assign-to-current', function () {
            // Force assign to faculty ID 1 for testing
            $facultyId = 1;

            // Get first 3 schedules and assign to faculty ID 1
            $schedules = \Illuminate\Support\Facades\DB::table('class')
                ->where('school_year_id', 1)
                ->where('is_active', true)
                ->limit(3)
                ->get();

            if ($schedules->count() > 0) {
                $updated = \Illuminate\Support\Facades\DB::table('class')
                    ->whereIn('id', $schedules->pluck('id'))
                    ->update(['faculty_id' => $facultyId]);

                return response()->json([
                    'message' => 'Schedules assigned to faculty ID 1',
                    'faculty_id' => $facultyId,
                    'schedules_assigned' => $updated,
                    'assigned_schedule_ids' => $schedules->pluck('id')->toArray(),
                    'note' => 'Now refresh Grade Input and My Schedule pages'
                ]);
            }

            return response()->json(['message' => 'No schedules available to assign']);
        })->name('faculty.assign.current');

        // Force reassign ALL schedules to current faculty user
        Route::get('/force-reassign', function () {
            $facultyUser = \Illuminate\Support\Facades\Auth::user();

            if (!$facultyUser || !in_array($facultyUser->role, ['faculty', 'coordinator'])) {
                return response()->json(['error' => 'Must be logged in as faculty']);
            }

            // Get all schedules before reassignment
            $beforeCount = \Illuminate\Support\Facades\DB::table('class')
                ->where('faculty_id', $facultyUser->id)
                ->count();

            // Reassign ALL schedules to current faculty user
            $totalUpdated = \Illuminate\Support\Facades\DB::table('class')
                ->update(['faculty_id' => $facultyUser->id]);

            // Get count after reassignment
            $afterCount = \Illuminate\Support\Facades\DB::table('class')
                ->where('faculty_id', $facultyUser->id)
                ->count();

            return response()->json([
                'message' => 'All schedules reassigned to current faculty',
                'faculty_id' => $facultyUser->id,
                'faculty_name' => $facultyUser->firstname . ' ' . $facultyUser->lastname,
                'schedules_before' => $beforeCount,
                'schedules_after' => $afterCount,
                'total_updated' => $totalUpdated
            ]);
        })->name('faculty.force.reassign');

        // Fix student-class connections
        Route::get('/fix-student-classes', function () {
            // Get enrolled students
            $enrolledStudents = \Illuminate\Support\Facades\DB::table('enrollments')
                ->join('users', 'enrollments.student_id', '=', 'users.id')
                ->where('enrollments.status', 'enrolled')
                ->select('enrollments.*', 'users.firstname', 'users.lastname')
                ->get();

            $createdConnections = 0;

            foreach ($enrolledStudents as $enrollment) {
                // Get all classes for the student's assigned section
                $classes = \Illuminate\Support\Facades\DB::table('class')
                    ->where('section_id', $enrollment->assigned_section_id)
                    ->where('school_year_id', $enrollment->school_year_id)
                    ->where('is_active', true)
                    ->get();

                foreach ($classes as $class) {
                    // Create class_details record if it doesn't exist
                    $exists = \Illuminate\Support\Facades\DB::table('class_details')
                        ->where('enrollment_id', $enrollment->id)
                        ->where('class_id', $class->id)
                        ->exists();

                    if (!$exists) {
                        \Illuminate\Support\Facades\DB::table('class_details')->insert([
                            'enrollment_id' => $enrollment->id,
                            'class_id' => $class->id,
                            'is_enrolled' => true,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                        $createdConnections++;
                    }
                }
            }

            return response()->json([
                'message' => 'Student-class connections fixed',
                'enrolled_students' => $enrolledStudents->count(),
                'created_connections' => $createdConnections,
                'total_class_details' => \Illuminate\Support\Facades\DB::table('class_details')->count()
            ]);
        })->name('faculty.fix.student.classes');

        // Debug route to check enrollment data
        Route::get('/debug-enrollment-data', function () {
            $data = [
                'enrollments' => DB::table('enrollments')->get(['id', 'student_id', 'assigned_section_id', 'status']),
                'users_students' => DB::table('users')->where('role', 'student')->get(['id', 'firstname', 'lastname', 'email']),
                'sections' => DB::table('sections')->get(['id', 'section_name', 'strand_id']),
                'class_schedules' => DB::table('class')->get(['id', 'faculty_id', 'section_id', 'subject_id']),
                'class_details' => DB::table('class_details')->get(['id', 'class_id', 'enrollment_id', 'is_enrolled']),
                'subjects' => DB::table('subjects')->get(['id', 'name', 'strand_id'])
            ];

            return response()->json($data);
        })->name('faculty.debug.enrollment');

        // Test route for registrar reports issue
        Route::get('/test-registrar-reports', function () {
            try {
                // Test the exact same logic as RegistrarController
                $query = DB::table('users')
                    ->leftJoin('enrollments', 'users.id', '=', 'enrollments.student_id')
                    ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                    ->leftJoin('strands', function ($join) {
                        $join->on('enrollments.strand_id', '=', 'strands.id')
                            ->orOn('enrollments.first_strand_choice_id', '=', 'strands.id');
                    })
                    ->leftJoin('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                    ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                    ->leftJoin('transferee_previous_schools', 'users.id', '=', 'transferee_previous_schools.student_id')
                    ->select(
                        'users.id as user_id',
                        'users.firstname',
                        'users.lastname',
                        'users.email',
                        'users.student_type',
                        'student_personal_info.grade_level',
                        'sections.section_name',
                        'strands.code as strand_code',
                        'strands.name as strand_name',
                        DB::raw("CASE 
                            WHEN school_years.year_start IS NOT NULL AND school_years.year_end IS NOT NULL 
                            THEN CONCAT(school_years.year_start, '-', school_years.year_end, ' (', COALESCE(school_years.semester, 'N/A'), ')') 
                            ELSE 'N/A' 
                        END as school_year"),
                        DB::raw("COALESCE(enrollments.status, 'not_enrolled') as status"),
                        'enrollments.enrollment_date',
                        'transferee_previous_schools.last_school as previous_school',
                        'enrollments.id as enrollment_id'
                    )
                    ->where('users.role', 'student');

                $students = $query->orderBy('users.lastname')->get();

                // If no results, try simpler query
                if ($students->isEmpty()) {
                    $students = DB::table('users')
                        ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
                        ->select(
                            'users.id as user_id',
                            'users.firstname',
                            'users.lastname',
                            'users.email',
                            'users.student_type',
                            'student_personal_info.grade_level',
                            DB::raw("'N/A' as section_name"),
                            DB::raw("'N/A' as strand_code"),
                            DB::raw("'N/A' as strand_name"),
                            DB::raw("'N/A' as school_year"),
                            DB::raw("'not_enrolled' as status"),
                            DB::raw("NULL as enrollment_date"),
                            DB::raw("NULL as previous_school"),
                            DB::raw("NULL as enrollment_id")
                        )
                        ->where('users.role', 'student')
                        ->orderBy('users.lastname')
                        ->get();
                }

                return response()->json([
                    'success' => true,
                    'student_count' => $students->count(),
                    'students' => $students,
                    'debug_info' => [
                        'total_users' => DB::table('users')->count(),
                        'student_users' => DB::table('users')->where('role', 'student')->count(),
                        'enrollments' => DB::table('enrollments')->count(),
                        'sections' => DB::table('sections')->count(),
                        'strands' => DB::table('strands')->count(),
                        'school_years' => DB::table('school_years')->count(),
                        'sample_users' => DB::table('users')->where('role', 'student')->limit(3)->get(['id', 'firstname', 'lastname', 'role'])
                    ]
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        })->name('test.registrar.reports');

        // Debug route for grade input issue
        Route::get('/debug-grade-input-issue', function () {
            $data = [
                'students' => DB::table('users')->where('role', 'student')->get(['id', 'firstname', 'lastname', 'email']),
                'enrollments' => DB::table('enrollments')->get(['id', 'student_id', 'assigned_section_id', 'strand_id', 'status']),
                'sections' => DB::table('sections')->get(['id', 'section_name', 'strand_id']),
                'classes' => DB::table('class')->get(['id', 'faculty_id', 'section_id', 'subject_id', 'is_active']),
                'class_details' => DB::table('class_details')->get(['id', 'class_id', 'enrollment_id', 'section_id', 'is_enrolled']),
                'faculty' => DB::table('users')->whereIn('role', ['faculty', 'coordinator'])->get(['id', 'firstname', 'lastname', 'role']),
                'subjects' => DB::table('subjects')->get(['id', 'name', 'strand_id']),

                // Specific analysis
                'analysis' => [
                    'total_students' => DB::table('users')->where('role', 'student')->count(),
                    'total_enrollments' => DB::table('enrollments')->count(),
                    'total_class_details' => DB::table('class_details')->count(),
                    'students_per_section' => DB::table('enrollments')
                        ->join('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                        ->select('sections.section_name', DB::raw('COUNT(*) as student_count'))
                        ->groupBy('sections.id', 'sections.section_name')
                        ->get(),
                    'classes_per_section' => DB::table('class')
                        ->join('sections', 'class.section_id', '=', 'sections.id')
                        ->select('sections.section_name', DB::raw('COUNT(*) as class_count'))
                        ->where('class.is_active', true)
                        ->groupBy('sections.id', 'sections.section_name')
                        ->get(),
                    'faculty_assignments' => DB::table('class')
                        ->join('users', 'class.faculty_id', '=', 'users.id')
                        ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                        ->join('sections', 'class.section_id', '=', 'sections.id')
                        ->select('users.firstname', 'users.lastname', 'subjects.name as subject', 'sections.section_name')
                        ->where('class.is_active', true)
                        ->get()
                ]
            ];

            return response()->json($data);
        })->name('debug.grade.input.issue');

        // Fix incorrect class_details assignments
        Route::get('/fix-class-details-assignments', function () {
            $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json(['error' => 'No active school year found']);
            }

            $fixed = 0;
            $errors = [];

            try {
                // Get all class_details records
                $classDetails = DB::table('class_details')
                    ->join('enrollments', 'class_details.enrollment_id', '=', 'enrollments.id')
                    ->join('class', 'class_details.class_id', '=', 'class.id')
                    ->select(
                        'class_details.id as detail_id',
                        'class_details.class_id',
                        'class_details.enrollment_id',
                        'class_details.section_id as detail_section_id',
                        'enrollments.assigned_section_id as enrollment_section_id',
                        'class.section_id as class_section_id'
                    )
                    ->get();

                foreach ($classDetails as $detail) {
                    // Check if the class_details record has mismatched sections
                    if (
                        $detail->detail_section_id != $detail->enrollment_section_id ||
                        $detail->detail_section_id != $detail->class_section_id
                    ) {

                        // This is a mismatch - student is in wrong class
                        // Check if student should actually be in this class
                        if ($detail->enrollment_section_id == $detail->class_section_id) {
                            // Fix the section_id in class_details
                            DB::table('class_details')
                                ->where('id', $detail->detail_id)
                                ->update(['section_id' => $detail->enrollment_section_id]);
                            $fixed++;
                        } else {
                            // Student shouldn't be in this class at all - remove the record
                            DB::table('class_details')
                                ->where('id', $detail->detail_id)
                                ->delete();
                            $fixed++;
                        }
                    }
                }

                return response()->json([
                    'message' => 'Class details assignments fixed',
                    'records_processed' => $classDetails->count(),
                    'records_fixed' => $fixed,
                    'errors' => $errors
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Failed to fix assignments: ' . $e->getMessage()
                ], 500);
            }
        })->name('fix.class.details.assignments');

        // Fix missing class_details for enrolled students
        Route::get('/fix-missing-class-details', function () {
            $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
            if (!$activeSchoolYear) {
                return response()->json(['error' => 'No active school year found']);
            }

            // Get all enrolled students
            $enrolledStudents = DB::table('enrollments')
                ->where('school_year_id', $activeSchoolYear->id)
                ->whereIn('status', ['enrolled', 'approved'])
                ->whereNotNull('assigned_section_id')
                ->get();

            $createdRecords = 0;
            $errors = [];

            foreach ($enrolledStudents as $enrollment) {
                try {
                    // Get the student's strand (from first choice or assigned)
                    $strandId = $enrollment->strand_id ?? $enrollment->first_strand_choice_id;

                    if (!$strandId) {
                        $errors[] = "No strand found for enrollment ID: {$enrollment->id}";
                        continue;
                    }

                    // Get all classes for this section (both core and strand-specific)
                    $classes = DB::table('class')
                        ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                        ->where('class.section_id', $enrollment->assigned_section_id)
                        ->where('class.school_year_id', $activeSchoolYear->id)
                        ->where('class.is_active', true)
                        ->where(function ($query) use ($strandId) {
                            $query->whereNull('subjects.strand_id')
                                ->orWhere('subjects.strand_id', $strandId);
                        })
                        ->select('class.id as class_id')
                        ->get();

                    // Create class_details for each class
                    foreach ($classes as $class) {
                        $exists = DB::table('class_details')
                            ->where('class_id', $class->class_id)
                            ->where('enrollment_id', $enrollment->id)
                            ->exists();

                        if (!$exists) {
                            DB::table('class_details')->insert([
                                'class_id' => $class->class_id,
                                'enrollment_id' => $enrollment->id,
                                'section_id' => $enrollment->assigned_section_id,
                                'is_enrolled' => true,
                                'enrolled_at' => now(),
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);
                            $createdRecords++;
                        }
                    }
                } catch (\Exception $e) {
                    $errors[] = "Error processing enrollment ID {$enrollment->id}: " . $e->getMessage();
                }
            }

            return response()->json([
                'message' => 'Class details fix completed',
                'enrolled_students_processed' => $enrolledStudents->count(),
                'class_details_created' => $createdRecords,
                'errors' => $errors
            ]);
        })->name('faculty.fix.class.details');

        // Check user ID mismatch
        Route::get('/check-user-ids', function () {
            $authUser = \Illuminate\Support\Facades\Auth::user();
            $facultyUsers = \Illuminate\Support\Facades\DB::table('users')
                ->whereIn('role', ['faculty', 'coordinator'])
                ->get();
            $scheduleAssignments = \Illuminate\Support\Facades\DB::table('class')
                ->select('faculty_id')
                ->groupBy('faculty_id')
                ->get();

            return response()->json([
                'auth_user' => $authUser ? ['id' => $authUser->id, 'name' => $authUser->firstname . ' ' . $authUser->lastname] : null,
                'faculty_users' => $facultyUsers->map(fn($u) => ['id' => $u->id, 'name' => $u->firstname . ' ' . $u->lastname, 'role' => $u->role]),
                'schedule_assignments' => $scheduleAssignments->pluck('faculty_id')
            ]);
        })->name('faculty.check.user.ids');

        // Fix user ID mismatch - reassign schedules to authenticated user
        Route::get('/fix-user-mismatch', function () {
            $authUser = \Illuminate\Support\Facades\Auth::user();

            if (!$authUser) {
                return response()->json(['error' => 'No authenticated user found']);
            }

            // Get current schedule assignments
            $beforeUpdate = \Illuminate\Support\Facades\DB::table('class')
                ->select('faculty_id')
                ->groupBy('faculty_id')
                ->get()
                ->pluck('faculty_id');

            // Reassign ALL schedules to the authenticated user
            $updatedCount = \Illuminate\Support\Facades\DB::table('class')
                ->update(['faculty_id' => $authUser->id]);

            // Get after update
            $afterUpdate = \Illuminate\Support\Facades\DB::table('class')
                ->select('faculty_id')
                ->groupBy('faculty_id')
                ->get()
                ->pluck('faculty_id');

            return response()->json([
                'message' => 'User ID mismatch fixed',
                'auth_user' => [
                    'id' => $authUser->id,
                    'name' => $authUser->firstname . ' ' . $authUser->lastname,
                    'role' => $authUser->role
                ],
                'before_update' => $beforeUpdate,
                'after_update' => $afterUpdate,
                'schedules_updated' => $updatedCount
            ]);
        })->name('faculty.fix.user.mismatch');

        // SECURITY FIX: Removed automatic test student creation route

        // Faculty Students/Assignment (GET route moved outside auth middleware)
        // Manual populate class_details table (for initial setup)
        Route::post('/populate-class-details', [App\Http\Controllers\FacultyController::class, 'populateClassDetails'])
            ->name('faculty.populate-class-details');

        // Coordinator functionality within Faculty routes (GET routes moved outside auth middleware)
        // Note: Manual enrollment functionality removed - no corresponding controller methods

        Route::post('/students/{student}/reject', [App\Http\Controllers\CoordinatorController::class, 'rejectStudent'])
            ->name('coordinator.students.reject');
        Route::post('/students/{student}/finalize', [App\Http\Controllers\CoordinatorController::class, 'finalizeStudent'])
            ->name('coordinator.students.finalize');

        // Student schedule route for COR
        Route::get('/student/{studentId}/schedule', [App\Http\Controllers\FacultyController::class, 'getStudentSchedule'])
            ->name('faculty.student.schedule');

        // Grade 11 to Grade 12 Progression Routes
        Route::get('/grade11-students', [App\Http\Controllers\FacultyController::class, 'getGrade11Students'])
            ->name('faculty.grade11-students');
        Route::get('/grade11-students-for-progression', [App\Http\Controllers\CoordinatorController::class, 'getGrade11StudentsForProgression'])
            ->name('coordinator.grade11-students-progression');
        Route::post('/progress-to-grade12', [App\Http\Controllers\FacultyController::class, 'progressToGrade12'])
            ->name('faculty.progress-to-grade12');
        Route::get('/student-details/{id}', [App\Http\Controllers\FacultyController::class, 'getStudentDetails'])
            ->name('faculty.student-details');

        // Transferee Previous School Management
        Route::post('/transferee-previous-school/{studentId}', [App\Http\Controllers\FacultyController::class, 'updateTransfereePreviousSchool'])
            ->name('faculty.transferee-previous-school.update');
        Route::get('/transferee-previous-school/{studentId}', [App\Http\Controllers\FacultyController::class, 'getTransfereePreviousSchool'])
            ->name('faculty.transferee-previous-school.get');

        // Transferee Enrollment with Credits (Faculty Access)
        Route::post('/transferee/enroll-with-credits', [App\Http\Controllers\TransfereeController::class, 'enrollWithCreditedSubjects'])
            ->name('faculty.transferee.enroll-with-credits');

        // Faculty Grades Routes - MOVED INSIDE FACULTY GROUP TO FIX 401 ERROR

        // Fetch existing grades
        Route::get('/grades/fetch', [App\Http\Controllers\FacultyController::class, 'fetchGrades'])
            ->name('faculty.grades.fetch');

        // NEW: Get grades by semester for a class
        Route::get('/classes/{classId}/grades/{semester}', [App\Http\Controllers\FacultyController::class, 'getClassGradesBySemester'])
            ->name('faculty.class.grades.semester');

        // NEW: Export grades by semester
        Route::get('/classes/{classId}/export/{semester}', [App\Http\Controllers\FacultyController::class, 'exportClassGradesBySemester'])
            ->name('faculty.class.export.semester');

        // Faculty Profile
        Route::get('/profile', [App\Http\Controllers\FacultyController::class, 'profilePage'])
            ->name('faculty.profile');

        // Faculty status route
        Route::get('/status', [App\Http\Controllers\FacultyController::class, 'getStatus'])
            ->name('faculty.status');

        // Faculty Role-Based Dashboard Routes
        Route::get('/role-dashboard', function () {
            return Inertia::render('Faculty/Faculty_RoleBasedDashboard');
        })->name('faculty.role-dashboard');
        Route::get('/dashboard-data', [FacultyController::class, 'getFacultyDashboardData'])
            ->name('faculty.dashboard-data');
        Route::post('/process-pre-enrollment', [FacultyController::class, 'processPreEnrollment'])
            ->name('faculty.process-pre-enrollment');
        Route::get('/historical-data', [FacultyController::class, 'getHistoricalStudentData'])
            ->name('faculty.historical-data');
    });


    /*
    |--------------------------------------------------------------------------
    | Coordinator  Routes (Faculty with Coordinator Status)
    |--------------------------------------------------------------------------
    */
    Route::prefix('coordinator')->middleware(['role:coordinator'])->group(function () {
        // Enrollment Management Routes - Integrated into Faculty system
        // Note: Enrollment approval/rejection is handled through CoordinatorController
        // which renders Faculty/Faculty_Enrollment.jsx with coordinator privileges-classes');
        Route::get('/enrollments/{enrollment}/schedules', [RegistrarController::class, 'getClassSchedules'])
            ->name('coordinator.enrollment.schedules');

        // Student enrollment actions
        Route::post('/students/{id}/approve', [App\Http\Controllers\CoordinatorController::class, 'approveEnrollment'])
            ->name('coordinator.student.approve');
        Route::post('/students/{id}/reject', [App\Http\Controllers\CoordinatorController::class, 'rejectEnrollment'])
            ->name('coordinator.student.reject');
        Route::post('/students/{id}/finalize', [App\Http\Controllers\CoordinatorController::class, 'finalizeEnrollmentWithAssignment'])
            ->name('coordinator.enrollment.finalize');

        // Coordinator data routes 
        Route::get('/sections-and-strands', [App\Http\Controllers\CoordinatorController::class, 'getSectionsAndStrands'])
            ->name('coordinator.sections-and-strands');
        Route::get('/subjects-for-crediting/{strandCode}', [App\Http\Controllers\CoordinatorController::class, 'getSubjectsForCrediting'])
            ->name('coordinator.subjects-crediting');
        Route::get('/subjects/{strandCode}', [App\Http\Controllers\CoordinatorController::class, 'getSubjectsByStrand'])
            ->name('coordinator.subjects-by-strand');
        Route::get('/students/{id}', [App\Http\Controllers\CoordinatorController::class, 'getStudentDetails'])
            ->name('coordinator.student.details');

        // Schedule fetching route for coordinator enrollment
        Route::get('/schedules/section/{sectionId}/strand/{strandId}', [App\Http\Controllers\ScheduleController::class, 'getSchedulesBySectionAndStrand'])
            ->name('coordinator.schedules.section-strand');

        // Additional coordinator routes
        Route::get('/subjects-for-enrollment', [App\Http\Controllers\CoordinatorController::class, 'getSubjectsForEnrollment'])
            ->name('coordinator.subjects-for-enrollment');
        Route::get('/students', [App\Http\Controllers\CoordinatorController::class, 'studentsPage'])
            ->name('coordinator.students');

        // Transferee management routes
        Route::post('/transferee/previous-school', [App\Http\Controllers\TransfereeController::class, 'storePreviousSchool'])
            ->name('coordinator.transferee.previous-school');
        Route::post('/transferee/credited-subjects', [App\Http\Controllers\TransfereeController::class, 'storeCreditedSubjects'])
            ->name('coordinator.transferee.credited-subjects');
        Route::post('/transferee/enroll-with-credits', [App\Http\Controllers\TransfereeController::class, 'enrollWithCreditedSubjects'])
            ->name('coordinator.transferee.enroll-with-credits');
        Route::get('/transferee/{studentId}', [App\Http\Controllers\TransfereeController::class, 'getTransfereeData'])
            ->name('coordinator.transferee.data');
        Route::get('/transferee/subjects/available', [App\Http\Controllers\TransfereeController::class, 'getAvailableSubjects'])
            ->name('coordinator.transferee.available-subjects');
        Route::delete('/transferee/credited-subjects/{creditId}', [App\Http\Controllers\TransfereeController::class, 'removeCreditedSubject'])
            ->name('coordinator.transferee.remove-credit');

        // Fix enrollment sections
        Route::post('/fix-enrollment-sections', [App\Http\Controllers\CoordinatorController::class, 'fixEnrollmentSections'])
            ->name('coordinator.fix-enrollment-sections');

        // Populate class details for enrolled students
        Route::post('/populate-class-details', function () {
            try {
                // Get enrolled students
                $enrolledStudents = DB::table('enrollments')
                    ->where('status', 'enrolled')
                    ->whereNotNull('assigned_section_id')
                    ->get();

                $createdCount = 0;
                foreach ($enrolledStudents as $enrollment) {
                    // Get all classes for this section
                    $classes = DB::table('class')
                        ->where('section_id', $enrollment->assigned_section_id)
                        ->where('school_year_id', $enrollment->school_year_id)
                        ->get();

                    foreach ($classes as $class) {
                        // Check if class_details already exists
                        $exists = DB::table('class_details')
                            ->where('class_id', $class->id)
                            ->where('enrollment_id', $enrollment->id)
                            ->exists();

                        if (!$exists) {
                            DB::table('class_details')->insert([
                                'class_id' => $class->id,
                                'enrollment_id' => $enrollment->id,
                                'section_id' => $enrollment->assigned_section_id,
                                'is_enrolled' => true,
                                'enrolled_at' => now(),
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);
                            $createdCount++;
                        }
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => "Successfully created {$createdCount} class_details records",
                    'enrolled_students' => $enrolledStudents->count(),
                    'created_records' => $createdCount
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to populate class details: ' . $e->getMessage()
                ], 500);
            }
        })->name('coordinator.populate-class-details');
    });

    /*
    |--------------------------------------------------------------------------
    | Storage File Access Routes
    |--------------------------------------------------------------------------
    */
    Route::get('/storage/enrollment_documents/{filename}', function ($filename) {
        $path = storage_path('app/public/enrollment_documents/' . $filename);

        if (!file_exists($path)) {
            abort(404);
        }

        return response()->file($path);
    })->name('enrollment.document');

    /*
    |--------------------------------------------------------------------------
    | Storage File Access
    |--------------------------------------------------------------------------
    */

    // Protected file access for enrollment documents
    Route::group([], function () {
        // Student schedule route
        Route::get('/student/{id}/schedule', [App\Http\Controllers\ScheduleController::class, 'getStudentSchedule'])
            ->name('student.schedule.data');

        // Note: Student notifications route removed as requested
    });
});

// Student schedule routes
Route::get('/student/{student}/schedule', [App\Http\Controllers\ScheduleController::class, 'getStudentSchedule']);

// Test routes (can be removed in production)
Route::get('/test-grades', function () {
    return response()->json([
        'message' => 'Test route working',
        'timestamp' => now()
    ]);
});


// Catch-all profile route for debugging
Route::get('/profile', function () {
    return response()->json([
        'error' => 'Profile route accessed without prefix',
        'message' => 'Use /student/profile, /faculty/profile, or /registrar/profile instead',
        'redirect' => '/student/profile'
    ], 404);
});

// Test export route - outside middleware for testing
Route::get('/test-export', function () {
    try {
        \Illuminate\Support\Facades\Log::info('🔴 TEST EXPORT ROUTE HIT SUCCESSFULLY!');

        $csvContent = "Student Name,Semester,1st Quarter,2nd Quarter,Semester Grade,Remarks\n";
        // CSV content would be populated with real student data

        \Illuminate\Support\Facades\Log::info('🔴 CSV Content prepared, sending response');

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="test-export.csv"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('🔴 TEST EXPORT ERROR: ' . $e->getMessage());
        return response('Error: ' . $e->getMessage(), 500);
    }
})->name('test.export');

// Debug route to check enrollment data
Route::get('/debug/enrollment-data', function () {
    try {
        $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

        if (!$activeSchoolYear) {
            return response()->json([
                'error' => 'No active school year found',
                'school_years' => \App\Models\SchoolYear::all()
            ]);
        }

        // Get all enrollments for active school year
        $enrollments = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->select([
                'enrollments.*',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.role',
                'users.student_type',
                'student_personal_info.grade_level',
                'student_personal_info.student_status'
            ])
            ->get();

        // Get all users with student role
        $students = DB::table('users')->where('role', 'student')->get();

        // Get all student_personal_info records
        $studentPersonalInfo = DB::table('student_personal_info')->get();

        return response()->json([
            'active_school_year' => $activeSchoolYear,
            'total_enrollments' => $enrollments->count(),
            'enrollments' => $enrollments,
            'total_students' => $students->count(),
            'students' => $students,
            'total_personal_info' => $studentPersonalInfo->count(),
            'student_personal_info' => $studentPersonalInfo,
            'debug_info' => [
                'enrollments_table_exists' => Schema::hasTable('enrollments'),
                'student_personal_info_table_exists' => Schema::hasTable('student_personal_info'),
                'enrollment_columns' => Schema::hasTable('enrollments') ? DB::getSchemaBuilder()->getColumnListing('enrollments') : [],
            ]
        ], 200, [], JSON_PRETTY_PRINT);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Debug failed',
            'message' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ], 500);
    }
})->name('debug.enrollment.data');


// Debug route to check coordinator query
Route::get('/debug/coordinator-query', function () {
    try {
        $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

        if (!$activeSchoolYear) {
            return response()->json([
                'error' => 'No active school year found',
                'school_years' => \App\Models\SchoolYear::all(),
                'solution' => 'Activate a school year in registrar settings'
            ]);
        }

        // Run the exact same query as coordinator
        $enrollments = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->where('users.role', 'student')
            ->whereIn('enrollments.status', ['pending', 'approved', 'rejected'])
            ->select([
                'users.id as user_id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.student_type',
                'student_personal_info.grade_level',
                'student_personal_info.student_status',
                'student_personal_info.address',
                'enrollments.status as enrollment_status',
                'enrollments.id as enrollment_id',
                'enrollments.created_at as enrollment_date'
            ])
            ->orderBy('enrollments.created_at', 'desc')
            ->get();

        // Also check what would show without filters
        $allEnrollments = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->select([
                'users.id as user_id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.role',
                'users.student_type',
                'student_personal_info.grade_level',
                'student_personal_info.student_status',
                'enrollments.status as enrollment_status',
                'enrollments.id as enrollment_id'
            ])
            ->get();

        return response()->json([
            'active_school_year' => $activeSchoolYear,
            'coordinator_query_results' => $enrollments,
            'coordinator_count' => $enrollments->count(),
            'all_enrollments_for_year' => $allEnrollments,
            'all_count' => $allEnrollments->count(),
            'debug_info' => [
                'filters_applied' => [
                    'school_year_id' => $activeSchoolYear->id,
                    'user_role' => 'student',
                    'enrollment_status' => ['pending', 'approved', 'rejected']
                ]
            ]
        ], 200, [], JSON_PRETTY_PRINT);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Coordinator query debug failed',
            'message' => $e->getMessage(),
            'line' => $e->getLine()
        ], 500);
    }
})->name('debug.coordinator.query');


// Debug route to check why enrollment doesn't appear in coordinator view
Route::get('/debug/enrollment-visibility', function () {
    try {
        $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

        if (!$activeSchoolYear) {
            return response()->json([
                'error' => 'No active school year found',
                'school_years' => \App\Models\SchoolYear::all()
            ]);
        }

        // Check all enrollments in the system
        $allEnrollments = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->select([
                'enrollments.*',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.role'
            ])
            ->get();

        // Check enrollments for active school year
        $activeYearEnrollments = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->select([
                'enrollments.*',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.role'
            ])
            ->get();

        // Check student users
        $studentUsers = DB::table('users')->where('role', 'student')->get();

        // Check student personal info
        $studentPersonalInfo = DB::table('student_personal_info')->get();

        // Run the exact coordinator query
        $coordinatorQuery = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->leftJoin('student_personal_info', 'users.id', '=', 'student_personal_info.user_id')
            ->where('enrollments.school_year_id', $activeSchoolYear->id)
            ->where('users.role', 'student')
            ->whereIn('enrollments.status', ['pending', 'approved', 'rejected'])
            ->select([
                'users.id as user_id',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.student_type',
                'student_personal_info.grade_level',
                'student_personal_info.student_status',
                'student_personal_info.address',
                'enrollments.status as enrollment_status',
                'enrollments.id as enrollment_id',
                'enrollments.created_at as enrollment_date'
            ])
            ->orderBy('enrollments.created_at', 'desc')
            ->get();

        // Check strand preferences
        $strandPreferences = DB::table('student_strand_preferences')
            ->join('strands', 'student_strand_preferences.strand_id', '=', 'strands.id')
            ->select([
                'student_strand_preferences.*',
                'strands.name as strand_name',
                'strands.code as strand_code'
            ])
            ->get();

        return response()->json([
            'active_school_year' => $activeSchoolYear,
            'debug_summary' => [
                'total_enrollments' => $allEnrollments->count(),
                'active_year_enrollments' => $activeYearEnrollments->count(),
                'student_users' => $studentUsers->count(),
                'student_personal_info_records' => $studentPersonalInfo->count(),
                'coordinator_query_results' => $coordinatorQuery->count(),
                'strand_preferences' => $strandPreferences->count()
            ],
            'all_enrollments' => $allEnrollments,
            'active_year_enrollments' => $activeYearEnrollments,
            'student_users' => $studentUsers,
            'student_personal_info' => $studentPersonalInfo,
            'coordinator_query_results' => $coordinatorQuery,
            'strand_preferences' => $strandPreferences,
            'enrollment_table_columns' => DB::getSchemaBuilder()->getColumnListing('enrollments'),
            'student_personal_info_columns' => DB::getSchemaBuilder()->getColumnListing('student_personal_info'),
            'coordinator_query_filters' => [
                'school_year_id' => $activeSchoolYear->id,
                'user_role' => 'student',
                'enrollment_status_in' => ['pending', 'approved', 'rejected']
            ]
        ], 200, [], JSON_PRETTY_PRINT);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Enrollment visibility debug failed',
            'message' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ], 500);
    }
})->name('debug.enrollment.visibility');

// Simple route to check current enrollment status
Route::get('/debug/simple-enrollment-check', function () {
    try {
        // Get the most recent enrollment
        $latestEnrollment = DB::table('enrollments')
            ->join('users', 'enrollments.student_id', '=', 'users.id')
            ->orderBy('enrollments.created_at', 'desc')
            ->select([
                'enrollments.*',
                'users.firstname',
                'users.lastname',
                'users.email',
                'users.role'
            ])
            ->first();

        if (!$latestEnrollment) {
            return response()->json(['error' => 'No enrollments found in database']);
        }

        // Check if this enrollment should appear in coordinator view
        $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();

        $shouldAppear = [
            'has_active_school_year' => (bool)$activeSchoolYear,
            'enrollment_school_year_matches' => $activeSchoolYear ? ($latestEnrollment->school_year_id == $activeSchoolYear->id) : false,
            'user_role_is_student' => $latestEnrollment->role === 'student',
            'status_is_valid' => in_array($latestEnrollment->status, ['pending', 'approved', 'rejected']),
        ];

        // Check student personal info
        $studentPersonalInfo = DB::table('student_personal_info')
            ->where('user_id', $latestEnrollment->student_id)
            ->first();

        // Check strand preferences
        $strandPrefs = DB::table('student_strand_preferences')
            ->join('strands', 'student_strand_preferences.strand_id', '=', 'strands.id')
            ->where('student_personal_info_id', $studentPersonalInfo ? $studentPersonalInfo->id : 0)
            ->select([
                'student_strand_preferences.*',
                'strands.name as strand_name'
            ])
            ->get();

        return response()->json([
            'latest_enrollment' => $latestEnrollment,
            'active_school_year' => $activeSchoolYear,
            'should_appear_in_coordinator_view' => $shouldAppear,
            'all_conditions_met' => array_reduce($shouldAppear, function ($carry, $item) {
                return $carry && $item;
            }, true),
            'student_personal_info' => $studentPersonalInfo,
            'strand_preferences' => $strandPrefs,
            'debug_info' => [
                'enrollment_status' => $latestEnrollment->status,
                'school_year_match' => $activeSchoolYear ? ($latestEnrollment->school_year_id . ' == ' . $activeSchoolYear->id) : 'No active school year',
                'user_role' => $latestEnrollment->role
            ]
        ], 200, [], JSON_PRETTY_PRINT);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Simple enrollment check failed',
            'message' => $e->getMessage(),
            'line' => $e->getLine()
        ], 500);
    }
})->name('debug.simple.enrollment.check');

// Route to get sections by strand for enrollment management
Route::get('/coordinator/sections-by-strand/{strandId}', function ($strandId) {
    try {
        $sections = \App\Models\Section::where('strand_id', $strandId)
            ->select('id', 'section_name', 'year_level', 'strand_id')
            ->get();

        return response()->json([
            'success' => true,
            'sections' => $sections
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to get sections: ' . $e->getMessage()
        ], 500);
    }
})->name('coordinator.sections.by.strand');

// Route to view student COR/schedule
Route::get('/coordinator/student/{studentId}/schedule', function ($studentId) {
    try {
        // Get student info
        $student = \App\Models\User::where('id', $studentId)
            ->where('role', 'student')
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Get active school year
        $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
        if (!$activeSchoolYear) {
            return response()->json(['error' => 'No active school year'], 404);
        }

        // Get enrollment info
        $enrollment = DB::table('enrollments')
            ->where('student_id', $studentId)
            ->where('school_year_id', $activeSchoolYear->id)
            ->first();

        if (!$enrollment) {
            return response()->json(['error' => 'No enrollment found for this student'], 404);
        }

        // Get student's class schedule
        $schedule = DB::table('class')
            ->join('subjects', 'class.subject_id', '=', 'subjects.id')
            ->join('users as faculty', 'class.faculty_id', '=', 'faculty.id')
            ->leftJoin('sections', 'class.section_id', '=', 'sections.id')
            ->leftJoin('strands', 'subjects.strand_id', '=', 'strands.id')
            ->where('class.student_id', $studentId)
            ->where('class.school_year_id', $activeSchoolYear->id)
            ->select([
                'class.*',
                'subjects.name as subject_name',
                'subjects.code as subject_code',
                'subjects.units',
                'faculty.firstname as faculty_firstname',
                'faculty.lastname as faculty_lastname',
                'sections.section_name',
                'strands.name as strand_name',
                'strands.code as strand_code'
            ])
            ->orderBy('class.semester')
            ->orderBy('class.day_of_week')
            ->orderBy('class.start_time')
            ->get();

        // Get student personal info
        $personalInfo = DB::table('student_personal_info')
            ->where('user_id', $studentId)
            ->first();

        return response()->json([
            'success' => true,
            'student' => [
                'id' => $student->id,
                'firstname' => $student->firstname,
                'lastname' => $student->lastname,
                'email' => $student->email,
                'lrn' => $personalInfo->lrn ?? 'N/A',
                'grade_level' => $personalInfo->grade_level ?? 'N/A'
            ],
            'enrollment' => $enrollment,
            'schedule' => $schedule,
            'school_year' => $activeSchoolYear
        ], 200, [], JSON_PRETTY_PRINT);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to get student schedule',
            'message' => $e->getMessage()
        ], 500);
    }
})->name('coordinator.student.schedule');

// Routes for transferee subject crediting
Route::post('/coordinator/student/{studentId}/credit-subjects', [App\Http\Controllers\CoordinatorController::class, 'creditTransfereeSubjects'])
    ->name('coordinator.student.credit.subjects');

Route::get('/coordinator/student/{studentId}/credited-subjects', [App\Http\Controllers\CoordinatorController::class, 'getTransfereeCreditedSubjects'])
    ->name('coordinator.student.credited.subjects');

// Route for viewing student COR
Route::get('/coordinator/student/{studentId}/cor', [App\Http\Controllers\CoordinatorController::class, 'viewStudentCOR'])
    ->name('coordinator.student.cor');

// Route for previewing COR before enrollment
Route::post('/coordinator/student/{studentId}/preview-cor', [App\Http\Controllers\CoordinatorController::class, 'previewStudentCOR'])
    ->name('coordinator.student.preview.cor');

// Route to get all subjects for crediting (for transferees)
Route::get('/coordinator/subjects-for-crediting', function () {
    try {
        $subjects = \App\Models\Subject::with('strand')
            ->select('id', 'name', 'code', 'units', 'strand_id')
            ->orderBy('strand_id')
            ->orderBy('name')
            ->get();

        $subjectsByStrand = $subjects->groupBy('strand_id');

        return response()->json([
            'success' => true,
            'subjects' => $subjects,
            'subjectsByStrand' => $subjectsByStrand
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to get subjects: ' . $e->getMessage()
        ], 500);
    }
})->name('coordinator.subjects.for.crediting');

// Debug route to check enrollment data
Route::get('/debug/enrollment-status', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
    
    if (!$activeSchoolYear) {
        return response()->json(['error' => 'No active school year found']);
    }
    
    // Check all enrollment statuses
    $enrollmentStatuses = DB::table('enrollments')
        ->where('school_year_id', $activeSchoolYear->id)
        ->select('status', DB::raw('count(*) as count'))
        ->groupBy('status')
        ->get();
    
    // Check enrolled students specifically
    $enrolledStudents = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('enrollments.status', 'enrolled')
        ->where('users.role', 'student')
        ->select('users.firstname', 'users.lastname', 'enrollments.status', 'enrollments.grade_level')
        ->get();
    
    // Check all students with any status
    $allStudentEnrollments = DB::table('enrollments')
        ->join('users', 'enrollments.student_id', '=', 'users.id')
        ->where('enrollments.school_year_id', $activeSchoolYear->id)
        ->where('users.role', 'student')
        ->select('users.firstname', 'users.lastname', 'enrollments.status', 'enrollments.grade_level')
        ->get();
    
    return response()->json([
        'active_school_year' => $activeSchoolYear,
        'enrollment_statuses' => $enrollmentStatuses,
        'enrolled_students_count' => $enrolledStudents->count(),
        'enrolled_students_sample' => $enrolledStudents->take(5),
        'all_student_enrollments_count' => $allStudentEnrollments->count(),
        'all_student_enrollments_sample' => $allStudentEnrollments->take(5)
    ]);
})->name('debug.enrollment.status');

// Quick fix route to update enrollment statuses
Route::get('/debug/fix-enrollment-status', function () {
    $activeSchoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
    
    if (!$activeSchoolYear) {
        return response()->json(['error' => 'No active school year found']);
    }
    
    // Find students with 'approved' status and update to 'enrolled'
    $approvedStudents = DB::table('enrollments')
        ->where('school_year_id', $activeSchoolYear->id)
        ->where('status', 'approved')
        ->count();
    
    if ($approvedStudents > 0) {
        DB::table('enrollments')
            ->where('school_year_id', $activeSchoolYear->id)
            ->where('status', 'approved')
            ->update(['status' => 'enrolled']);
    }
    
    // Check results
    $enrolledCount = DB::table('enrollments')
        ->where('school_year_id', $activeSchoolYear->id)
        ->where('status', 'enrolled')
        ->count();
    
    return response()->json([
        'message' => 'Enrollment status fix completed',
        'approved_students_updated' => $approvedStudents,
        'total_enrolled_now' => $enrolledCount,
        'active_school_year_id' => $activeSchoolYear->id
    ]);
})->name('debug.fix.enrollment.status');
