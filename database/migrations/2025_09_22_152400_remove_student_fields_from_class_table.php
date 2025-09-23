<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('class', function (Blueprint $table) {
            // Remove student-related fields that don't belong in class table
            // These should be in class_details table instead
            
            // Drop foreign key constraints first
            $table->dropForeign(['student_id']);
            $table->dropForeign(['enrollment_id']);
            
            // Drop the columns
            $table->dropColumn([
                'student_id',
                'enrollment_id',
                'subject_code',        // Redundant - already have subject_id FK
                'subject_name',        // Redundant - can get from subjects table
                'strand_name',         // Should be in student/enrollment data
                'registration_number', // Student-specific data
                'date_enrolled',       // Student-specific data
                'instructor_name',     // Redundant - can get from users table via faculty_id
                'student_name',        // Student-specific data
                'student_lrn',         // Student-specific data
                'grade_level',         // Student-specific data
                'enrollment_status'    // Student-specific data
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class', function (Blueprint $table) {
            // Re-add the columns if needed (though they shouldn't be here)
            $table->foreignId('student_id')->nullable()->constrained('student_personal_info')->onDelete('cascade');
            $table->foreignId('enrollment_id')->nullable()->constrained('enrollments')->onDelete('cascade');
            $table->string('subject_code', 100)->nullable();
            $table->string('subject_name', 100)->nullable();
            $table->string('strand_name', 100)->nullable();
            $table->string('registration_number', 100)->nullable();
            $table->date('date_enrolled')->nullable();
            $table->string('instructor_name', 100)->nullable();
            $table->string('student_name', 100)->nullable();
            $table->string('student_lrn', 100)->nullable();
            $table->string('grade_level', 100)->nullable();
            $table->enum('enrollment_status', ['enrolled', 'completed', 'dropped'])->default('enrolled');
        });
    }
};
