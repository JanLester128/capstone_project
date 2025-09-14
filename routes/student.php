<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StudentController;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Student Dashboard Routes
|--------------------------------------------------------------------------
*/

Route::get('/student/dashboard', fn() => Inertia::render('Student/Student_Dashboard'))
    ->middleware(['auth:sanctum'])
    ->name('student.dashboard');

Route::prefix('student')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/profile', [StudentController::class, 'profile'])
        ->name('student.profile');
        
    Route::get('/enrollment', [StudentController::class, 'enrollment'])
        ->name('student.enrollment');
        
    Route::get('/schedule', [StudentController::class, 'getSchedule'])
        ->name('student.schedule');
});
