<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Student;
use App\Models\Registrar;
use App\Models\Coordinator;
use App\Models\SchoolYear;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Cache;

/**
 * AuthController handles user authentication and session management.
 */
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
     * Handle root URL access with clear authentication flow.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function handleRootAccess()
    {
        // Check if user is authenticated
        if (Auth::check()) {
            $user = Auth::user();
            return redirect($this->getDashboardRoute($user->role));
        }
        
        return redirect('/login');
    }

    /**
     * Get dashboard route based on user role.
     *
     * @param string $role
     * @return string
     */
    private function getDashboardRoute(string $role)
    {
        $routes = [
            'registrar' => '/registrar/dashboard',
            'faculty' => '/faculty/dashboard',
            'coordinator' => '/faculty/dashboard',
            'student' => '/student/dashboard'
        ];
        
        return $routes[$role] ?? '/login';
    }

    /**
     * Unified login with clear error messages.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function login(Request $request)
    {
        // Add debug logging
        Log::info('Login attempt', [
            'email' => $request->input('email'),
            'has_password' => !empty($request->input('password')),
            'request_method' => $request->method(),
            'content_type' => $request->header('Content-Type'),
            'accept' => $request->header('Accept')
        ]);

        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required|string|min:6',
            ]);

            if ($validator->fails()) {
                Log::warning('Login validation failed', ['errors' => $validator->errors()]);
                // Check if request expects JSON (from frontend fetch)
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed',
                        'errors' => $validator->errors()
                    ], 422);
                }
                return back()->withErrors($validator)->withInput();
            }

            $credentials = $request->only('email', 'password');
            $user = User::where('email', $credentials['email'])->first();
            
            Log::info('User lookup', [
                'email' => $credentials['email'],
                'user_found' => $user ? true : false,
                'user_role' => $user ? $user->role : null
            ]);
            
            // Check if user exists
            if (!$user) {
                Log::warning('User not found', ['email' => $credentials['email']]);
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

            $authenticated = false;

            // For faculty/coordinator users, check both hashed and plain password
            if (in_array($user->role, ['faculty', 'coordinator'])) {
                // First try hashed password authentication
                if (Hash::check($credentials['password'], $user->password)) {
                    $authenticated = true;
                    Log::info('Faculty/Coordinator authenticated with hashed password');
                } 
                // If hashed password fails and plain_password exists, try plain password
                elseif ($user->plain_password && $credentials['password'] === $user->plain_password) {
                    $authenticated = true;
                    Log::info('Faculty/Coordinator authenticated with plain password');
                    // Mark that password change is required
                    $user->password_change_required = true;
                    $user->password_changed = false;
                    $user->save();
                }
            } else {
                // For other users (students, registrar), use standard authentication
                $authenticated = Hash::check($credentials['password'], $user->password);
                if ($authenticated) {
                    Log::info('User authenticated with hashed password', ['role' => $user->role]);
                }
            }

            Log::info('Authentication result', [
                'authenticated' => $authenticated,
                'user_role' => $user->role,
                'email' => $user->email
            ]);

            if (!$authenticated) {
                Log::warning('Authentication failed', [
                    'email' => $user->email,
                    'role' => $user->role,
                    'has_plain_password' => !empty($user->plain_password)
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

            // Manually authenticate the user
            Auth::login($user);
            
            // Update last login time
            $user->update(['last_login_at' => now()]);

            // Check account status
            if (isset($user->is_disabled) && $user->is_disabled) {
                Auth::logout();
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
            
            // Check if password change is required (for faculty/coordinator users)
            if (in_array($user->role, ['faculty', 'coordinator']) && 
                ($user->password_change_required || !$user->password_changed || $user->plain_password)) {
                
                // Generate unified token for password change authentication
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
                
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => true,
                        'message' => 'Password change required',
                        'user' => $user,
                        'token' => $token,
                        'token_key' => 'auth_token',
                        'session_id' => $sessionId,
                        'password_change_required' => true,
                        'redirect' => '/auth/change-password?userType=' . $user->role
                    ])->withCookie(cookie('auth_token', $token, 60 * 24));
                }
                
                return redirect('/auth/change-password?userType=' . $user->role)
                    ->with('info', 'You must change your password before accessing your dashboard')
                    ->withCookie(cookie('auth_token', $token, 60 * 24));
            }
            
            // Generate unified token and session
            $user = $user;
            /** @var \App\Models\User $user */
            /** @var \Laravel\Sanctum\HasApiTokens $user */
            $token = /** @var \Laravel\Sanctum\HasApiTokens $user */ $user->createToken('auth_token')->plainTextToken;
            $sessionId = 'session_' . time() . '_' . uniqid();
            
            // Store session in cache for single session enforcement
            $cacheKey = "user_session_{$user->id}";
            Cache::put($cacheKey, $sessionId, now()->addHours(24));
            
            // Store token and user data in session for frontend access
            session(['auth_token' => $token]);
            session(['user_data' => $user->toArray()]);
            session(['session_id' => $sessionId]);
            
            // Load student data if user is a student
            if ($user->role === 'student') {
                $student = Student::where('user_id', $user->id)->first();
                session(['student_data' => $student]);
            }
            
            // Check if request expects JSON (from frontend fetch)
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                Log::info('Returning JSON response for login', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'token_length' => strlen($token),
                    'redirect_url' => $this->getDashboardRoute($user->role)
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Login successful',
                    'user' => $user,
                    'token' => $token,
                    'token_key' => 'auth_token',
                    'session_id' => $sessionId,
                    'redirect' => $this->getDashboardRoute($user->role)
                ])->withCookie(cookie('auth_token', $token, 60 * 24)); // Store token in cookie for 24 hours
            }
            
            // For web/Inertia requests, redirect directly to dashboard
            return redirect($this->getDashboardRoute($user->role))
                ->with('success', 'Login successful')
                ->withCookie(cookie('auth_token', $token, 60 * 24));
            
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage());
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'An error occurred during login. Please try again.'
                ], 500);
            }
            return back()->withErrors([
                'email' => 'An error occurred during login. Please try again.'
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
                    'message' => 'No token provided'
                ], 401);
            }

            $token = substr($authHeader, 7); // Remove 'Bearer ' prefix
            
            // Find the token in personal_access_tokens table
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token'
                ], 401);
            }

            // Get the user associated with the token
            $user = $accessToken->tokenable;
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 401);
            }

            // Return success with user data
            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role
                ],
                'message' => 'Session valid'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Session validation error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Session validation failed'
            ], 500);
        }
    }

    /**
     * Clear logout functionality.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function logout(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                // Check if request expects JSON
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => true,
                        'message' => 'Already logged out',
                        'redirect' => '/login'
                    ]);
                }
                return redirect('/login');
            }

            // Clear the user's session cache to allow new login
            $cacheKey = "user_session_{$user->id}";
            Cache::forget($cacheKey);

            // For all authenticated users, perform complete logout
            // Revoke all tokens for this user
            $user->tokens()->delete();
            
            // For session-based auth, logout from session (only if using session guard)
            if (auth()->guard('web')->check()) {
                auth()->guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            // Return appropriate message based on role
            $message = match($user->role) {
                'student' => 'Student logged out successfully.',
                'faculty' => 'Faculty logged out successfully.',
                'coordinator' => 'Coordinator logged out successfully.',
                'registrar' => 'Registrar logged out successfully.',
                default => 'User logged out successfully.'
            };

            // Check if request expects JSON (for AJAX logout)
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'redirect' => '/login'
                ])->withCookie(cookie()->forget('auth_token'));
            }

            return redirect('/login')
                ->with('success', $message)
                ->withCookie(cookie()->forget('auth_token'));
            
        } catch (\Exception $e) {
            Log::error('Logout error: ' . $e->getMessage());
            
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Logout failed',
                    'redirect' => '/login'
                ], 500);
            }
            
            return redirect('/login');
        }
    }

    /**
     * Student registration with email verification.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function registerStudent(Request $request)
    {
        try {
            $validated = $request->validate([
                'firstname' => 'required|string|max:255',
                'lastname' => 'required|string|max:255',
                'middlename' => 'nullable|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'password_confirmation' => 'required|string|same:password',
            ]);

            // Check if email is verified
            $verifiedCacheKey = "email_verified_{$validated['email']}";
            $verificationData = Cache::get($verifiedCacheKey);

            if (!$verificationData) {
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email verification required. Please verify your email address first.',
                        'error_type' => 'email_not_verified'
                    ], 400);
                }
                return back()->withErrors(['email' => 'Email verification required. Please verify your email address first.'])->withInput();
            }

            // Combine names into full name for the name field
            $fullName = trim($validated['firstname'] . ' ' . ($validated['middlename'] ? $validated['middlename'] . ' ' : '') . $validated['lastname']);
            
            $user = User::create([
                'name' => $fullName,
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'middlename' => $validated['middlename'],
                'email' => $validated['email'],
                'role' => 'student',
                'password' => Hash::make($validated['password']),
                'email_verified_at' => now(), // Mark email as verified
            ]);

            Student::create([
                'user_id' => $user->id,
                'hs_grade' => 'N/A',
                'strand_id' => null,
                'section_id' => null,
            ]);

            // Clear verification cache
            Cache::forget($verifiedCacheKey);

            Log::info("Student registered successfully: {$validated['email']}");

            // Check if request expects JSON (from frontend fetch)
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => true,
                    'message' => 'Registration completed successfully! You can now login with your credentials.',
                    'redirect' => '/login'
                ]);
            }

            return redirect('/login')->with('success', 'Registration completed successfully! You can now login with your credentials.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            // Check if request expects JSON (from frontend fetch)
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            }
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Student registration error: ' . $e->getMessage());
            
            // Check if request expects JSON (from frontend fetch)
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration failed. Please try again.'
                ], 500);
            }
            return back()->withErrors(['email' => 'Registration failed. Please try again.'])->withInput();
        }
    }

    /**
     * Student login - separate endpoint for students.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function loginStudent(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required|string|min:6',
            ]);

            if ($validator->fails()) {
                // Check if request expects JSON (from frontend fetch)
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed',
                        'errors' => $validator->errors()
                    ], 422);
                }
                return back()->withErrors($validator)->withInput();
            }

            $credentials = $request->only('email', 'password');
            
            if (!Auth::attempt($credentials)) {
                // Check if request expects JSON (from frontend fetch)
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

            $user = Auth::user();
            
            // Check if user is actually a student
            if ($user->role !== 'student') {
                Auth::logout();
                if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                    return response()->json([
                        'success' => false,
                        'message' => 'This login is for students only. Please use the main login form.'
                    ], 403);
                }
                return back()->withErrors([
                    'email' => 'This login is for students only. Please use the main login form.'
                ])->withInput();
            }
            
            // Check account status
            if (isset($user->is_disabled) && $user->is_disabled) {
                Auth::logout();
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
            
            // Generate unified token and session
            $user = $user;
            /** @var \App\Models\User $user */
            /** @var \Laravel\Sanctum\HasApiTokens $user */
            $token = /** @var \Laravel\Sanctum\HasApiTokens $user */ $user->createToken('auth_token')->plainTextToken;
            $sessionId = 'session_' . time() . '_' . uniqid();
            
            // Store session in cache for single session enforcement
            $cacheKey = "user_session_{$user->id}";
            Cache::put($cacheKey, $sessionId, now()->addHours(24));
            
            // Load student data
            $student = Student::where('user_id', $user->id)->first();
            
            // Store token and user data in session for frontend access
            session(['auth_token' => $token]);
            session(['user_data' => $user->toArray()]);
            session(['session_id' => $sessionId]);
            session(['student_data' => $student]);
            
            // Check if request expects JSON (from frontend fetch)
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                $response = response()->json([
                    'success' => true,
                    'message' => 'Student login successful',
                    'user' => $user,
                    'student' => $student,
                    'token' => $token,
                    'token_key' => 'auth_token',
                    'session_id' => $sessionId,
                    'redirect' => '/student/dashboard'
                ]);
                $response->withCookie(cookie('auth_token', $token, 60 * 24)); // Store token in cookie for 24 hours
                return $response;
            }
            
            // For web/Inertia requests, redirect directly to dashboard
            return redirect($this->getDashboardRoute($user->role))
                ->with('success', 'Login successful')
                ->withCookie(cookie('auth_token', $token, 60 * 24));
            
        } catch (\Exception $e) {
            Log::error('Student login error: ' . $e->getMessage());
            
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'An error occurred during login. Please try again.'
                ], 500);
            }
            
            return back()->withErrors([
                'email' => 'An error occurred during login. Please try again.'
            ])->withInput();
        }
    }

    /**
     * Show a specific student.
     *
     * @param int $id
     * @return \Inertia\Response
     */
    public function showStudent($id)
    {
        $student = Student::with(['user', 'strand', 'section', 'schoolYear'])
            ->findOrFail($id);
        
        return Inertia::render('StudentProfile', [
            'student' => $student
        ]);
    }

    /**
     * List all students.
     *
     * @return \Inertia\Response
     */
    public function listStudents()
    {
        $students = Student::with(['user', 'strand', 'section'])->get();
        return Inertia::render('StudentList', [
            'students' => $students
        ]);
    }

    /**
     * Update a student.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function updateStudent(Request $request, $id)
    {
        $student = Student::findOrFail($id);
        $student->update($request->all());
        return redirect()->route('student.list')->with('success', 'Student updated successfully');
    }

    /**
     * Delete a student.
     *
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function deleteStudent($id)
    {
        $student = Student::findOrFail($id);
        $student->delete();
        return redirect()->route('student.list')->with('success', 'Student deleted successfully');
    }

    /**
     * Change password for Faculty.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function changePasswordFaculty(Request $request)
    {
        $request->validate([
            'new_password' => 'required|string|min:8',
            'confirm_password' => 'required|string|same:new_password',
        ]);

        // Get authenticated user from Sanctum token
        $user = $request->user();
        
        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access. Please login first.',
                'errors' => ['form' => 'Unauthorized access. Please login first.']
            ], 403);
        }

        // Update password with proper encryption and clear plain_password
        $user->update([
            'password' => Hash::make($request->new_password),
            'plain_password' => null, // Remove plain password for security
            'password_change_required' => false,
            'password_changed' => true,
        ]);

        // Refresh user data to ensure updated values
        $user->refresh();

        // Revoke old tokens and create a fresh one to prevent authentication conflicts
        $user->tokens()->delete();
        $newToken = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully. You can now access your dashboard.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'password_changed' => true,
                'password_change_required' => false
            ],
            'token' => $newToken,
            'redirect' => '/faculty/dashboard'
        ]);
    }

    /**
     * Change password for Coordinator.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    public function changePasswordCoordinator(Request $request)
    {
        $request->validate([
            'new_password' => 'required|string|min:8',
            'confirm_password' => 'required|string|same:new_password',
        ]);

        // Try to get user from request (Sanctum) or session
        $user = $request->user();
        
        // If no user from Sanctum, try session-based auth
        if (!$user && session('user_data')) {
            $userData = session('user_data');
            $user = User::find($userData['id']);
        }

        if (!$user || !in_array($user->role, ['faculty', 'coordinator'])) {
            if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access. Please login first.'
                ], 403);
            }
            return back()->withErrors(['form' => 'Unauthorized access. Please login first.']);
        }

        // Update password with proper encryption and clear plain_password
        $user->update([
            'password' => Hash::make($request->new_password),
            'plain_password' => null, // Remove plain password for security
            'password_change_required' => false,
            'password_changed' => true,
        ]);

        if ($request->expectsJson() || $request->header('Accept') === 'application/json') {
            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully. You can now access your dashboard.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'password_changed' => true,
                    'password_change_required' => false
                ],
                'redirect' => '/faculty/dashboard'
            ]);
        }

        return redirect()->route('faculty.dashboard')->with('success', 'Password changed successfully.');
    }
}
