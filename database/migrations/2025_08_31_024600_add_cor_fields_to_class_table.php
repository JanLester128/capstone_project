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
            // Add COR-related fields
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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropForeign(['enrollment_id']);
            $table->dropColumn([
                'student_id',
                'enrollment_id',
                'subject_code',
                'subject_name',
                'strand_name',
                'registration_number',
                'date_enrolled',
                'instructor_name',
                'student_name',
                'student_lrn',
                'grade_level',
                'enrollment_status'
            ]);
        });
    }
};
