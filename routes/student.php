<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StudentController;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Student Dashboard Routes
|--------------------------------------------------------------------------
*/

// Debug route to test what's happening
Route::get('/student/debug', function() {
    return response()->json([
        'message' => 'Debug route working',
        'auth_check' => \Illuminate\Support\Facades\Auth::check(),
        'auth_user' => \Illuminate\Support\Facades\Auth::user(),
        'session_data' => session()->all()
    ]);
})->name('student.debug');

// Debug route to test enrollment data
Route::get('/student/debug-enrollment', function() {
    $enrollments = \Illuminate\Support\Facades\DB::table('enrollments')->get();
    $users = \Illuminate\Support\Facades\DB::table('users')->where('role', 'student')->get();
    $schoolYears = \Illuminate\Support\Facades\DB::table('school_years')->get();
    
    return response()->json([
        'enrollments' => $enrollments,
        'student_users' => $users,
        'school_years' => $schoolYears
    ]);
})->name('student.debug.enrollment');


// Student dashboard route moved to web.php to fix 404 issue

Route::prefix('student')->group(function () {
    Route::get('/profile', [StudentController::class, 'profile'])
        ->name('student.profile');
        
    Route::get('/class', [StudentController::class, 'classPage'])
        ->name('student.class');
        
    Route::get('/enrollment', [StudentController::class, 'enrollmentPage'])
        ->name('student.enrollment');
        
    Route::get('/enrollment-status', [StudentController::class, 'getEnrollmentStatus'])
        ->name('student.enrollment.status');
        
    Route::get('/schedule', [StudentController::class, 'getSchedule'])
        ->name('student.schedule');
        
    Route::get('/schedule-data', [StudentController::class, 'getScheduleData'])
        ->name('student.schedule.data');
        
    Route::get('/grades', [StudentController::class, 'gradesPage'])
        ->name('student.grades');
});
