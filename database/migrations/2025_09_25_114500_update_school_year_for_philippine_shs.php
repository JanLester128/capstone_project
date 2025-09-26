<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Updates school year structure for Philippine Senior High School system:
     * - Single enrollment covers full academic year (both semesters)
     * - School year controls enrollment window, not schedule visibility
     * - Faculty manages grade level progression
     */
    public function up(): void
    {
        // Update school_years table for Philippine SHS system
        Schema::table('school_years', function (Blueprint $table) {
            // Add enrollment window control
            $table->boolean('enrollment_open')->default(true)->after('is_active');
            $table->datetime('enrollment_start')->nullable()->after('enrollment_open');
            $table->datetime('enrollment_end')->nullable()->after('enrollment_start');
            
            // Add academic year tracking (separate from enrollment window)
            $table->boolean('is_current_academic_year')->default(false)->after('enrollment_end');
            
            // Add grade progression tracking
            $table->boolean('allow_grade_progression')->default(false)->after('is_current_academic_year');
        });

        // Update enrollments table for full-year enrollment
        Schema::table('enrollments', function (Blueprint $table) {
            // Add grade level tracking for progression (intended grade level for application)
            $table->integer('intended_grade_level')->default(11)->after('strand_id');
            
            // Add academic year completion tracking
            $table->boolean('first_semester_completed')->default(false)->after('intended_grade_level');
            $table->boolean('second_semester_completed')->default(false)->after('first_semester_completed');
            $table->boolean('academic_year_completed')->default(false)->after('second_semester_completed');
            
            // Add progression tracking
            $table->boolean('eligible_for_progression')->default(false)->after('academic_year_completed');
            $table->datetime('progressed_at')->nullable()->after('eligible_for_progression');
            $table->unsignedBigInteger('progressed_by')->nullable()->after('progressed_at');
            
            // Foreign key for faculty who progressed the student
            $table->foreign('progressed_by')->references('id')->on('users')->onDelete('set null');
        });

        // Note: subjects_schedule table creation removed as requested

        // Create enrollment_subjects table for tracking student-subject enrollment
        Schema::create('enrollment_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('enrollment_id');
            $table->unsignedBigInteger('subject_id');
            $table->enum('semester', ['1st', '2nd', 'both'])->default('both');
            $table->enum('status', ['enrolled', 'completed', 'failed', 'dropped'])->default('enrolled');
            $table->decimal('first_quarter_grade', 5, 2)->nullable();
            $table->decimal('second_quarter_grade', 5, 2)->nullable();
            $table->decimal('third_quarter_grade', 5, 2)->nullable();
            $table->decimal('fourth_quarter_grade', 5, 2)->nullable();
            $table->decimal('final_grade', 5, 2)->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('enrollment_id')->references('id')->on('enrollments')->onDelete('cascade');
            $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');

            // Unique constraint
            $table->unique(['enrollment_id', 'subject_id'], 'unique_enrollment_subject');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop new tables
        Schema::dropIfExists('enrollment_subjects');
        // Note: subjects_schedule table drop removed as table creation was removed

        // Remove columns from enrollments
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['progressed_by']);
            $table->dropColumn([
                'intended_grade_level',
                'first_semester_completed',
                'second_semester_completed', 
                'academic_year_completed',
                'eligible_for_progression',
                'progressed_at',
                'progressed_by'
            ]);
        });

        // Remove columns from school_years
        Schema::table('school_years', function (Blueprint $table) {
            $table->dropColumn([
                'enrollment_open',
                'enrollment_start',
                'enrollment_end',
                'is_current_academic_year',
                'allow_grade_progression'
            ]);
        });
    }
};
