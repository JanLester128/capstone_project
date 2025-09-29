<?php

// Add these routes to your existing web.php file under the faculty middleware group

Route::middleware(['auth', 'role:faculty'])->prefix('faculty')->group(function () {
    
    // Grade 11 to Grade 12 Progression Routes
    Route::get('/grade11-students', [App\Http\Controllers\Faculty\FacultyEnrollmentController::class, 'getGrade11Students'])
        ->name('faculty.grade11-students');
    
    Route::post('/progress-to-grade12', [App\Http\Controllers\Faculty\FacultyEnrollmentController::class, 'progressToGrade12'])
        ->name('faculty.progress-to-grade12');
    
    Route::get('/student-details/{id}', [App\Http\Controllers\Faculty\FacultyEnrollmentController::class, 'getStudentDetails'])
        ->name('faculty.student-details');
});
