<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistrarController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\ScheduleController;
use Illuminate\Http\Request;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\CoordinatorController;

/*
|--------------------------------------------------------------------------
| HCI Principle 1: Visibility of system status
| Clear routing structure with proper authentication flow
|--------------------------------------------------------------------------
*/

// Root route - Check authentication and redirect accordingly
Route::get('/', [AuthController::class, 'handleRootAccess'])->name('root');

// Authentication routes
Route::get('/login', function() {
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
| Public Authentication (With CSRF)
|--------------------------------------------------------------------------
*/



/*
|--------------------------------------------------------------------------
| Protected Routes (Requires Login)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {

    // Logout
    Route::post('/auth/logout', [AuthController::class, 'logout'])
        ->name('auth.logout');

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

    // Student routes (protected by auth middleware)
    Route::middleware(['auth:sanctum', 'role:student'])->group(function () {
        Route::get('/student/enrollment', fn() => Inertia::render('Student/Student_Enrollment'))
            ->name('student.enrollment.form');
        
       
        Route::get('/student/schedule', [StudentController::class, 'getSchedule'])
            ->name('student.schedule');
    });

    
    // Direct registrar dashboard route (no prefix)
    Route::get('/registrar/dashboard', fn() => Inertia::render('Registrar/RegistrarDashboard'))
        ->middleware('auth:sanctum')
        ->name('registrar.dashboard');
    
    Route::prefix('registrar')->middleware(['hybrid.auth'])->group(function () {

        // Dashboard
        Route::get('/dashboard', function () {
            return Inertia::render('Registrar/RegistrarDashboard');
        })->name('registrar.dashboard');

        // Schedule Management Routes (New)
        Route::prefix('schedules')->group(function () {
            Route::get('/', [ScheduleController::class, 'index'])->name('registrar.schedules.index');
            Route::post('/', [ScheduleController::class, 'store'])->name('registrar.schedules.store');
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

        // Student Management
        Route::get('/students', [RegistrarController::class, 'studentsPage'])->name('registrar.students');
        Route::post('/students', [RegistrarController::class, 'createStudent'])->name('registrar.students.create');
        Route::put('/students/{id}', [RegistrarController::class, 'updateStudent'])->name('registrar.students.update');
        Route::delete('/students/{id}', [RegistrarController::class, 'deleteStudent'])->name('registrar.students.delete');

        // Section Management
        Route::get('/sections', [RegistrarController::class, 'sectionsPage'])->name('registrar.sections');
        Route::post('/sections', [RegistrarController::class, 'createSection'])->name('registrar.sections.create');
        Route::put('/sections/{id}', [RegistrarController::class, 'updateSection'])->name('registrar.sections.update');
        Route::delete('/sections/{id}', [RegistrarController::class, 'deleteSection'])->name('registrar.sections.delete');

        // Class/Subject Management
        Route::get('/class', [RegistrarController::class, 'classPage'])->name('registrar.class');
        Route::get('/strands', [RegistrarController::class, 'strandsPage'])->name('registrar.strands');
        Route::get('/subjects', [RegistrarController::class, 'subjectsPage'])->name('registrar.subjects');
        Route::get('/subjects/cor/{strandId}', [RegistrarController::class, 'subjectsCOR'])->name('registrar.subjects.cor');
        Route::get('/subjects/cor/{sectionId}', [RegistrarController::class, 'sectionCOR'])->name('registrar.section.cor');
        Route::post('/strands', [RegistrarController::class, 'createStrand'])->name('registrar.strands.create');
        Route::put('/strands/{id}', [RegistrarController::class, 'updateStrand'])->name('registrar.strands.update');
        Route::delete('/strands/{id}', [RegistrarController::class, 'deleteStrand'])->name('registrar.strands.delete');
        Route::post('/subjects', [RegistrarController::class, 'createSubject'])->name('registrar.subjects.create');
        Route::put('/subjects/{id}', [RegistrarController::class, 'updateSubject'])->name('registrar.subjects.update');
        Route::delete('/subjects/{id}', [RegistrarController::class, 'deleteSubject'])->name('registrar.subjects.delete');

        // Semester Management
        Route::get('/semesters', [RegistrarController::class, 'semestersPage'])->name('registrar.semesters');
        Route::post('/semesters', [RegistrarController::class, 'createSemester'])->name('registrar.semesters.create');
        Route::put('/semesters/{id}', [RegistrarController::class, 'updateSemester'])->name('registrar.semesters.update');
        Route::delete('/semesters/{id}', [RegistrarController::class, 'deleteSemester'])->name('registrar.semesters.delete');

        // Profile Management
        Route::get('/profile', [RegistrarController::class, 'profilePage'])->name('registrar.profile');
        Route::put('/profile', [RegistrarController::class, 'updateProfile'])->name('registrar.profile.update');

        // Grades Management
        Route::get('/grades', [RegistrarController::class, 'gradesPage'])->name('registrar.grades');

        // School Year Management Routes
        Route::get('/school-years', [RegistrarController::class, 'schoolYearsPage'])->name('registrar.school-years');
        Route::post('/school-years', [RegistrarController::class, 'createSchoolYear'])->name('registrar.school-years.create');
        Route::put('/school-years/{id}', [RegistrarController::class, 'updateSchoolYear'])->name('registrar.school-years.update');
        Route::delete('/school-years/{id}', [RegistrarController::class, 'deleteSchoolYear'])->name('registrar.school-years.delete');
        Route::put('/school-years/{id}/activate', [RegistrarController::class, 'activateSchoolYear'])->name('registrar.school-years.activate');
        Route::put('/school-years/{id}/toggle', [RegistrarController::class, 'toggleSchoolYear'])->name('registrar.school-years.toggle');
        Route::put('/school-years/deactivate-expired', [RegistrarController::class, 'deactivateExpired'])->name('registrar.school-years.deactivate-expired');
        Route::get('/school-years/status/{id?}', [RegistrarController::class, 'getSemesterStatus'])->name('registrar.school-years.status');
        Route::post('/school-years/auto-deactivate', [RegistrarController::class, 'autoDeactivateExpired'])->name('registrar.school-years.auto-deactivate');

        // Data fetching routes for schedule management - REMOVED CONFLICTING ROUTES
        // These routes were conflicting with page routes and causing JSON responses
        // Route::get('/strands', [RegistrarController::class, 'getStrands'])->name('registrar.strands');
        // Route::get('/faculty-data', [RegistrarController::class, 'getFaculty'])->name('registrar.faculty.data');
        // Route::get('/subjects', [RegistrarController::class, 'getSubjects'])->name('registrar.subjects.data');

    });

    // School Years route - accessible without registrar prefix
    Route::get('/school-years', [RegistrarController::class, 'getSchoolYears'])
        ->middleware(['hybrid.auth'])
        ->name('school-years');
    Route::post('/school-years', [RegistrarController::class, 'storeSchoolYear'])
        ->middleware(['hybrid.auth'])
        ->name('school-years.store');
    Route::put('/school-years/{id}', [RegistrarController::class, 'updateSchoolYear'])
        ->middleware(['hybrid.auth'])
        ->name('school-years.update');
    Route::delete('/school-years/{id}', [RegistrarController::class, 'deleteSchoolYear'])
        ->middleware(['hybrid.auth'])
        ->name('school-years.delete');
    Route::put('/school-years/{id}/toggle', [RegistrarController::class, 'toggleSchoolYear'])
        ->middleware(['hybrid.auth'])
        ->name('school-years.toggle');

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

   
    // Direct student dashboard route (no prefix)
    Route::get('/student/dashboard', fn() => Inertia::render('Student/Student_Dashboard'))
        ->middleware('auth:sanctum')
        ->name('student.dashboard');
    
    Route::prefix('student')->middleware(['hybrid.auth'])->group(function () {

        // Enroll Page
        Route::get('/enroll', function(Request $request) {
            // Only show strands if there's an active school year/semester
            $activeSchoolYear = \App\Models\SchoolYear::getActive();
            $strands = $activeSchoolYear ? \App\Models\Strand::orderBy('code')->get() : collect();
            $user = $request->user();
            return Inertia::render('Student/Student_Enroll', [
                'availableStrands' => $strands,
                'activeSchoolYear' => $activeSchoolYear,
                'user' => $user
            ]);
        })->name('student.enroll');

        // Enrollment endpoint
        Route::post('/enroll', [App\Http\Controllers\StudentController::class, 'enroll'])->name('student.enroll.store');

        // (Optional) 
        Route::get('/', [AuthController::class, 'listStudents'])->name('students.index');
        Route::get('/{id}', [AuthController::class, 'showStudent'])->name('students.show');
        Route::put('/{id}', [AuthController::class, 'updateStudent'])->name('students.update');
        Route::delete('/{id}', [AuthController::class, 'deleteStudent'])->name('students.delete');
    });

   
    // Direct faculty dashboard route (no prefix)
    Route::get('/faculty/dashboard', fn() => Inertia::render('Faculty/Faculty_Dashboard'))
        ->middleware('auth:sanctum')
        ->name('faculty.dashboard');
    
    Route::prefix('faculty')->middleware(['hybrid.auth'])->group(function () {

        // Faculty Schedule
        Route::get('/schedule', [App\Http\Controllers\FacultyController::class, 'schedulePage'])
            ->name('faculty.schedule');

        // Faculty Classes
        Route::get('/classes', fn() => Inertia::render('Faculty/Faculty_Classes'))
            ->name('faculty.classes');

        // Faculty Grade Input
        Route::get('/grades', [App\Http\Controllers\FacultyController::class, 'gradesPage'])
            ->name('faculty.grades');

        // Faculty Profile
        Route::get('/profile', [App\Http\Controllers\FacultyController::class, 'profilePage'])
            ->name('faculty.profile');

        // Faculty status route
        Route::get('/status', [App\Http\Controllers\FacultyController::class, 'getStatus'])
            ->name('faculty.status');

        // Faculty Students/Assignment
        Route::get('/students', [App\Http\Controllers\FacultyController::class, 'studentsPage'])
            ->name('faculty.students');

        // Coordinator functionality within Faculty routes
        Route::get('/enrollment', [App\Http\Controllers\CoordinatorController::class, 'enrollmentPage'])
            ->name('faculty.enrollment');
        Route::post('/students/{student}/reject', [App\Http\Controllers\CoordinatorController::class, 'rejectStudent'])
            ->name('coordinator.students.reject');
        Route::post('/students/{student}/finalize', [App\Http\Controllers\CoordinatorController::class, 'finalizeStudent'])
            ->name('coordinator.students.finalize');
    });

    /*
    |--------------------------------------------------------------------------
    | Coordinator  Routes (Faculty with Coordinator Status)
    |--------------------------------------------------------------------------
    */
    Route::prefix('coordinator')->middleware(['hybrid.auth'])->group(function () {
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
            ->name('coordinator.enrollment.approve');
        Route::post('/students/{id}/reject', [App\Http\Controllers\CoordinatorController::class, 'rejectEnrollment'])
            ->name('coordinator.enrollment.reject');
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
    })->middleware(['auth:sanctum'])->name('enrollment.document');

    /*
    |--------------------------------------------------------------------------
    | Storage File Access
    |--------------------------------------------------------------------------
    */

    // Protected file access for enrollment documents
    Route::middleware(['auth:sanctum'])->group(function () {
        // Student schedule route
        Route::get('/student/{id}/schedule', [App\Http\Controllers\ScheduleController::class, 'getStudentSchedule'])
            ->name('student.schedule.data');
        
        // Student notifications route
        Route::get('/student/notifications', [App\Http\Controllers\StudentController::class, 'getNotifications'])
            ->name('student.notifications.data');
    });

});

// Student schedule routes
Route::get('/student/{student}/schedule', [App\Http\Controllers\ScheduleController::class, 'getStudentSchedule']);
