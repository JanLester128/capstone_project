<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing users' student_type based on their student_status in student_personal_info
        DB::statement("
            UPDATE users 
            SET student_type = CASE 
                WHEN EXISTS (
                    SELECT 1 FROM student_personal_info 
                    WHERE student_personal_info.user_id = users.id 
                    AND student_personal_info.student_status = 'Transferee'
                ) THEN 'transferee'
                WHEN EXISTS (
                    SELECT 1 FROM student_personal_info 
                    WHERE student_personal_info.user_id = users.id 
                    AND student_personal_info.student_status = 'Continuing'
                ) THEN 'continuing'
                WHEN EXISTS (
                    SELECT 1 FROM student_personal_info 
                    WHERE student_personal_info.user_id = users.id 
                    AND student_personal_info.student_status = 'New Student'
                ) THEN 'new'
                ELSE student_type
            END
            WHERE role = 'student'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reset all student types to 'new' (original default)
        DB::table('users')
            ->where('role', 'student')
            ->update(['student_type' => 'new']);
    }
};
