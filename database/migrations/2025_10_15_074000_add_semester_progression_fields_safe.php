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
        // Add semester and progression fields to enrollments table
        Schema::table('enrollments', function (Blueprint $table) {
            if (!Schema::hasColumn('enrollments', 'semester')) {
                $table->integer('semester')->default(1)->after('intended_grade_level');
            }
            if (!Schema::hasColumn('enrollments', 'enrollment_category')) {
                $table->enum('enrollment_category', ['initial', 'semester_progression', 'grade_progression', 'summer_class'])->default('initial')->after('enrollment_type');
            }
            if (!Schema::hasColumn('enrollments', 'previous_enrollment_id')) {
                $table->unsignedBigInteger('previous_enrollment_id')->nullable()->after('enrollment_category');
                $table->foreign('previous_enrollment_id')->references('id')->on('enrollments')->onDelete('set null');
            }
            if (!Schema::hasColumn('enrollments', 'failed_subjects')) {
                $table->json('failed_subjects')->nullable()->after('previous_enrollment_id');
            }
            if (!Schema::hasColumn('enrollments', 'is_summer_class')) {
                $table->boolean('is_summer_class')->default(false)->after('failed_subjects');
            }
            
            // Add indexes
            if (!Schema::hasIndex('enrollments', ['semester', 'enrollment_category'])) {
                $table->index(['semester', 'enrollment_category']);
            }
        });

        // Create semester_progressions table if it doesn't exist
        if (!Schema::hasTable('semester_progressions')) {
            Schema::create('semester_progressions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_id');
                $table->unsignedBigInteger('from_enrollment_id');
                $table->unsignedBigInteger('to_enrollment_id')->nullable();
                $table->unsignedBigInteger('school_year_id');
                $table->integer('from_semester');
                $table->integer('to_semester');
                $table->integer('from_grade_level');
                $table->integer('to_grade_level');
                $table->enum('progression_type', ['semester_advance', 'grade_advance', 'summer_remedial']);
                $table->enum('status', ['pending', 'approved', 'completed', 'failed'])->default('pending');
                $table->json('completion_requirements')->nullable();
                $table->text('coordinator_notes')->nullable();
                $table->unsignedBigInteger('processed_by')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();

                $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('from_enrollment_id')->references('id')->on('enrollments')->onDelete('cascade');
                $table->foreign('to_enrollment_id')->references('id')->on('enrollments')->onDelete('set null');
                $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('cascade');
                $table->foreign('processed_by')->references('id')->on('users')->onDelete('set null');
                
                $table->index(['student_id', 'school_year_id']);
                $table->index(['progression_type', 'status']);
            });
        }

        // Create summer_classes table if it doesn't exist
        if (!Schema::hasTable('summer_classes')) {
            Schema::create('summer_classes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('enrollment_id');
                $table->unsignedBigInteger('student_id');
                $table->unsignedBigInteger('school_year_id');
                $table->unsignedBigInteger('section_id')->nullable();
                $table->json('subjects_to_retake');
                $table->date('start_date');
                $table->date('end_date');
                $table->enum('status', ['enrolled', 'ongoing', 'completed', 'failed', 'dropped'])->default('enrolled');
                $table->json('final_grades')->nullable();
                $table->boolean('passed_all_subjects')->default(false);
                $table->text('coordinator_notes')->nullable();
                $table->unsignedBigInteger('enrolled_by');
                $table->timestamps();

                $table->foreign('enrollment_id')->references('id')->on('enrollments')->onDelete('cascade');
                $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('cascade');
                $table->foreign('section_id')->references('id')->on('sections')->onDelete('set null');
                $table->foreign('enrolled_by')->references('id')->on('users')->onDelete('cascade');
                
                $table->index(['student_id', 'school_year_id']);
                $table->index(['status', 'start_date']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('summer_classes');
        Schema::dropIfExists('semester_progressions');
        
        Schema::table('enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('enrollments', 'previous_enrollment_id')) {
                $table->dropForeign(['previous_enrollment_id']);
            }
            if (Schema::hasIndex('enrollments', ['semester', 'enrollment_category'])) {
                $table->dropIndex(['semester', 'enrollment_category']);
            }
            
            $columnsToRemove = [
                'semester',
                'enrollment_category', 
                'previous_enrollment_id',
                'failed_subjects',
                'is_summer_class'
            ];
            
            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('enrollments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
