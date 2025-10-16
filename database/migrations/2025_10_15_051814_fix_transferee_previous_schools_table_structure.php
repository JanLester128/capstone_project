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
        // Check if table exists and needs fixing
        if (Schema::hasTable('transferee_previous_schools')) {
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                // Check if student_id exists and student_personal_info_id doesn't
                if (Schema::hasColumn('transferee_previous_schools', 'student_id') && 
                    !Schema::hasColumn('transferee_previous_schools', 'student_personal_info_id')) {
                    
                    // Add the correct column
                    $table->foreignId('student_personal_info_id')->nullable()->constrained('student_personal_info')->onDelete('cascade');
                    
                    // Copy data from student_id to student_personal_info_id
                    // This assumes student_id maps to the user_id in student_personal_info
                }
            });
            
            // Update the data to map student_id to student_personal_info_id
            DB::statement('
                UPDATE transferee_previous_schools tps
                JOIN student_personal_info spi ON tps.student_id = spi.user_id
                SET tps.student_personal_info_id = spi.id
                WHERE tps.student_personal_info_id IS NULL
            ');
            
            // Now drop the old student_id column and make student_personal_info_id not nullable
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                if (Schema::hasColumn('transferee_previous_schools', 'student_id')) {
                    $table->dropForeign(['student_id']);
                    $table->dropColumn('student_id');
                }
                
                // Make student_personal_info_id not nullable
                $table->foreignId('student_personal_info_id')->nullable(false)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('transferee_previous_schools')) {
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                // Add back student_id column
                $table->foreignId('student_id')->nullable()->constrained('users')->onDelete('cascade');
            });
            
            // Copy data back
            DB::statement('
                UPDATE transferee_previous_schools tps
                JOIN student_personal_info spi ON tps.student_personal_info_id = spi.id
                SET tps.student_id = spi.user_id
            ');
            
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                // Drop student_personal_info_id and make student_id not nullable
                $table->dropForeign(['student_personal_info_id']);
                $table->dropColumn('student_personal_info_id');
                $table->foreignId('student_id')->nullable(false)->change();
            });
        }
    }
};
