<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix enrollment records that have null student_id but have student_personal_info_id
        Log::info('Starting enrollment student_id fix migration');
        
        $enrollmentsToFix = DB::table('enrollments')
            ->whereNull('student_id')
            ->whereNotNull('student_personal_info_id')
            ->get();
            
        Log::info('Found enrollments to fix', [
            'count' => $enrollmentsToFix->count()
        ]);
        
        foreach ($enrollmentsToFix as $enrollment) {
            // Find the corresponding user_id from student_personal_info
            $studentPersonalInfo = DB::table('student_personal_info')
                ->where('id', $enrollment->student_personal_info_id)
                ->first();
                
            if ($studentPersonalInfo && $studentPersonalInfo->user_id) {
                // Update the enrollment with the correct student_id
                DB::table('enrollments')
                    ->where('id', $enrollment->id)
                    ->update(['student_id' => $studentPersonalInfo->user_id]);
                    
                Log::info('Fixed enrollment student_id', [
                    'enrollment_id' => $enrollment->id,
                    'student_personal_info_id' => $enrollment->student_personal_info_id,
                    'fixed_student_id' => $studentPersonalInfo->user_id
                ]);
            }
        }
        
        Log::info('Completed enrollment student_id fix migration');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration cannot be reversed as it fixes data integrity
        Log::info('Enrollment student_id fix migration cannot be reversed');
    }
};
