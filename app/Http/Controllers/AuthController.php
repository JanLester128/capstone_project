<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Student;
use Inertia\Inertia;

class AuthController extends Controller
{
    /**
     * 🔑 General login (any role, e.g., Registrar)
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid login credentials.'], 401);
        }

        $user = Auth::user();

        $token = $user->createToken('login-token')->plainTextToken;

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'role' => $user->role,
            'token' => $token,
        ]);
    }

    /**
     * 🎓 Student-only login (Sanctum token)
     */
    public function loginStudent(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid login credentials.'], 401);
        }

        $user = Auth::user();

        if ($user->role !== 'student') {
            return response()->json(['message' => 'Unauthorized. Only students can log in here.'], 403);
        }

        $request->session()->regenerate();

        // Issue a Sanctum token for API logout
        $token = $user->createToken('student-login-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'role' => $user->role,
            'token' => $token,
            'redirect' => route('student.dashboard'),
        ]);
    }

    /**
     * 📝 Register a new student
     */
    public function registerStudent(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'hs_grade' => 'required|string',
            'strand_id' => 'required|integer',
            'section_id' => 'required|integer',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'role' => 'student',
            'password' => Hash::make($request->password),
        ]);

        Student::create([
            'user_id' => $user->id,
            'hs_grade' => $request->hs_grade,
            'strand_id' => $request->strand_id,
            'section_id' => $request->section_id,
        ]);

        return response()->json([
            'message' => 'Student registered successfully.',
            'user' => $user
        ], 201);
    }

   public function logout(Request $request)
{
    $user = $request->user();

    if (!$user) {
        return response()->json(['message' => 'No authenticated user found.'], 401);
    }

    // Student logout via Sanctum token
    if ($request->bearerToken() && $user->role === 'student') {
        $token = $user->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Student logged out successfully.',
            'redirect' => route('student.login'),
        ]);
    }

    // Registrar session logout
    if ($user->role === 'registrar') {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Registrar logged out successfully.',
            'redirect' => '/login',
        ]);
    }

    return response()->json([
        'message' => 'Logout completed.',
        'redirect' => '/',
    ]);
}


}
