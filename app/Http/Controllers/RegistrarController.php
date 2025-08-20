<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Registrar;
use App\Models\Faculty;
use App\Models\Coordinator;

class RegistrarController extends Controller
{
    // Page that shows teachers (faculty + coordinators)
        public function teachersPage()
    {
        $faculty = Faculty::with('user')->get();
        $coordinators = Coordinator::with('user')->get();

        $teachers = $faculty->map(fn($f) => [
            'id' => $f->user->id,
            'name' => $f->user->name,
            'email' => $f->user->email,
            'department' => 'Faculty',
        ])->merge(
            $coordinators->map(fn($c) => [
                'id' => $c->user->id,
                'name' => $c->user->name,
                'email' => $c->user->email,
                'department' => 'Coordinator',
            ])
        );

        return Inertia::render('Registrar/RegistrarFaculty', [
            'initialTeachers' => $teachers
        ]);
    }
    // List all registrars
    public function index()
    {
        $registrars = Registrar::with('user')->get();
        return response()->json($registrars);
    }

    // Placeholder for student listing
    public function students()
    {
        return response()->json(['message' => 'Students method not implemented yet.']);
    }

    // Register a registrar account
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'registrar',
        ]);

        Registrar::create(['user_id' => $user->id]);

        return response()->json([
            'message' => 'Registrar account created successfully',
            'user' => $user
        ], 201);
    }

    // Create faculty or coordinator under the logged-in registrar
        public function store(Request $request)
    {
        // Ensure only registrar can access
        if ($request->user()->role !== 'registrar') {
            return Inertia::render('Registrar/RegistrarFaculty', [
                'initialTeachers' => [],
                'flash' => ['error' => 'Unauthorized']
            ]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:faculty,coordinator',
        ]);

        $password = Str::random(10);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($password),
            'role' => $validated['role'],
        ]);

        if ($validated['role'] === 'faculty') {
            Faculty::create([
                'user_id' => $user->id,
                'registrar_id' => $request->user()->registrar->id
            ]);
        } else {
            Coordinator::create([
                'user_id' => $user->id,
                'registrar_id' => $request->user()->registrar->id
            ]);
        }

        // Return Inertia response with teacher info + generated password
        return Inertia::render('Registrar/RegistrarFaculty', [
            'initialTeachers' => [
                [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'department' => ucfirst($validated['role']),
                    'password' => $password
                ]
            ],
            'flash' => [
                'success' => ucfirst($validated['role']) . ' account created successfully',
                'password' => $password
            ]
        ]);
    }


    // Show a registrar
    public function show($id)
    {
        $registrar = Registrar::with('user')->find($id);
        if (!$registrar) {
            return response()->json(['message' => 'Registrar not found'], 404);
        }
        return response()->json($registrar);
    }

    // Update faculty or coordinator
    public function update(Request $request, $userId)
    {
        if ($request->user()->role !== 'registrar') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $registrar = $request->user()->registrar;
        if (!$registrar)
            return response()->json(['message' => 'Registrar profile not found'], 422);

        $user = User::find($userId);
        if (!$user)
            return response()->json(['message' => 'User not found'], 404);
        if (!in_array($user->role, ['faculty', 'coordinator']))
            return response()->json(['message' => 'Can only update faculty or coordinator accounts'], 403);

        $record = $user->role === 'faculty'
            ? Faculty::where('user_id', $user->id)->where('registrar_id', $registrar->id)->first()
            : Coordinator::where('user_id', $user->id)->where('registrar_id', $registrar->id)->first();

        if (!$record)
            return response()->json(['message' => 'You do not have permission to update this user'], 403);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:6',
        ]);

        if (isset($validated['name']))
            $user->name = $validated['name'];
        if (isset($validated['email']))
            $user->email = $validated['email'];
        if (!empty($validated['password']))
            $user->password = Hash::make($validated['password']);

        $user->save();

        return response()->json([
            'message' => ucfirst($user->role) . ' account updated successfully',
            'user' => $user
        ]);
    }

    // Delete faculty or coordinator
    public function delete(Request $request, $userId)
    {
        if ($request->user()->role !== 'registrar') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $registrar = $request->user()->registrar;
        if (!$registrar)
            return response()->json(['message' => 'Registrar profile not found'], 422);

        $user = User::find($userId);
        if (!$user)
            return response()->json(['message' => 'User not found'], 404);
        if (!in_array($user->role, ['faculty', 'coordinator']))
            return response()->json(['message' => 'Can only delete faculty or coordinator accounts'], 403);

        $record = $user->role === 'faculty'
            ? Faculty::where('user_id', $user->id)->where('registrar_id', $registrar->id)->first()
            : Coordinator::where('user_id', $user->id)->where('registrar_id', $registrar->id)->first();

        if (!$record)
            return response()->json(['message' => 'You do not have permission to delete this user'], 403);

        $record->delete();
        $user->delete();

        return response()->json(['message' => ucfirst($user->role) . ' account deleted successfully']);
    }
}
