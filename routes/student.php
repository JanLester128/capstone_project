<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StudentController;

/*
|--------------------------------------------------------------------------
| Student Routes - Clean Implementation
|--------------------------------------------------------------------------
| Student-specific routes with proper authentication
*/

// Student Enrollment Page
Route::get('/student/enrollment', [StudentController::class, 'enrollmentPage'])
    ->name('student.enrollment');

// Student Profile Page  
Route::get('/student/profile', [StudentController::class, 'profilePage'])
    ->name('student.profile');

// Student Grades Page
Route::get('/student/grades', [StudentController::class, 'gradesPage'])
    ->name('student.grades');

// Student Schedule Page
Route::get('/student/schedule', [StudentController::class, 'schedulePage'])
    ->name('student.schedule');
