<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Artisan;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistrarController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\CoordinatorController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\PasswordResetController;
use Inertia\Inertia;

/*
{{ ... }}
|--------------------------------------------------------------------------
| HCI Principle 1: Visibility of system status
| Clear routing structure with proper authentication flow
|--------------------------------------------------------------------------
*/

// Emergency login route removed - using proper /auth/login endpoint

// Root route - redirect to login
Route::get('/', function () {
    return redirect('/login');
})->name('home');

// Login Page
Route::get('/login', function () {
    return Inertia::render('Auth/Login');
})->name('login');

// Student Register Page (optional)
Route::get('/student/register', fn() => Inertia::render('Auth/Student_Register'))
    ->name('student.register');

// Alternative student register route to match frontend links
Route::get('/register/student', fn() => Inertia::render('Auth/Student_Register'))
    ->name('register.student');

// Legacy route redirects to unified login
Route::get('/faculty/login', fn() => redirect('/login'))
    ->name('faculty.login');

Route::get('/coordinator/login', fn() => redirect('/login'))
    ->name('coordinator.login');

Route::get('/student/login', fn() => redirect('/login'))
    ->name('student.login');

// Password Change Page
Route::get('/change-password', function (Request $request) {
    return Inertia::render('Auth/Change_Password', [
        'userType' => $request->query('userType', 'faculty')
    ]);
})->name('change.password');

// Forgot Password Pages
Route::get('/forgot-password', [App\Http\Controllers\PasswordResetController::class, 'showForgotPasswordForm'])
    ->name('forgot.password');

Route::get('/reset-password', [App\Http\Controllers\PasswordResetController::class, 'showResetPasswordForm'])
    ->name('reset.password');

// Registrar Register Page
Route::get('/register/registrar', fn() => Inertia::render('Auth/RegisterRegistrar'))
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

// Registrar Dashboard - temporarily outside auth middleware
Route::get('/registrar/dashboard', function() {
    return Inertia::render('Registrar/RegistrarDashboard');
})->name('registrar.dashboard');

// Student Dashboard - temporarily outside auth middleware  
Route::get('/student/dashboard', function() {
    return Inertia::render('Student/Student_Dashboard');
})->name('student.dashboard');

// Faculty Dashboard - temporarily outside auth middleware
Route::get('/faculty/dashboard', function() {
    return Inertia::render('Faculty/Faculty_Dashboard');
})->name('faculty.dashboard');

/*
|--------------------------------------------------------------------------
| Protected Routes (Requires Login)
|--------------------------------------------------------------------------
*/
Route::group(['middleware' => 'auth:sanctum'], function () {

    // Current authenticated user
    Route::get('/user', fn(Request $request) => $request->user())
        ->name('user');

    // Debug route to check database data
    Route::get('/debug/database', [App\Http\Controllers\ScheduleController::class, 'debugDatabaseData'])
        ->name('debug.database');

    // Debug route for testing database schema
    Route::get('/debug-schema', function() {
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
    
    Route::prefix('registrar')->group(function () {

        // Schedule Management Routes (Requires Active School Year)
        Route::prefix('schedules')->middleware(['require.active.school.year'])->group(function () {
            Route::get('/', [ScheduleController::class, 'index'])->name('registrar.schedules.index');
            Route::post('/', [ScheduleController::class, 'store'])->name('registrar.schedules.store');
            Route::post('/bulk', [ScheduleController::class, 'bulkCreate'])->name('registrar.schedules.bulk');
            Route::put('/{schedule}', [ScheduleController::class, 'update'])->name('registrar.schedules.update');
            Route::delete('/{schedule}', [ScheduleController::class, 'destroy'])->name('registrar.schedules.destroy');
            Route::post('/bulk-assign', [ScheduleController::class, 'bulkAssign'])->name('registrar.schedules.bulk-assign');
            Route::get('/conflicts', [ScheduleController::class, 'checkConflicts'])->name('registrar.schedules.conflicts');
            Route::get('/check-data', [ScheduleController::class, 'checkScheduleData'])->name('registrar.schedules.check-data');
        });

        // Faculty Management
        Route::get('/faculty', [RegistrarController::class, 'facultyPage'])->name('registrar.faculty');
        Route::post('/faculty', [RegistrarController::class, 'createFaculty'])->name('registrar.faculty.create');
        Route::put('/faculty/{id}', [RegistrarController::class, 'updateFaculty'])->name('registrar.faculty.update');
        Route::delete('/faculty/{id}', [RegistrarController::class, 'deleteFaculty'])->name('registrar.faculty.delete');
        Route::post('/faculty/{id}/toggle-status', [RegistrarController::class, 'toggleFacultyStatus'])->name('registrar.faculty.toggle-status');

        // Section Management (Requires Active School Year for creation/modification)
        Route::get('/sections', [RegistrarController::class, 'sectionsPage'])->name('registrar.sections');
        Route::post('/sections', [RegistrarController::class, 'createSection'])->middleware(['require.active.school.year'])->name('registrar.sections.create');
        Route::put('/sections/{id}', [RegistrarController::class, 'updateSection'])->middleware(['require.active.school.year'])->name('registrar.sections.update');
        Route::delete('/sections/{id}', [RegistrarController::class, 'deleteSection'])->name('registrar.sections.delete');

        // Class/Subject Management
        Route::get('/class', [RegistrarController::class, 'classPage'])->name('registrar.class');
        Route::get('/strands', [RegistrarController::class, 'strandsPage'])->name('registrar.strands');
        Route::get('/subjects', [RegistrarController::class, 'subjectsPage'])->name('registrar.subjects');
        Route::get('/subjects/cor/{strandId}', [RegistrarController::class, 'subjectsCOR'])->name('registrar.subjects.cor');
        Route::get('/subjects/cor/{sectionId}/{studentId?}', [RegistrarController::class, 'sectionCOR'])->name('registrar.section.cor');
        Route::post('/strands', [RegistrarController::class, 'createStrand'])->name('registrar.strands.create');
        Route::put('/strands/{id}', [RegistrarController::class, 'updateStrand'])->name('registrar.strands.update');
        Route::delete('/strands/{id}', [RegistrarController::class, 'deleteStrand'])->name('registrar.strands.delete');
        Route::post('/subjects', [RegistrarController::class, 'createSubject'])->middleware(['require.active.school.year'])->name('registrar.subjects.create');
        Route::put('/subjects/{id}', [RegistrarController::class, 'updateSubject'])->middleware(['require.active.school.year'])->name('registrar.subjects.update');
        Route::delete('/subjects/{id}', [RegistrarController::class, 'deleteSubject'])->name('registrar.subjects.delete');

        // Semester Management
        Route::get('/semesters', [RegistrarController::class, 'semestersPage'])->name('registrar.semesters');
        Route::post('/semesters', [RegistrarController::class, 'createSemester'])->name('registrar.semesters.create');
        Route::put('/semesters/{id}', [RegistrarController::class, 'updateSemester'])->name('registrar.semesters.update');
        Route::delete('/semesters/{id}', [RegistrarController::class, 'deleteSemester'])->name('registrar.semesters.delete');

        // Profile Management
        Route::get('/profile', [RegistrarController::class, 'profilePage'])->name('registrar.profile');

        // School Year Status
        Route::get('/school-year-status', function () {
            return response()->json(\App\Services\SchoolYearService::getStatusForFrontend());
        })->name('registrar.school-year-status');
        Route::put('/profile', [RegistrarController::class, 'updateProfile'])->name('registrar.profile.update');

        // Grades Management - Updated for Philippine SHS
        Route::get('/grades', function() {
            return Inertia::render('Registrar/RegistrarGrades');
        })->name('registrar.grades');
        
        // NEW: Student-based grade approval system
        Route::get('/grades/students/pending', [RegistrarController::class, 'getStudentsWithPendingGrades'])->name('registrar.grades.students.pending');
        Route::post('/grades/students/{studentId}/approve', [RegistrarController::class, 'approveStudentGrades'])->name('registrar.grades.student.approve');
        Route::post('/grades/students/{studentId}/reject', [RegistrarController::class, 'rejectStudentGrades'])->name('registrar.grades.student.reject');
        
        // Grade management routes
        Route::get('/grades/pending', [RegistrarController::class, 'pendingGrades'])->name('registrar.grades.pending');
        
        // ✅ FIXED: Added missing grade approval routes
        Route::post('/grades/{gradeId}/approve', [RegistrarController::class, 'approveGrade'])->name('registrar.grades.approve');
        Route::post('/grades/{gradeId}/reject', [RegistrarController::class, 'rejectGrade'])->name('registrar.grades.reject');
        Route::post('/grades/bulk-approve', [RegistrarController::class, 'bulkApproveGrades'])->name('registrar.grades.bulk.approve');
        Route::post('/grades/bulk-reject', [RegistrarController::class, 'bulkRejectGrades'])->name('registrar.grades.bulk.reject');
        
        // ✅ NEW: Registrar-only grade editing
        Route::put('/grades/{gradeId}/edit', [RegistrarController::class, 'editGrade'])->name('registrar.grades.edit');
        
        // TODO: Implement these methods when needed
        // Route::get('/grades/statistics/{schoolYearId?}', [RegistrarController::class, 'getGradeStatistics'])->name('registrar.grades.statistics');
        // Route::get('/grades/export/{semester}/{schoolYearId?}', [RegistrarController::class, 'exportGradesBySemester'])->name('registrar.grades.export.semester');
        
        // NEW: Semester-based subject filtering
        Route::get('/subjects/semester/{semester}', [RegistrarController::class, 'getSubjectsBySemester'])
            ->name('registrar.subjects.semester');

        // School Year Management Routes
        Route::get('/school-years', [RegistrarController::class, 'schoolYearsPage'])->name('registrar.school-years');
        Route::post('/school-years', [RegistrarController::class, 'createSchoolYear'])->name('registrar.school-years.create');
        Route::post('/school-years/create-full-year', [RegistrarController::class, 'createFullAcademicYear'])->name('registrar.school-years.create-full-year');
        Route::put('/school-years/{id}', [RegistrarController::class, 'updateSchoolYear'])->name('registrar.school-years.update');
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

        // Settings routes
        Route::get('/settings', [RegistrarController::class, 'settingsPage'])->name('registrar.settings');
        Route::post('/settings/toggle-enrollment', [RegistrarController::class, 'toggleEnrollment'])->name('registrar.settings.toggle-enrollment');
        Route::post('/settings/toggle-faculty-cor-print', [RegistrarController::class, 'toggleFacultyCorPrint'])
            ->name('registrar.settings.toggle-faculty-cor-print');
        Route::post('/settings/toggle-coordinator-cor-print', [RegistrarController::class, 'toggleCoordinatorCorPrint'])
            ->name('registrar.settings.toggle-coordinator-cor-print');

        // Reports routes
        Route::get('/reports', [RegistrarController::class, 'reportsPage'])->name('registrar.reports');
        Route::get('/reports/filter-options', [RegistrarController::class, 'getReportFilterOptions'])->name('registrar.reports.filter-options');
        Route::get('/reports/generate', [RegistrarController::class, 'generateReport'])->name('registrar.reports.generate');
        Route::get('/reports/export', [RegistrarController::class, 'exportReport'])->name('registrar.reports.export');
        
        // Fix enrollment issues
        Route::post('/fix-enrollment-issues', [RegistrarController::class, 'fixEnrollmentIssues'])->name('registrar.fix-enrollment-issues');

        // Dashboard data routes
        Route::get('/dashboard-stats', [RegistrarController::class, 'getDashboardStatsApi'])->name('registrar.dashboard-stats');
        Route::get('/enrolled-students-per-strand', [RegistrarController::class, 'getEnrolledStudentsPerStrand'])->name('registrar.enrolled-students-per-strand');

        // Data fetching routes for schedule management - REMOVED CONFLICTING ROUTES
        // These routes were conflicting with page routes and causing JSON responses
        // Route::get('/strands', [RegistrarController::class, 'getStrands'])->name('registrar.strands');
        // Route::get('/faculty-data', [RegistrarController::class, 'getFaculty'])->name('registrar.faculty.data');
        // Route::get('/subjects', [RegistrarController::class, 'getSubjects'])->name('registrar.subjects.data');

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
    
    // Student API routes - moved here to fix 404 issues
    Route::get('/student/schedule-data', [App\Http\Controllers\StudentController::class, 'getScheduleData'])
        ->name('student.schedule.data');
    Route::get('/student/enrollment-status', [App\Http\Controllers\StudentController::class, 'getEnrollmentStatus'])
        ->name('student.enrollment.status');
    Route::get('/student/schedule', [App\Http\Controllers\StudentController::class, 'schedulePage'])
        ->name('student.schedule');
    Route::get('/student/enrollment', [App\Http\Controllers\StudentController::class, 'enrollmentPage'])
        ->name('student.enrollment');
    Route::get('/student/profile', [App\Http\Controllers\StudentController::class, 'profilePage'])
        ->name('student.profile');
    
    Route::prefix('student')->group(function () {

        // Student Grades Page - Updated for Philippine SHS semester system
        Route::get('/grades', [App\Http\Controllers\StudentController::class, 'gradesPage'])
            ->name('student.grades');
        
        // NEW: Get grades for specific semester
        Route::get('/grades/{semester}', [App\Http\Controllers\StudentController::class, 'getSemesterGrades'])
            ->name('student.grades.semester');
        
        // NEW: Get complete academic record
        Route::get('/academic-record', [App\Http\Controllers\StudentController::class, 'getAcademicRecord'])
            ->name('student.academic.record');

        // Enroll Page - Philippine SHS System
        Route::get('/enroll', [StudentController::class, 'enrollmentPage'])->name('student.enroll');

        // Enrollment endpoint
        Route::post('/enroll', [App\Http\Controllers\StudentController::class, 'enroll'])->name('student.enroll.store');

        // (Optional) 
        Route::get('/', [AuthController::class, 'listStudents'])->name('students.index');
        Route::get('/{id}', [AuthController::class, 'showStudent'])->name('students.show');
        Route::put('/{id}', [AuthController::class, 'updateStudent'])->name('students.update');
        Route::delete('/{id}', [AuthController::class, 'deleteStudent'])->name('students.delete');
    });

   
    // Faculty dashboard route moved outside auth middleware
    
    Route::prefix('faculty')->group(function () {

        // Faculty Schedule - Temporary simple test
        Route::get('/schedule-test', function() {
            return response()->json([
                'message' => 'Schedule route is working!',
                'user' => \Illuminate\Support\Facades\Auth::user(),
                'timestamp' => now()
            ]);
        })->name('faculty.schedule.test');

        // Faculty Schedule
        Route::get('/schedule', [App\Http\Controllers\FacultyController::class, 'schedulePage'])
            ->name('faculty.schedule');
            
        // Debug route to test faculty schedule access
        Route::get('/schedule-debug', function() {
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

        // Faculty Classes
        Route::get('/classes', [App\Http\Controllers\FacultyController::class, 'classesPage'])
            ->name('faculty.classes');
        
        // Excel Export/Import (Put specific routes before generic ones)
        Route::get('/classes/{classId}/export-students', [App\Http\Controllers\FacultyController::class, 'exportStudentList'])
            ->name('faculty.classes.export-students');
            
        // Simple test route to verify faculty access
        Route::get('/test-access', function() {
            return response()->json([
                'message' => 'Faculty routes are accessible',
                'timestamp' => now(),
                'user' => \Illuminate\Support\Facades\Auth::user()
            ]);
        })->name('faculty.test.access');
        Route::get('/test-export-simple', function() {
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
        Route::post('/test-post-grades', function() {
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
        

        // Faculty Grade Management - Updated for Philippine SHS
        Route::get('/grades', [App\Http\Controllers\FacultyController::class, 'gradesPage'])
            ->name('faculty.grades');
            
        // Get section and subject grades (both semesters)
        Route::get('/grades/section/{sectionId}/subject/{subjectId}', [App\Http\Controllers\FacultyController::class, 'getSectionSubjectGrades'])
            ->name('faculty.grades.section.subject');
            
        // Test auth route
        Route::post('/test-auth', function(Request $request) {
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
        Route::get('/clear-auth-loop', function() {
            return response()->json([
                'message' => 'Auth loop cleared',
                'instructions' => 'Clear browser localStorage and sessionStorage, then refresh'
            ]);
        })->name('clear.auth.loop');

        // Debug route to check users (REMOVE IN PRODUCTION)
        Route::get('/debug-users', function() {
            $users = DB::table('users')->select('id', 'firstname', 'lastname', 'email', 'role', 'created_at')->get();
            return response()->json([
                'total_users' => $users->count(),
                'users' => $users,
                'registrar_exists' => DB::table('users')->where('role', 'registrar')->exists(),
                'faculty_exists' => DB::table('users')->where('role', 'faculty')->exists(),
                'student_exists' => DB::table('users')->where('role', 'student')->exists()
            ]);
        })->name('debug.users');

        // Create test registrar user (REMOVE IN PRODUCTION)
        Route::get('/create-test-registrar', function() {
            $existingUser = DB::table('users')->where('email', 'registrar@onsts.edu')->first();
            
            if ($existingUser) {
                return response()->json([
                    'message' => 'Test registrar already exists',
                    'email' => 'registrar@onsts.edu',
                    'password' => 'password123',
                    'user' => $existingUser
                ]);
            }

            $userId = DB::table('users')->insertGetId([
                'firstname' => 'Test',
                'lastname' => 'Registrar',
                'email' => 'registrar@onsts.edu',
                'password' => Hash::make('password123'),
                'role' => 'registrar',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'message' => 'Test registrar created successfully',
                'email' => 'registrar@onsts.edu',
                'password' => 'password123',
                'user_id' => $userId,
                'instructions' => 'You can now login with these credentials'
            ]);
        })->name('create.test.registrar');

        // Clear application cache (for debugging)
        Route::get('/clear-cache', function() {
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
        Route::get('/reset-auth', function() {
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
        Route::get('/clear-redirect-loops', function() {
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
        Route::get('/debug-data', function() {
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
        Route::get('/fix-assignments', function() {
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
        Route::get('/assign-to-current', function() {
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
        Route::get('/force-reassign', function() {
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
        Route::get('/fix-student-classes', function() {
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
        Route::get('/debug-enrollment-data', function() {
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
        Route::get('/test-registrar-reports', function() {
            try {
                // Test the exact same logic as RegistrarController
                $query = DB::table('users')
                    ->leftJoin('enrollments', 'users.id', '=', 'enrollments.student_id')
                    ->leftJoin('sections', 'enrollments.assigned_section_id', '=', 'sections.id')
                    ->leftJoin('strands', function($join) {
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
        Route::get('/debug-grade-input-issue', function() {
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
        Route::get('/fix-class-details-assignments', function() {
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
                    if ($detail->detail_section_id != $detail->enrollment_section_id || 
                        $detail->detail_section_id != $detail->class_section_id) {
                        
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
        Route::get('/fix-missing-class-details', function() {
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
                        ->where(function($query) use ($strandId) {
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
        Route::get('/check-user-ids', function() {
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
        Route::get('/fix-user-mismatch', function() {
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

        // Create test students and enrollments
        Route::get('/create-test-students', function() {
            // Create 3 test students
            $students = [];
            for ($i = 1; $i <= 3; $i++) {
                $student = \Illuminate\Support\Facades\DB::table('users')->insertGetId([
                    'firstname' => 'Student',
                    'lastname' => "Test{$i}",
                    'email' => "student{$i}@test.com",
                    'password' => bcrypt('password'),
                    'role' => 'student',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                // Create student personal info
                \Illuminate\Support\Facades\DB::table('student_personal_info')->insert([
                    'user_id' => $student,
                    'lrn' => '12345678901' . $i,
                    'grade_level' => '12',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                $students[] = $student;
            }
            
            // Get active school year
            $schoolYear = \Illuminate\Support\Facades\DB::table('school_years')->where('is_active', true)->first();
            
            // Enroll students in different sections
            $sections = [1, 2, 4]; // Different sections
            
            foreach ($students as $index => $studentId) {
                $sectionId = $sections[$index];
                
                $enrollmentId = \Illuminate\Support\Facades\DB::table('enrollments')->insertGetId([
                    'student_id' => $studentId,
                    'school_year_id' => $schoolYear->id,
                    'assigned_section_id' => $sectionId,
                    'status' => 'enrolled',
                    'enrollment_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                // Create class_details for all classes in the section
                $classes = \Illuminate\Support\Facades\DB::table('class')
                    ->where('section_id', $sectionId)
                    ->where('school_year_id', $schoolYear->id)
                    ->where('is_active', true)
                    ->get();
                    
                foreach ($classes as $class) {
                    \Illuminate\Support\Facades\DB::table('class_details')->insert([
                        'enrollment_id' => $enrollmentId,
                        'class_id' => $class->id,
                        'is_enrolled' => true,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
            
            return response()->json([
                'message' => 'Test students created and enrolled',
                'students_created' => count($students),
                'student_ids' => $students,
                'sections_enrolled' => $sections,
                'total_enrollments' => \Illuminate\Support\Facades\DB::table('enrollments')->count(),
                'total_class_details' => \Illuminate\Support\Facades\DB::table('class_details')->count()
            ]);
        })->name('faculty.create.test.students');

        // Faculty Students/Assignment
        Route::get('/students', [App\Http\Controllers\FacultyController::class, 'studentsPage'])
            ->name('faculty.students');
            
        // Manual populate class_details table (for initial setup)
        Route::post('/populate-class-details', [App\Http\Controllers\FacultyController::class, 'populateClassDetails'])
            ->name('faculty.populate-class-details');

        // Coordinator functionality within Faculty routes
        Route::get('/enrollment', [App\Http\Controllers\CoordinatorController::class, 'enrollmentPage'])
            ->name('faculty.enrollment');
        
        // Manual Enrollment for Coordinators
        Route::get('/manual-enrollment', [App\Http\Controllers\FacultyController::class, 'manualEnrollmentPage'])
            ->name('faculty.manual-enrollment');
        Route::post('/manual-enrollment', [App\Http\Controllers\FacultyController::class, 'processManualEnrollment'])
            ->name('faculty.manual-enrollment.process');
            
        // Grade Progression Page for Coordinators
        Route::get('/progression', [App\Http\Controllers\FacultyController::class, 'progressionPage'])
            ->name('faculty.progression');
            
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
        // Save grades - Now requires semester parameter
        Route::post('/grades/save', [App\Http\Controllers\FacultyController::class, 'saveGrades'])
            ->name('faculty.grades.save');
            
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
    });


    /*
    |--------------------------------------------------------------------------
    | Coordinator  Routes (Faculty with Coordinator Status)
    |--------------------------------------------------------------------------
    */
    Route::prefix('coordinator')->group(function () {
        // New Enrollment Management Routes
        Route::get('/enrollment', [EnrollmentController::class, 'coordinatorIndex'])
            ->name('coordinator.enrollment');
        Route::post('/enrollments/{enrollment}/approve', [EnrollmentController::class, 'approve'])
            ->name('coordinator.enrollment.approve');
        Route::post('/enrollments/{enrollment}/reject', [EnrollmentController::class, 'reject'])
            ->name('coordinator.enrollment.reject');
        Route::post('/enrollments/{enrollment}/enroll-classes', [EnrollmentController::class, 'enrollInClasses'])
            ->name('coordinator.enrollment.enroll-classes');
        Route::get('/enrollments/{enrollment}/schedules', [EnrollmentController::class, 'getClassSchedules'])
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
        Route::post('/populate-class-details', function() {
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
Route::get('/profile', function() {
    return response()->json([
        'error' => 'Profile route accessed without prefix',
        'message' => 'Use /student/profile, /faculty/profile, or /registrar/profile instead',
        'redirect' => '/student/profile'
    ], 404);
});

// Test export route - outside middleware for testing
Route::get('/test-export', function() {
    try {
        \Illuminate\Support\Facades\Log::info('🔴 TEST EXPORT ROUTE HIT SUCCESSFULLY!');
        
        $csvContent = "Student Name,Semester,1st Quarter,2nd Quarter,Semester Grade,Remarks\n";
        $csvContent .= "Test Student 1,1st Semester,85,88,86.5,Good performance\n";
        $csvContent .= "Test Student 1,2nd Semester,90,87,88.5,Excellent improvement\n";
        $csvContent .= "Test Student 2,1st Semester,78,82,80.0,Satisfactory\n";
        
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
