<?php

namespace App\Http\Controllers\Faculty;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Enrollment;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Strand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FacultyGradeProgressionController extends Controller
{
    /**
     * Get all Grade 11 students eligible for progression to Grade 12
     */
    public function getGrade11Students()
    {
        try {
            // Get current active school year
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            if (!$activeSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active school year found',
                    'students' => []
                ]);
            }

            // Get Grade 11 students with their enrollment details
            $grade11Students = DB::table('enrollments')
                ->join('users', 'enrollments.user_id', '=', 'users.id')
                ->leftJoin('sections', 'enrollments.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('enrollments.grade_level', '11')
                ->where('enrollments.school_year_id', $activeSchoolYear->id)
                ->where('enrollments.status', 'enrolled')
                ->select([
                    'users.id',
                    'users.firstname',
                    'users.lastname',
                    'users.email',
                    'enrollments.grade_level',
                    'strands.name as strand_name',
                    'sections.name as section_name',
                    'enrollments.lrn',
                    'enrollments.student_status'
                ])
                ->get();

            return response()->json([
                'success' => true,
                'students' => $grade11Students
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching Grade 11 students: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Grade 11 students',
                'students' => []
            ], 500);
        }
    }

    /**
     * Progress a Grade 11 student to Grade 12
     */
    public function progressToGrade12(Request $request)
    {
        $request->validate([
            'student_id' => 'required|integer|exists:users,id',
            'school_year_id' => 'required|integer|exists:school_years,id'
        ]);

        try {
            DB::beginTransaction();

            $studentId = $request->student_id;
            $schoolYearId = $request->school_year_id;

            // Check if student exists and has Grade 11 enrollment
            $grade11Enrollment = Enrollment::where('user_id', $studentId)
                ->where('grade_level', '11')
                ->where('school_year_id', $schoolYearId)
                ->where('status', 'enrolled')
                ->first();

            if (!$grade11Enrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found or not enrolled in Grade 11'
                ]);
            }

            // Check if student already has Grade 12 enrollment
            $existingGrade12 = Enrollment::where('user_id', $studentId)
                ->where('grade_level', '12')
                ->where('school_year_id', $schoolYearId)
                ->first();

            if ($existingGrade12) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student is already enrolled in Grade 12'
                ]);
            }

            // Get the student's current section and strand
            $currentSection = Section::find($grade11Enrollment->section_id);
            
            // Find corresponding Grade 12 section (same strand)
            $grade12Section = Section::where('strand_id', $currentSection->strand_id)
                ->where('grade_level', '12')
                ->first();

            if (!$grade12Section) {
                return response()->json([
                    'success' => false,
                    'message' => 'No Grade 12 section found for this strand'
                ]);
            }

            // Create new Grade 12 enrollment
            $grade12Enrollment = new Enrollment();
            $grade12Enrollment->user_id = $studentId;
            $grade12Enrollment->school_year_id = $schoolYearId;
            $grade12Enrollment->section_id = $grade12Section->id;
            $grade12Enrollment->grade_level = '12';
            $grade12Enrollment->status = 'enrolled';
            $grade12Enrollment->student_status = 'continuing'; // or 'regular'
            $grade12Enrollment->lrn = $grade11Enrollment->lrn;
            $grade12Enrollment->enrollment_date = now();
            $grade12Enrollment->save();

            // Update Grade 11 enrollment status to completed
            $grade11Enrollment->status = 'completed';
            $grade11Enrollment->save();

            DB::commit();

            // Get student name for response
            $student = User::find($studentId);

            return response()->json([
                'success' => true,
                'message' => "Student {$student->firstname} {$student->lastname} has been successfully progressed to Grade 12"
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error progressing student to Grade 12: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to progress student to Grade 12. Please try again.'
            ], 500);
        }
    }

    /**
     * Get detailed student information
     */
    public function getStudentDetails($id)
    {
        try {
            $student = DB::table('enrollments')
                ->join('users', 'enrollments.user_id', '=', 'users.id')
                ->leftJoin('sections', 'enrollments.section_id', '=', 'sections.id')
                ->leftJoin('strands', 'sections.strand_id', '=', 'strands.id')
                ->where('users.id', $id)
                ->select([
                    'users.*',
                    'enrollments.grade_level',
                    'enrollments.lrn',
                    'enrollments.student_status',
                    'enrollments.enrollment_date',
                    'strands.name as strand_name',
                    'sections.name as section_name'
                ])
                ->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }

            return response()->json($student);

        } catch (\Exception $e) {
            Log::error('Error fetching student details: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student details'
            ], 500);
        }
    }
}
