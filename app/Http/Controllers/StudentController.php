<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function __construct()
    {
        // Require authentication for all actions
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of the resource.
     * Registrar or faculty can see all. Student sees only their own.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'student') {
            $student = Student::with(['user', 'strand', 'section'])
                ->where('user_id', $user->id)
                ->first();

            if (! $student) {
                return response()->json(['message' => 'Student record not found.'], 404);
            }

            return response()->json($student);
        }

        // registrar / faculty / others with permission
        $students = Student::with(['user', 'strand', 'section'])->get();
        return response()->json($students);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $student = Student::with(['user', 'strand', 'section'])->find($id);

        if (! $student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        if ($user->role === 'student' && $student->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($student);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $student = Student::find($id);

        if (! $student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        if ($user->role === 'student' && $student->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'hs_grade'   => 'sometimes|string',
            'strand_id'  => 'sometimes|exists:strands,id',
            'section_id' => 'sometimes|exists:sections,id',
        ]);

        $student->update($validated);

        return response()->json([
            'message' => 'Student updated successfully.',
            'student' => $student->load(['user', 'strand', 'section'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     * Only registrar/faculty can delete. Student cannot delete self here.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $student = Student::find($id);
        if (! $student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        if ($user->role === 'student') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Optional: also delete associated user if desired
        $relatedUser = $student->user;
        $student->delete();
        if ($relatedUser) {
            $relatedUser->delete();
        }

        return response()->json(['message' => 'Student (and user) deleted successfully.']);
    }
}
