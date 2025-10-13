<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
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

// Debug route to test login endpoint specifically
Route::post('/auth/login-test', function() {
    return response()->json([
        'message' => 'Login endpoint is accessible', 
        'status' => 'success',
        'timestamp' => now(),
        'method' => request()->method()
    ]);
});

// Debug route to check faculty password change requirements
Route::get('/auth/debug-faculty-password', function() {
    $facultyUsers = \App\Models\User::where('role', 'faculty')->get();
    
    $results = [];
    foreach ($facultyUsers as $user) {
        $results[] = [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'password_change_required' => $user->password_change_required ?? false,
            'password_changed' => $user->password_changed ?? true, // Default to true if field doesn't exist
            'has_plain_password' => !empty($user->plain_password ?? ''),
            'plain_password_value' => ($user->plain_password ?? '') ? substr($user->plain_password, 0, 3) . '...' : null,
            'should_require_change' => in_array($user->role, ['faculty', 'coordinator']) && 
                (($user->password_change_required ?? false) || !($user->password_changed ?? true) || ($user->plain_password ?? ''))
        ];
    }
    
    return response()->json([
        'message' => 'Faculty password change debug info',
        'faculty_users' => $results,
        'total_faculty' => count($results)
    ]);
});

// Fix specific faculty user password requirements
Route::get('/auth/fix-faculty-user/{email}', function($email) {
    $user = \App\Models\User::where('email', $email)->first();
    
    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'User not found',
            'email' => $email
        ]);
    }
    
    $oldValues = [
        'password_change_required' => $user->password_change_required ?? false,
        'password_changed' => $user->password_changed ?? true,
        'has_plain_password' => !empty($user->plain_password ?? '')
    ];
    
    // Force password change requirement - only update fields that exist
    $updateData = [];
    if (Schema::hasColumn('users', 'password_change_required')) {
        $updateData['password_change_required'] = true;
    }
    if (Schema::hasColumn('users', 'password_changed')) {
        $updateData['password_changed'] = false;
    }
    
    if (!empty($updateData)) {
        $user->update($updateData);
    }
    
    return response()->json([
        'success' => true,
        'message' => 'Faculty user updated to require password change',
        'user' => [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role
        ],
        'old_values' => $oldValues,
        'new_values' => [
            'password_change_required' => true,
            'password_changed' => false
        ]
    ]);
});

// Fix existing faculty users to require password change
Route::get('/auth/fix-existing-faculty-password-requirements', function() {
    $facultyUsers = \App\Models\User::whereIn('role', ['faculty', 'coordinator'])->get();
    
    $updated = [];
    foreach ($facultyUsers as $user) {
        // Only update if they haven't already changed their password
        if (!$user->password_changed) {
            $oldValues = [
                'password_change_required' => $user->password_change_required,
                'password_changed' => $user->password_changed,
                'has_plain_password' => !empty($user->plain_password)
            ];
            
            $user->update([
                'password_change_required' => true,
                'password_changed' => false,
                // Don't set plain_password if we don't know what it was
            ]);
            
            $updated[] = [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'old_values' => $oldValues,
                'new_values' => [
                    'password_change_required' => true,
                    'password_changed' => false
                ]
            ];
        }
    }
    
    return response()->json([
        'message' => 'Fixed existing faculty password requirements',
        'updated_users' => $updated,
        'total_updated' => count($updated)
    ]);
});

// Test AuthController login method step by step
Route::post('/auth/test-main-login', function(Request $request) {
    try {
        // Test the exact same logic as AuthController but with better error handling
        $credentials = $request->only('email', 'password');
        
        $user = \App\Models\User::where('email', $credentials['email'])->first();
        if (!$user) {
            return response()->json(['error' => 'User not found']);
        }
        
        if (!\Illuminate\Support\Facades\Hash::check($credentials['password'], $user->password)) {
            return response()->json(['error' => 'Invalid password']);
        }
        
        // Test authentication
        try {
            \Illuminate\Support\Facades\Auth::guard('web')->login($user, true);
            $authResult = 'SUCCESS';
        } catch (\Exception $authError) {
            return response()->json(['error' => 'Auth failed: ' . $authError->getMessage()]);
        }
        
        // Test token creation
        try {
            $token = $user->createToken('test-token')->plainTextToken;
            $tokenResult = 'SUCCESS';
        } catch (\Exception $tokenError) {
            return response()->json(['error' => 'Token creation failed: ' . $tokenError->getMessage()]);
        }
        
        // Test session regeneration
        try {
            $request->session()->regenerate();
            $sessionResult = 'SUCCESS';
        } catch (\Exception $sessionError) {
            return response()->json(['error' => 'Session regeneration failed: ' . $sessionError->getMessage()]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'All AuthController steps completed successfully',
            'results' => [
                'user_found' => true,
                'password_valid' => true,
                'auth_result' => $authResult,
                'token_result' => $tokenResult,
                'session_result' => $sessionResult
            ],
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role
            ]
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Test failed: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Debug route to test user lookup and token creation
Route::post('/auth/debug-user', function() {
    $email = request('email', 'registrar@gmail.com');
    $user = \App\Models\User::where('email', $email)->first();
    
    $tokenTest = null;
    $tokenError = null;
    
    if ($user) {
        try {
            $token = $user->createToken('debug-test')->plainTextToken;
            $tokenTest = 'SUCCESS - Token created: ' . substr($token, 0, 10) . '...';
            // Clean up test token
            $user->tokens()->where('name', 'debug-test')->delete();
        } catch (\Exception $e) {
            $tokenError = $e->getMessage();
            $tokenTest = 'FAILED';
        }
    }
    
    return response()->json([
        'message' => 'User lookup and token test',
        'email' => $email,
        'user_found' => !!$user,
        'user_data' => $user ? [
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'has_password' => !!$user->password
        ] : null,
        'token_test' => $tokenTest,
        'token_error' => $tokenError,
        'total_users' => \App\Models\User::count()
    ]);
});

// TEMPORARY: Simple login route with step-by-step debugging
Route::post('/auth/login-simple', function (Request $request) {
    $debugInfo = [];
    
    try {
        $debugInfo['step'] = 'Starting login';
        Log::info('Simple login attempt', [
            'email' => $request->input('email'),
            'has_password' => !empty($request->input('password'))
        ]);
        
        $credentials = $request->only('email', 'password');
        $debugInfo['step'] = 'Credentials extracted';
        
        // Find user
        $user = \App\Models\User::where('email', $credentials['email'])->first();
        $debugInfo['step'] = 'User lookup completed';
        $debugInfo['user_found'] = !!$user;
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
                'debug_info' => $debugInfo
            ], 401);
        }
        
        $debugInfo['step'] = 'Checking password';
        // Check password
        if (!Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
                'debug_info' => $debugInfo
            ], 401);
        }
        
        $debugInfo['step'] = 'Password valid, attempting web guard login';
        // Login user
        try {
            Auth::guard('web')->login($user, true);
            $debugInfo['web_login'] = 'SUCCESS';
        } catch (\Exception $webLoginError) {
            $debugInfo['web_login'] = 'FAILED: ' . $webLoginError->getMessage();
            throw $webLoginError;
        }
        
        $debugInfo['step'] = 'Attempting token creation';
        // FIXED: Try to create token with better error handling
        try {
            $token = $user->createToken('auth-token')->plainTextToken;
            $debugInfo['token_creation'] = 'SUCCESS';
        } catch (\Exception $tokenError) {
            $debugInfo['token_creation'] = 'FAILED: ' . $tokenError->getMessage();
            Log::error('Token creation failed', [
                'error' => $tokenError->getMessage(),
                'user_id' => $user->id,
                'file' => $tokenError->getFile(),
                'line' => $tokenError->getLine()
            ]);
            // Continue without token for now
            $token = 'token_creation_failed';
        }
        
        $debugInfo['step'] = 'Regenerating session';
        // Regenerate session after successful login
        try {
            $request->session()->regenerate();
            $debugInfo['session_regenerate'] = 'SUCCESS';
        } catch (\Exception $sessionError) {
            $debugInfo['session_regenerate'] = 'FAILED: ' . $sessionError->getMessage();
            // Continue anyway
        }
        
        $debugInfo['step'] = 'Checking password change requirement';
        
        // Check if password change is required (for faculty/coordinator users)
        $passwordChangeRequired = false;
        if (in_array($user->role, ['faculty', 'coordinator'])) {
            // Use null coalescing to handle missing fields gracefully
            $passwordChangeRequiredField = $user->password_change_required ?? false;
            $passwordChangedField = $user->password_changed ?? true; // Default to true (already changed)
            $plainPasswordField = $user->plain_password ?? '';
            
            // Only require password change if explicitly required or has plain password
            if ($passwordChangeRequiredField || !empty($plainPasswordField)) {
                $passwordChangeRequired = true;
                $debugInfo['password_change_required'] = true;
                $debugInfo['password_change_reasons'] = [
                    'password_change_required' => $passwordChangeRequiredField,
                    'password_changed' => $passwordChangedField,
                    'has_plain_password' => !empty($plainPasswordField)
                ];
            }
        }
        
        $debugInfo['step'] = 'Preparing response';
        
        $responseData = [
            'success' => true,
            'message' => $passwordChangeRequired ? 'Password change required' : 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'email' => $user->email,
                'role' => $user->role
            ],
            'token' => $token,
            'debug_info' => $debugInfo
        ];
        
        if ($passwordChangeRequired) {
            $responseData['password_change_required'] = true;
            $responseData['redirect'] = '/auth/change-password?userType=' . $user->role;
        } else {
            $responseData['redirect'] = match($user->role) {
                'student' => '/student/dashboard',
                'registrar' => '/registrar/dashboard',
                'faculty', 'coordinator' => '/faculty/dashboard',
                default => '/login'
            };
        }
        
        // Check if this is an AJAX request or form submission
        if ($request->expectsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            // Return JSON for AJAX requests
            return response()->json($responseData);
        } else {
            // For form submissions, redirect directly (maintains session better)
            $redirectUrl = $passwordChangeRequired ? 
                '/auth/change-password?userType=' . $user->role :
                match($user->role) {
                    'student' => '/student/dashboard',
                    'registrar' => '/registrar/dashboard', 
                    'faculty', 'coordinator' => '/faculty/dashboard',
                    default => '/login'
                };
            
            return redirect($redirectUrl)->with('success', 'Login successful!');
        }
        
    } catch (\Exception $e) {
        $debugInfo['final_error'] = $e->getMessage();
        $debugInfo['error_file'] = $e->getFile();
        $debugInfo['error_line'] = $e->getLine();
        
        Log::error('Simple login error', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'debug_info' => $debugInfo,
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Login failed: ' . $e->getMessage(),
            'debug_info' => $debugInfo,
            'error_details' => [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]
        ], 500);
    }
});


// Registrar/Faculty/Coordinator login (must be first to avoid conflict)
Route::post('/auth/login', [AuthController::class, 'login']);

// Student login
Route::post('/auth/login/student', [AuthController::class, 'loginStudent']);

// Email verification routes
Route::post('/auth/send-verification-code', [App\Http\Controllers\EmailVerificationController::class, 'sendVerificationCode']);
Route::post('/auth/verify-code', [App\Http\Controllers\EmailVerificationController::class, 'verifyCode']);
Route::post('/auth/resend-verification-code', [App\Http\Controllers\EmailVerificationController::class, 'resendVerificationCode']);
Route::get('/auth/check-verification-status', [App\Http\Controllers\EmailVerificationController::class, 'checkVerificationStatus']);

// Student register (requires email verification)
Route::post('/auth/register/student', [AuthController::class, 'registerStudent']);

// Registrar register
Route::post('/auth/register/registrar', [RegistrarController::class, 'register']);

// Session validation route (no middleware - handle auth internally)
Route::post('/auth/validate-session', [AuthController::class, 'validateSession']);

// Password Reset routes
Route::post('/auth/forgot-password', [App\Http\Controllers\PasswordResetController::class, 'sendOTP']);
Route::post('/auth/verify-otp', [App\Http\Controllers\PasswordResetController::class, 'verifyOTP']);
Route::post('/auth/reset-password', [App\Http\Controllers\PasswordResetController::class, 'resetPassword']);

// Protected password change routes - require authentication
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/auth/change-password/faculty', [AuthController::class, 'changePasswordFaculty']);
    Route::post('/auth/change-password/coordinator', [AuthController::class, 'changePasswordCoordinator']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/validate', [AuthController::class, 'validateSession']);
});
