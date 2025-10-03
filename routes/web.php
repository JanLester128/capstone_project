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
        Route::get('/student/enrollment', [StudentController::class, 'enrollmentPage'])
            ->name('student.enrollment.form');
        
       
        Route::get('/student/schedule', [StudentController::class, 'getSchedule'])
            ->name('student.schedule');
        Route::get('/student/schedule-data', [StudentController::class, 'getScheduleData'])
            ->name('student.schedule.data');
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

        // Student Management
        Route::get('/students', [RegistrarController::class, 'studentsPage'])->name('registrar.students');
        Route::post('/students', [RegistrarController::class, 'createStudent'])->name('registrar.students.create');
        Route::put('/students/{id}', [RegistrarController::class, 'updateStudent'])->name('registrar.students.update');
        Route::delete('/students/{id}', [RegistrarController::class, 'deleteStudent'])->name('registrar.students.delete');

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

        // School Year Status API
        Route::get('/api/school-year-status', function () {
            return response()->json(\App\Services\SchoolYearService::getStatusForFrontend());
        })->name('registrar.api.school-year-status');
        Route::put('/profile', [RegistrarController::class, 'updateProfile'])->name('registrar.profile.update');

        // Grades Management - Updated for Philippine SHS
        Route::get('/grades', [RegistrarController::class, 'gradesPage'])->name('registrar.grades');
        
        // NEW: Semester-based grade reports
        Route::get('/grades/{semester}', [RegistrarController::class, 'getGradesBySemester'])->name('registrar.grades.semester');
        Route::get('/grades/statistics/{schoolYearId?}', [RegistrarController::class, 'getGradeStatistics'])->name('registrar.grades.statistics');
        Route::get('/grades/export/{semester}/{schoolYearId?}', [RegistrarController::class, 'exportGradesBySemester'])->name('registrar.grades.export.semester');
        
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

        // Data fetching routes for schedule management - REMOVED CONFLICTING ROUTES
        // These routes were conflicting with page routes and causing JSON responses
        // Route::get('/strands', [RegistrarController::class, 'getStrands'])->name('registrar.strands');
        // Route::get('/faculty-data', [RegistrarController::class, 'getFaculty'])->name('registrar.faculty.data');
        // Route::get('/subjects', [RegistrarController::class, 'getSubjects'])->name('registrar.subjects.data');

    });

    // Philippine SHS System API Routes
    Route::prefix('api')->middleware(['hybrid.auth'])->group(function () {
        // School year progression status
        Route::get('/school-years/progression-status', [RegistrarController::class, 'getProgressionStatus'])
            ->name('api.school-years.progression-status');
        
        // Student grade progression
        Route::post('/students/progress-grade', [FacultyController::class, 'progressStudentGrade'])
            ->name('api.students.progress-grade');
        
        
        Route::get('/students/{studentId}/grades/summary', [FacultyController::class, 'getStudentGradesSummary'])
            ->name('api.student.grades.summary');
        
        Route::post('/grades/validate', [FacultyController::class, 'validateGradeInput'])
            ->name('api.grades.validate');
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

   
    // Direct student dashboard route (no prefix)
    Route::get('/student/dashboard', fn() => Inertia::render('Student/Student_Dashboard'))
        ->middleware('auth:sanctum')
        ->name('student.dashboard');
    
    Route::prefix('student')->middleware(['hybrid.auth'])->group(function () {

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

   
    // Direct faculty dashboard route (no prefix)
    Route::get('/faculty/dashboard', fn() => Inertia::render('Faculty/Faculty_Dashboard'))
        ->middleware('auth:sanctum')
        ->name('faculty.dashboard');
    
    Route::prefix('faculty')->middleware(['hybrid.auth'])->group(function () {

        // Faculty Schedule
        Route::get('/schedule', [App\Http\Controllers\FacultyController::class, 'schedulePage'])
            ->name('faculty.schedule');

        // Faculty Classes
        Route::get('/classes', [App\Http\Controllers\FacultyController::class, 'classesPage'])
            ->name('faculty.classes');
        
        // Excel Export/Import (Put specific routes before generic ones)
        Route::get('/classes/{classId}/export-students', [App\Http\Controllers\FacultyController::class, 'exportStudentList'])
            ->name('faculty.classes.export-students');
            
        // Simple test route
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
            
        // Save grades - Now requires semester parameter
        Route::post('/grades/save', [App\Http\Controllers\FacultyController::class, 'saveGrades'])
            ->name('faculty.grades.save');
        
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
