<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\UserSession;
use App\Models\StudentPersonalInfo;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // Find user first to check for existing sessions
        $user = User::where('email', $credentials['email'])->first();
        
        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            // Log failed login attempt
            Log::warning('Failed login attempt', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            // Return JSON response for AJAX requests
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'The provided credentials do not match our records.',
                    'errors' => [
                        'email' => ['The provided credentials do not match our records.']
                    ]
                ], 422);
            }

            return back()->withErrors([
                'email' => 'The provided credentials do not match our records.',
            ])->withInput($request->only('email'));
        }

        // Check for existing active session (temporarily disabled to fix redirect loops)
        // TODO: Re-enable after fixing session conflicts
        $existingSession = null; // UserSession::getActiveSession($user->id);
        
        if (false && $existingSession) { // Temporarily disabled
            // Option 1: Deny new login (recommended for security)
            Log::warning('Login attempt blocked - user already has active session', [
                'user_id' => $user->id,
                'email' => $user->email,
                'existing_session_id' => $existingSession->id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            $errorMessage = 'You are already logged in on another session. Please log out from the other session first or contact support if you need assistance.';

            // Return JSON response for AJAX requests
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                    'errors' => [
                        'email' => [$errorMessage]
                    ]
                ], 422);
            }

            return back()->withErrors([
                'email' => $errorMessage,
            ])->withInput($request->only('email'));
        }

        // Proceed with login
        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();
            $user = Auth::user();
            
            // Get device and browser information
            $userAgent = $request->userAgent();
            $deviceInfo = UserSession::getDeviceType($userAgent);
            $browserInfo = UserSession::getBrowserName($userAgent);
            
            // Create new session record
            $userSession = UserSession::createSession(
                $user->id,
                $request->ip(),
                $deviceInfo,
                $browserInfo
            );
            
            // Store comprehensive user data in session including session token
            session([
                'user_data' => [
                    'id' => $user->id,
                    'role' => $user->role,
                    'name' => $user->firstname . ' ' . $user->lastname,
                    'email' => $user->email,
                    'firstname' => $user->firstname,
                    'lastname' => $user->lastname,
                    'login_time' => now(),
                    'last_activity' => now(),
                    'session_token' => $userSession->session_token,
                    'is_coordinator' => $user->is_coordinator ?? false,
                    'student_type' => $user->student_type ?? null
                ]
            ]);

            // Update user's last login time
            User::where('id', $user->id)->update(['last_login_at' => now()]);

            // Log successful login
            Log::info('User logged in successfully', [
                'user_id' => $user->id,
                'role' => $user->role,
                'email' => $user->email,
                'session_id' => $userSession->id,
                'ip' => $request->ip(),
                'device' => $deviceInfo,
                'browser' => $browserInfo,
                'login_time' => now(),
                'password_changed' => $user->password_changed ?? false
            ]);
            
            // Check if user needs to change password (for faculty/staff)
            if (in_array($user->role, ['faculty', 'coordinator']) && !$user->password_changed) {
                Log::info('Redirecting user to password change page', [
                    'user_id' => $user->id,
                    'role' => $user->role,
                    'password_changed' => $user->password_changed
                ]);
                
                $passwordChangeUrl = '/auth/change-password?userType=' . $user->role;
                
                // Return JSON response for AJAX requests
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Password change required',
                        'redirect_url' => $passwordChangeUrl,
                        'password_change_required' => true,
                        'user' => [
                            'id' => $user->id,
                            'role' => $user->role,
                            'name' => $user->firstname . ' ' . $user->lastname,
                            'email' => $user->email,
                            'firstname' => $user->firstname,
                            'lastname' => $user->lastname,
                            'is_coordinator' => $user->is_coordinator ?? false,
                            'password_changed' => $user->password_changed ?? false
                        ],
                        'session_token' => $userSession->session_token
                    ]);
                }
                
                // Redirect to password change page
                return redirect($passwordChangeUrl)->with('info', 'Please change your password to continue.');
            }
            
            // Determine redirect URL based on user role
            $redirectUrl = match ($user->role) {
                'registrar' => '/registrar/dashboard',
                'faculty', 'coordinator' => '/faculty/dashboard',
                'student' => '/student/dashboard',
                default => '/dashboard'
            };

            // Return JSON response for AJAX requests
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Login successful',
                    'redirect_url' => $redirectUrl,
                    'user' => [
                        'id' => $user->id,
                        'role' => $user->role,
                        'name' => $user->firstname . ' ' . $user->lastname,
                        'email' => $user->email,
                        'firstname' => $user->firstname,
                        'lastname' => $user->lastname,
                        'is_coordinator' => $user->is_coordinator ?? false,
                        'student_type' => $user->student_type ?? null,
                        'last_login_at' => $user->last_login_at
                    ],
                    'session_token' => $userSession->session_token
                ]);
            }
            
            // Redirect based on user role
            return redirect()->intended($redirectUrl);
        }

        // This shouldn't be reached due to earlier validation, but keep as fallback
        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed.',
                'errors' => [
                    'email' => ['Authentication failed.']
                ]
            ], 422);
        }

        return back()->withErrors([
            'email' => 'Authentication failed.',
        ])->withInput($request->only('email'));
    }

    public function logout(Request $request)
    {
        $user = Auth::user();
        
        if ($user) {
            // Get session token from session data
            $sessionData = session('user_data');
            $sessionToken = $sessionData['session_token'] ?? null;
            
            // Terminate user session in database
            if ($sessionToken) {
                $userSession = UserSession::getByToken($sessionToken);
                if ($userSession) {
                    $userSession->terminate();
                }
            } else {
                // Fallback: terminate all active sessions for this user
                UserSession::terminateUserSessions($user->id);
            }
            
            // Log logout
            Log::info('User logged out', [
                'user_id' => $user->id,
                'role' => $user->role,
                'email' => $user->email,
                'session_token' => $sessionToken,
                'logout_time' => now()
            ]);
        }

        // Clear user session data
        session()->forget('user_data');
        
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        // Return JSON response for AJAX requests
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully',
                'redirect_url' => '/login'
            ]);
        }
        
        return redirect('/login')->with('success', 'You have been logged out successfully.');
    }

    /**
     * Change user password (for required password changes)
     */
    public function changePassword(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        
        if (!$user || !($user instanceof User)) {
            return back()->withErrors(['general' => 'You must be logged in to change your password.']);
        }

        $validator = Validator::make($request->all(), [
            'new_password' => [
                'required',
                'min:8',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ],
            'new_password_confirmation' => 'required|same:new_password'
        ], [
            'new_password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
            'new_password_confirmation.same' => 'Password confirmation does not match.'
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator->errors());
        }

        // Skip current password verification for required password changes
        // This is for faculty/staff who are changing from temporary passwords

        try {
            // Update password and clear password change requirements
            User::where('id', $user->id)->update([
                'password' => Hash::make($request->new_password),
                'password_change_required' => false,
                'plain_password' => null, // Clear any stored plain password
                'password_changed' => true
            ]);

            // Log password change
            Log::info('Password changed successfully', [
                'user_id' => $user->id,
                'role' => $user->role,
                'email' => $user->email,
                'changed_at' => now()
            ]);

            // Determine redirect URL based on user role after password change
            $dashboardUrl = match ($user->role) {
                'registrar' => '/registrar/dashboard',
                'faculty', 'coordinator' => '/faculty/dashboard',
                'student' => '/student/dashboard',
                default => '/dashboard'
            };

            // Return success response for Inertia with redirect to dashboard
            return redirect($dashboardUrl)->with('success', 'Password changed successfully! Welcome to your dashboard.');

        } catch (\Exception $e) {
            Log::error('Password change failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return back()->withErrors(['general' => 'Failed to change password. Please try again.']);
        }
    }

    /**
     * Validate current session
     */
    public function validateSession(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'valid' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $sessionData = session('user_data');
        $sessionToken = $sessionData['session_token'] ?? null;

        if (!$sessionToken) {
            return response()->json([
                'valid' => false,
                'message' => 'Session token missing'
            ], 401);
        }

        $userSession = UserSession::getByToken($sessionToken);
        
        if (!$userSession || !$userSession->isValid()) {
            return response()->json([
                'valid' => false,
                'message' => 'Session invalid or expired'
            ], 401);
        }

        // Update session activity
        $userSession->updateActivity();

        return response()->json([
            'valid' => true,
            'user' => [
                'id' => $user->id,
                'role' => $user->role,
                'name' => $user->firstname . ' ' . $user->lastname,
                'email' => $user->email,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'is_coordinator' => $user->is_coordinator ?? false,
                'student_type' => $user->student_type ?? null,
                'last_login_at' => $user->last_login_at
            ],
            'session' => [
                'login_time' => $userSession->login_time,
                'last_activity' => $userSession->last_activity,
                'expires_at' => $userSession->expires_at
            ]
        ]);
    }

    /**
     * Force logout from all sessions (admin function)
     */
    public function forceLogoutUser(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $userId = $request->user_id;
        $adminUser = Auth::user();

        // Only allow registrar/admin to force logout
        if (!$adminUser || !in_array($adminUser->role, ['registrar', 'admin'])) {
            return response()->json([
                'error' => 'Unauthorized'
            ], 403);
        }

        // Terminate all sessions for the user
        $terminatedCount = UserSession::terminateUserSessions($userId);

        Log::info('Force logout executed', [
            'admin_user_id' => $adminUser->id,
            'target_user_id' => $userId,
            'sessions_terminated' => $terminatedCount
        ]);

        return response()->json([
            'success' => true,
            'message' => "Successfully terminated {$terminatedCount} active sessions for user {$userId}"
        ]);
    }

    /**
     * Get active sessions (admin function)
     */
    public function getActiveSessions(Request $request)
    {
        $user = Auth::user();

        // Only allow registrar/admin to view sessions
        if (!$user || !in_array($user->role, ['registrar', 'admin'])) {
            return response()->json([
                'error' => 'Unauthorized'
            ], 403);
        }

        $activeSessions = UserSession::with('user:id,firstname,lastname,email,role')
            ->active()
            ->orderBy('last_activity', 'desc')
            ->get()
            ->map(function ($session) {
                return [
                    'id' => $session->id,
                    'user' => [
                        'id' => $session->user->id,
                        'name' => $session->user->firstname . ' ' . $session->user->lastname,
                        'email' => $session->user->email,
                        'role' => $session->user->role
                    ],
                    'ip_address' => $session->ip_address,
                    'device_info' => $session->device_info,
                    'browser_info' => $session->browser_info,
                    'login_time' => $session->login_time,
                    'last_activity' => $session->last_activity,
                    'expires_at' => $session->expires_at
                ];
            });

        return response()->json([
            'active_sessions' => $activeSessions,
            'total_count' => $activeSessions->count()
        ]);
    }

    /**
     * Handle student registration
     */
    public function registerStudent(Request $request)
    {
        // Check if email is verified
        if (!session('email_verified')) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email verification required. Please verify your email first.'
                ], 422);
            }
            return back()->withErrors(['email' => 'Email verification required.']);
        }

        // Validate registration data (basic fields only for email verification registration)
        $validated = $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'middlename' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed'
            ],
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
            'student_id.unique' => 'This student ID is already taken.',
            'email.unique' => 'This email address is already registered.',
        ]);

        try {
            DB::beginTransaction();

            // Generate a unique student ID/username
            $studentId = 'STU' . date('Y') . str_pad(User::where('role', 'student')->count() + 1, 4, '0', STR_PAD_LEFT);
            
            // Create user account
            $user = User::create([
                'username' => $studentId,
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'student',
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'middlename' => $validated['middlename'],
                'student_type' => 'new',
                'password_change_required' => false,
                'password_changed' => true,
            ]);

            // Create student personal info with basic data
            $studentPersonalInfo = StudentPersonalInfo::create([
                'user_id' => $user->id,
                'student_id' => $studentId,
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'middlename' => $validated['middlename'],
                'email' => $validated['email'],
                'phone' => null, // To be filled later
                'address' => 'To be provided', // To be filled later
                'birthdate' => null, // To be filled later
                'gender' => null, // To be filled later
                'guardian_name' => null, // To be filled later
                'guardian_phone' => null, // To be filled later
                'grade_level' => 'Grade 11', // Default for new students
                'student_status' => 'New',
            ]);

            DB::commit();

            // Clear email verification session data
            session()->forget(['email_verified', 'verification_code', 'verification_email', 'verification_expires', 'verification_data']);

            // Log successful registration
            Log::info('Student registered successfully', [
                'user_id' => $user->id,
                'student_id' => $studentId,
                'email' => $validated['email'],
                'registration_time' => now()
            ]);

            // Return JSON response for AJAX requests
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Registration successful! You can now log in with your credentials.',
                    'redirect_url' => '/login'
                ]);
            }

            return redirect('/login')->with('success', 'Registration successful! You can now log in with your credentials.');

        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Student registration failed', [
                'error' => $e->getMessage(),
                'email' => $validated['email'] ?? null
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Registration failed. Please try again.',
                    'details' => config('app.debug') ? $e->getMessage() : null
                ], 500);
            }

            return back()->withErrors(['general' => 'Registration failed. Please try again.'])->withInput();
        }
    }

    /**
     * Send email verification code
     */
    public function sendVerificationCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:users,email',
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Generate 6-digit verification code
        $code = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        
        // Store verification code in session with expiration
        session([
            'verification_code' => $code,
            'verification_email' => $request->email,
            'verification_expires' => now()->addMinutes(15),
            'verification_data' => [
                'firstname' => $request->firstname,
                'lastname' => $request->lastname
            ]
        ]);

        try {
            // For development: Check if mail is configured, otherwise use log-only mode
            if (config('mail.default') === 'log' || !config('mail.mailers.smtp.host')) {
                // Development mode: Just log the code
                Log::info('DEVELOPMENT MODE: Verification code (email not sent)', [
                    'email' => $request->email,
                    'code' => $code,
                    'message' => 'Use this code for testing: ' . $code
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Verification code generated. Check logs for development code.',
                    'dev_code' => config('app.debug') ? $code : null
                ]);
            } else {
                // Production mode: Send actual email
                Mail::raw("Hello {$request->firstname} {$request->lastname},\n\nYour ONSTS email verification code is: {$code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nONSTS Team", function($message) use ($request) {
                    $message->to($request->email)
                           ->subject('Email Verification Code - ONSTS');
                });

                Log::info('Verification code sent via email', [
                    'email' => $request->email
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Verification code sent to your email.'
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to send verification code', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send verification code. Please check your email configuration.',
                'debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Verify email code
     */
    public function verifyCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sessionCode = session('verification_code');
        $sessionEmail = session('verification_email');
        $expiresAt = session('verification_expires');

        if (!$sessionCode || !$sessionEmail || !$expiresAt) {
            return response()->json([
                'success' => false,
                'message' => 'No verification code found. Please request a new one.'
            ], 422);
        }

        if (now()->gt($expiresAt)) {
            session()->forget(['verification_code', 'verification_email', 'verification_expires']);
            return response()->json([
                'success' => false,
                'message' => 'Verification code has expired. Please request a new one.'
            ], 422);
        }

        if ($request->email !== $sessionEmail || $request->code !== $sessionCode) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification code.'
            ], 422);
        }

        // Mark email as verified
        session(['email_verified' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.'
        ]);
    }

    /**
     * Resend verification code
     */
    public function resendVerificationCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sessionEmail = session('verification_email');
        $verificationData = session('verification_data');

        if (!$sessionEmail || $request->email !== $sessionEmail || !$verificationData) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid request. Please start the registration process again.'
            ], 422);
        }

        // Generate new code
        $code = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        
        // Update session
        session([
            'verification_code' => $code,
            'verification_expires' => now()->addMinutes(15)
        ]);

        try {
            // Send new verification email using simple raw text
            Mail::raw("Hello {$verificationData['firstname']} {$verificationData['lastname']},\n\nYour new ONSTS email verification code is: {$code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nONSTS Team", function($message) use ($request) {
                $message->to($request->email)
                       ->subject('New Email Verification Code - ONSTS');
            });

            return response()->json([
                'success' => true,
                'message' => 'New verification code sent to your email.'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to resend verification code', [
                'email' => $request->email,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send verification code. Please try again.'
            ], 500);
        }
    }
}
