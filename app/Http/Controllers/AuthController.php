<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Student;
use Inertia\Inertia;

class AuthController extends Controller
{
    /**
     * Create a new AuthController instance.
     */
    public function __construct()
    {
        // Remove guest middleware to allow login requests
    }

    /**
     * Handle root access and redirect based on authentication status.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function handleRootAccess()
    {
        // Check if user is authenticated
        if (Auth::check()) {
            $user = Auth::user();
            
            // Redirect based on user role
            return match($user->role) {
                'registrar' => redirect('/registrar/dashboard'),
                'faculty', 'coordinator' => redirect('/faculty/dashboard'),
                'student' => redirect('/student/dashboard'),
                default => redirect('/login')
            };
        }

        // If not authenticated, redirect to login
        return redirect('/login');
    }

    /**
     * Handle login for all user types.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function login(Request $request)
    {
        try {
            // Add debug logging
            Log::info('Login attempt', [
                'email' => $request->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            // Validate request
            $credentials = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string'
            ]);

            // Find user by email
            $user = User::where('email', $credentials['email'])->first();

            if (!$user) {
                Log::warning('Login failed: User not found', ['email' => $credentials['email']]);
                
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid email or password. Please try again.'
                    ], 401);
                }
                return back()->withErrors([
                    'email' => 'Invalid email or password. Please try again.'
                ])->withInput();
            }

            // Check password
            $authenticated = Hash::check($credentials['password'], $user->password);

            Log::info('Authentication result', [
                'authenticated' => $authenticated,
                'user_role' => $user->role,
                'email' => $user->email
            ]);

            if (!$authenticated) {
                Log::warning('Authentication failed', [
                    'email' => $user->email,
                    'role' => $user->role
                ]);
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid email or password. Please try again.'
                    ], 401);
                }
                return back()->withErrors([
                    'email' => 'Invalid email or password. Please try again.'
                ])->withInput();
            }

            // Check if account is disabled
            if ($user->is_disabled) {
                Log::warning('Login attempt on disabled account', ['email' => $user->email]);
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Your account has been disabled. Please contact the registrar.'
                    ], 403);
                }
                return back()->withErrors([
                    'email' => 'Your account has been disabled. Please contact the registrar.'
                ])->withInput();
            }
            
            // Log the user in using Laravel's built-in authentication
            Auth::login($user);
            
            // Generate authentication token for API access
            /** @var \App\Models\User $user */
            $user = $user;
            $token = /** @var \Laravel\Sanctum\HasApiTokens $user */ $user->createToken('auth_token')->plainTextToken;
            $sessionId = 'session_' . time() . '_' . uniqid();
            
            // Store session in cache
            $cacheKey = "user_session_{$user->id}";
            Cache::put($cacheKey, $sessionId, now()->addHours(24));
            
            // Store token and user data in session
            session(['auth_token' => $token]);
            session(['user_data' => $user->toArray()]);
            session(['session_id' => $sessionId]);
            
            // Regenerate session for security
            session()->regenerate();
            
            // Determine redirect URL based on user role
            $redirectUrl = match($user->role) {
                'registrar' => '/registrar/dashboard',
                'faculty', 'coordinator' => '/faculty/dashboard', 
                'student' => '/student/dashboard',
                default => '/dashboard'
            };
            
            // Update last login timestamp
            $user->update(['last_login_at' => now()]);
            
            // Return success response
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => true,
                    'message' => 'Login successful',
                    'user' => $user,
                    'token' => $token,
                    'token_key' => 'auth_token',
                    'session_id' => $sessionId,
                    'redirect' => $redirectUrl
                ])->withCookie(cookie('auth_token', $token, 60 * 24));
            }
            
            return redirect($redirectUrl)
                ->with('success', 'Welcome back!')
                ->withCookie(cookie('auth_token', $token, 60 * 24));
                
        } catch (\Exception $e) {
            Log::error('Login process failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'email' => $request->email ?? 'unknown'
            ]);
            
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Login failed. Please try again.'
                ], 500);
            }
            
            return back()->withErrors([
                'email' => 'Login failed. Please try again.'
            ])->withInput();
        }
    }

    /**
     * Validate session with clear feedback.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function validateSession(Request $request)
    {
        try {
            // Get the Bearer token from Authorization header
            $authHeader = $request->header('Authorization');
            if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid authorization token provided'
                ], 401);
            }

            $token = substr($authHeader, 7); // Remove 'Bearer ' prefix
            
            // Get session ID from header
            $sessionId = $request->header('X-Session-ID');
            if (!$sessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No session ID provided'
                ], 401);
            }

            // Validate token with Sanctum
            $user = auth('sanctum')->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired token'
                ], 401);
            }

            // Validate session ID
            $cacheKey = "user_session_{$user->id}";
            $storedSessionId = Cache::get($cacheKey);
            
            if (!$storedSessionId || $storedSessionId !== $sessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired session'
                ], 401);
            }

            return response()->json([
                'success' => true,
                'message' => 'Session is valid',
                'user' => $user,
                'session_id' => $sessionId
            ]);

        } catch (\Exception $e) {
            Log::error('Session validation error', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Session validation failed'
            ], 500);
        }
    }

    /**
     * Register a new student.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function registerStudent(Request $request)
    {
        try {
            $validated = $request->validate([
                'firstname' => 'required|string|max:100',
                'lastname' => 'required|string|max:100',
                'middlename' => 'nullable|string|max:100',
                'email' => 'required|string|email|max:100|unique:users',
                'password' => 'required|string|min:8|confirmed',
            ]);

            // Create user
            $user = User::create([
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'middlename' => $validated['middlename'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'student',
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            Log::info('Student registered successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Registration successful! You can now login.',
                    'user' => $user
                ], 201);
            }

            return redirect('/login')->with('success', 'Registration successful! You can now login.');

        } catch (\Exception $e) {
            Log::error('Student registration failed', [
                'error' => $e->getMessage(),
                'email' => $request->email ?? 'unknown'
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration failed. Please try again.'
                ], 500);
            }

            return back()->withErrors([
                'email' => 'Registration failed. Please try again.'
            ])->withInput();
        }
    }

    /**
     * Handle student login (separate endpoint).
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function loginStudent(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required|string'
            ]);

            if ($validator->fails()) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed',
                        'errors' => $validator->errors()
                    ], 422);
                }
                return back()->withErrors($validator)->withInput();
            }

            $credentials = $validator->validated();

            // Find student user
            $user = User::where('email', $credentials['email'])
                       ->where('role', 'student')
                       ->first();

            if (!$user || !Hash::check($credentials['password'], $user->password)) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid student credentials'
                    ], 401);
                }
                return back()->withErrors([
                    'email' => 'Invalid student credentials'
                ])->withInput();
            }

            // Generate token
            $token = $user->createToken('student_auth_token')->plainTextToken;
            $sessionId = 'session_' . time() . '_' . uniqid();

            // Store session
            $cacheKey = "user_session_{$user->id}";
            Cache::put($cacheKey, $sessionId, now()->addHours(24));

            session(['auth_token' => $token]);
            session(['user_data' => $user->toArray()]);
            session(['session_id' => $sessionId]);

            // Update last login
            $user->update(['last_login_at' => now()]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Student login successful',
                    'user' => $user,
                    'token' => $token,
                    'session_id' => $sessionId,
                    'redirect' => '/student/dashboard'
                ])->withCookie(cookie('auth_token', $token, 60 * 24));
            }

            return redirect('/student/dashboard')
                ->with('success', 'Welcome back!')
                ->withCookie(cookie('auth_token', $token, 60 * 24));

        } catch (\Exception $e) {
            Log::error('Student login failed', [
                'error' => $e->getMessage(),
                'email' => $request->email ?? 'unknown'
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Login failed. Please try again.'
                ], 500);
            }

            return back()->withErrors([
                'email' => 'Login failed. Please try again.'
            ])->withInput();
        }
    }

    /**
     * Logout user and revoke tokens.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function logout(Request $request)
    {
        try {
            Log::info('Logout attempt started', [
                'user_id' => Auth::id(),
                'ip' => $request->ip()
            ]);

            /** @var \App\Models\User $user */
            $user = Auth::user();
            
            if ($user) {
                // Revoke all tokens for this user
                /** @var \Laravel\Sanctum\HasApiTokens $user */
                $user->tokens()->delete();
                
                // Clear session cache
                $cacheKey = "user_session_{$user->id}";
                Cache::forget($cacheKey);
                
                Log::info('User logged out successfully', [
                    'user_id' => $user->id,
                    'email' => $user->email
                ]);
            }

            // Clear session data
            session()->flush();
            
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Logged out successfully'
                ])->withoutCookie('auth_token');
            }

            return redirect('/login')
                ->with('success', 'You have been logged out successfully')
                ->withoutCookie('auth_token');

        } catch (\Exception $e) {
            Log::error('Logout failed', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Logout failed'
                ], 500);
            }

            return redirect('/login')->withErrors(['error' => 'Logout failed']);
        }
    }

    /**
     * Change password for faculty users.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function changePasswordFaculty(Request $request)
    {
        try {
            $request->validate([
                'new_password' => 'required|string|min:8',
                'confirm_password' => 'required|string|same:new_password'
            ]);

            /** @var \App\Models\User $user */
            $user = Auth::user();
            
            if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access.'
                ], 403);
            }

            // Update password
            $user->update([
                'password' => Hash::make($request->new_password)
            ]);

            Log::info('Faculty password changed successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully!',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role
                ],
                'redirect' => '/faculty/dashboard'
            ]);

        } catch (\Exception $e) {
            Log::error('Faculty password change failed', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Password change failed. Please try again.'
            ], 500);
        }
    }

    /**
     * Change password for coordinator users.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function changePasswordCoordinator(Request $request)
    {
        try {
            $request->validate([
                'new_password' => 'required|string|min:8',
                'confirm_password' => 'required|string|same:new_password'
            ]);

            /** @var \App\Models\User $user */
            $user = Auth::user();
            
            if (!$user || $user->role !== 'coordinator') {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access.'
                    ], 403);
                }
                return back()->withErrors(['form' => 'Unauthorized access. Please login first.']);
            }

            // Update password
            $user->update([
                'password' => Hash::make($request->new_password)
            ]);

            Log::info('Coordinator password changed successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Password changed successfully!',
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'role' => $user->role
                    ],
                    'redirect' => '/faculty/dashboard'
                ]);
            }

            return redirect('/faculty/dashboard')->with('success', 'Password changed successfully!');

        } catch (\Exception $e) {
            Log::error('Coordinator password change failed', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Password change failed. Please try again.'
                ], 500);
            }

            return back()->withErrors(['form' => 'Password change failed. Please try again.']);
        }
    }
}
