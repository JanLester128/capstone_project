<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistrarController;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Authentication Routes (No Middleware)
|--------------------------------------------------------------------------
*/

// Test route to verify auth routes are accessible
Route::post('/auth/test', function() {
    return response()->json(['message' => 'Auth routes are accessible', 'status' => 'success']);
});

// Registrar/Faculty/Coordinator login (must be first to avoid conflict)
Route::post('/auth/login', [AuthController::class, 'login']);

// Student login
Route::post('/auth/login/student', [AuthController::class, 'loginStudent']);

// Student register
Route::post('/auth/register/student', [AuthController::class, 'registerStudent']);

// Registrar register
Route::post('/auth/register/registrar', [RegistrarController::class, 'register']);

// Session validation route (no middleware - handle auth internally)
Route::post('/auth/validate-session', [AuthController::class, 'validateSession']);

// Password Reset routes
Route::post('/auth/forgot-password', [App\Http\Controllers\PasswordResetController::class, 'sendOTP']);
Route::post('/auth/verify-otp', [App\Http\Controllers\PasswordResetController::class, 'verifyOTP']);
Route::post('/auth/reset-password', [App\Http\Controllers\PasswordResetController::class, 'resetPassword']);

// Change Password routes (with authentication middleware)
Route::get('/auth/change-password', function() {
    return Inertia::render('Auth/Change_Password');
});

// Protected password change routes - require authentication
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/auth/change-password/faculty', [AuthController::class, 'changePasswordFaculty']);
    Route::post('/auth/change-password/coordinator', [AuthController::class, 'changePasswordCoordinator']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/validate', [AuthController::class, 'validateSession']);
});
