<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add support for summer class enrollment and full academic year tracking
     */
    public function up(): void
    {
        // Add summer enrollment fields to enrollments table
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Add enrollment type to distinguish regular vs summer enrollment
                if (!Schema::hasColumn('enrollments', 'enrollment_type')) {
                    $table->enum('enrollment_type', ['regular', 'summer', 'transferee'])
                          ->default('regular')
                          ->after('status');
                }
                
                // Add summer-specific fields
                if (!Schema::hasColumn('enrollments', 'summer_subjects')) {
                    $table->json('summer_subjects')->nullable()->after('enrollment_type');
                }
                
                if (!Schema::hasColumn('enrollments', 'schedule_preference')) {
                    $table->string('schedule_preference', 50)->nullable()->after('summer_subjects');
                }
                
                // Add academic year tracking
                if (!Schema::hasColumn('enrollments', 'academic_year_status')) {
                    $table->enum('academic_year_status', ['in_progress', 'completed', 'failed', 'summer_required'])
                          ->default('in_progress')
                          ->after('schedule_preference');
                }
            });
        }

        // Add summer semester support to class schedules
        if (Schema::hasTable('class')) {
            Schema::table('class', function (Blueprint $table) {
                // Update semester enum to include Summer
                if (Schema::hasColumn('class', 'semester')) {
                    // Note: MySQL doesn't support modifying enum directly, so we'll handle this in the controller
                    // The semester field should accept 'Summer' as a valid value
                }
                
                // Add enrollment reference for summer classes
                if (!Schema::hasColumn('class', 'enrollment_id')) {
                    $table->unsignedBigInteger('enrollment_id')->nullable()->after('school_year_id');
                    $table->foreign('enrollment_id')->references('id')->on('enrollments')->onDelete('cascade');
                }
            });
        }

        // Add summer semester support to subjects
        if (Schema::hasTable('subjects')) {
            Schema::table('subjects', function (Blueprint $table) {
                // Update semester enum to include Summer (handled in controller logic)
                // Add summer-specific flags
                if (!Schema::hasColumn('subjects', 'is_summer_subject')) {
                    $table->boolean('is_summer_subject')->default(false)->after('semester');
                }
                
                if (!Schema::hasColumn('subjects', 'summer_duration_weeks')) {
                    $table->integer('summer_duration_weeks')->nullable()->after('is_summer_subject');
                }
            });
        }

        // Add full academic year tracking to grades
        if (Schema::hasTable('grades')) {
            Schema::table('grades', function (Blueprint $table) {
                // Add academic year completion tracking
                if (!Schema::hasColumn('grades', 'is_summer_grade')) {
                    $table->boolean('is_summer_grade')->default(false)->after('semester');
                }
                
                if (!Schema::hasColumn('grades', 'original_failed_grade')) {
                    $table->decimal('original_failed_grade', 5, 2)->nullable()->after('is_summer_grade');
                }
                
                if (!Schema::hasColumn('grades', 'summer_completion_date')) {
                    $table->timestamp('summer_completion_date')->nullable()->after('original_failed_grade');
                }
            });
        }

        // Create summer_class_schedules table for specialized summer scheduling
        if (!Schema::hasTable('summer_class_schedules')) {
            Schema::create('summer_class_schedules', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('enrollment_id');
                $table->unsignedBigInteger('subject_id');
                $table->unsignedBigInteger('faculty_id')->nullable();
                $table->unsignedBigInteger('school_year_id');
                $table->string('schedule_type', 50)->default('intensive'); // intensive, regular, weekend
                $table->json('class_days'); // ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                $table->time('start_time');
                $table->time('end_time');
                $table->string('room', 100)->nullable();
                $table->date('start_date');
                $table->date('end_date');
                $table->integer('total_hours')->default(40); // Standard summer class hours
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
                $table->timestamps();

                // Foreign key constraints
                $table->foreign('enrollment_id')->references('id')->on('enrollments')->onDelete('cascade');
                $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
                $table->foreign('faculty_id')->references('id')->on('users')->onDelete('set null');
                $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('cascade');

                // Indexes for performance
                $table->index(['enrollment_id', 'school_year_id']);
                $table->index(['subject_id', 'school_year_id']);
                $table->index(['faculty_id', 'school_year_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop summer_class_schedules table
        Schema::dropIfExists('summer_class_schedules');

        // Remove summer support from grades table
        if (Schema::hasTable('grades')) {
            Schema::table('grades', function (Blueprint $table) {
                if (Schema::hasColumn('grades', 'summer_completion_date')) {
                    $table->dropColumn('summer_completion_date');
                }
                if (Schema::hasColumn('grades', 'original_failed_grade')) {
                    $table->dropColumn('original_failed_grade');
                }
                if (Schema::hasColumn('grades', 'is_summer_grade')) {
                    $table->dropColumn('is_summer_grade');
                }
            });
        }

        // Remove summer support from subjects table
        if (Schema::hasTable('subjects')) {
            Schema::table('subjects', function (Blueprint $table) {
                if (Schema::hasColumn('subjects', 'summer_duration_weeks')) {
                    $table->dropColumn('summer_duration_weeks');
                }
                if (Schema::hasColumn('subjects', 'is_summer_subject')) {
                    $table->dropColumn('is_summer_subject');
                }
            });
        }

        // Remove summer support from class table
        if (Schema::hasTable('class')) {
            Schema::table('class', function (Blueprint $table) {
                if (Schema::hasColumn('class', 'enrollment_id')) {
                    $table->dropForeign(['enrollment_id']);
                    $table->dropColumn('enrollment_id');
                }
            });
        }

        // Remove summer support from enrollments table
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                if (Schema::hasColumn('enrollments', 'academic_year_status')) {
                    $table->dropColumn('academic_year_status');
                }
                if (Schema::hasColumn('enrollments', 'schedule_preference')) {
                    $table->dropColumn('schedule_preference');
                }
                if (Schema::hasColumn('enrollments', 'summer_subjects')) {
                    $table->dropColumn('summer_subjects');
                }
                if (Schema::hasColumn('enrollments', 'enrollment_type')) {
                    $table->dropColumn('enrollment_type');
                }
            });
        }
    }
};
