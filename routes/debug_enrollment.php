<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Debug route to check enrollments table structure
Route::get('/debug/enrollments-structure', function () {
    try {
        $enrollmentColumns = DB::select("DESCRIBE enrollments");
        $studentPersonalInfoColumns = DB::select("DESCRIBE student_personal_info");
        
        $hasStudentId = Schema::hasColumn('enrollments', 'student_id');
        $hasStudentPersonalInfoId = Schema::hasColumn('enrollments', 'student_personal_info_id');
        $hasFirstStrandChoice = Schema::hasColumn('enrollments', 'first_strand_choice_id');
        $hasSecondStrandChoice = Schema::hasColumn('enrollments', 'second_strand_choice_id');
        $hasThirdStrandChoice = Schema::hasColumn('enrollments', 'third_strand_choice_id');
        
        return response()->json([
            'enrollments_table' => [
                'exists' => Schema::hasTable('enrollments'),
                'columns' => $enrollmentColumns,
                'column_checks' => [
                    'student_id' => $hasStudentId,
                    'student_personal_info_id' => $hasStudentPersonalInfoId,
                    'first_strand_choice_id' => $hasFirstStrandChoice,
                    'second_strand_choice_id' => $hasSecondStrandChoice,
                    'third_strand_choice_id' => $hasThirdStrandChoice,
                ]
            ],
            'student_personal_info_table' => [
                'exists' => Schema::hasTable('student_personal_info'),
                'columns' => $studentPersonalInfoColumns
            ]
        ], 200, [], JSON_PRETTY_PRINT);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});
