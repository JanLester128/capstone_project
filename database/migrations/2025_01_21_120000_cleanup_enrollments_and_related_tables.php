<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Clean up unnecessary columns from enrollments table and optimize related tables
     */
    public function up(): void
    {
        // Clean up enrollments table - remove redundant columns
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Remove redundant columns that duplicate existing data
                if (Schema::hasColumn('enrollments', 'student_name')) {
                    $table->dropColumn('student_name'); // Redundant - can get from users table
                }
                
                if (Schema::hasColumn('enrollments', 'student_lrn')) {
                    $table->dropColumn('student_lrn'); // Redundant - already have 'lrn' column
                }
                
                if (Schema::hasColumn('enrollments', 'last_school_attended')) {
                    $table->dropColumn('last_school_attended'); // Redundant - already have 'previous_school'
                }
                
                // Remove user_id column if it exists (duplicate of student_id)
                if (Schema::hasColumn('enrollments', 'user_id')) {
                    // Drop foreign key constraint first if it exists
                    try {
                        $table->dropForeign(['user_id']);
                    } catch (Exception $e) {
                        // Foreign key might not exist, continue
                    }
                    $table->dropColumn('user_id');
                }
            });
        }

        // Optimize transferee_previous_schools table - reduce string length
        if (Schema::hasTable('transferee_previous_schools')) {
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                // Change last_school from 255 to 100 characters
                if (Schema::hasColumn('transferee_previous_schools', 'last_school')) {
                    $table->string('last_school', 100)->change();
                }
            });
        }

        // Note: summer_class_schedules.room is already 100 characters
        // Note: transferee_credited_subjects.school_year is already 20 characters
        // Note: All other columns in enrollments table are actively used and should be kept
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore removed columns from enrollments table
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Restore student_name column
                if (!Schema::hasColumn('enrollments', 'student_name')) {
                    $table->string('student_name')->nullable()->after('student_id');
                }
                
                // Restore student_lrn column
                if (!Schema::hasColumn('enrollments', 'student_lrn')) {
                    $table->string('student_lrn', 20)->nullable()->after('student_name');
                }
                
                // Restore last_school_attended column
                if (!Schema::hasColumn('enrollments', 'last_school_attended')) {
                    $table->string('last_school_attended')->nullable()->after('student_lrn');
                }
                
                // Restore user_id column
                if (!Schema::hasColumn('enrollments', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->after('student_id')
                          ->constrained('users')->nullOnDelete();
                }
            });
        }

        // Restore transferee_previous_schools.last_school to 255 characters
        if (Schema::hasTable('transferee_previous_schools')) {
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                if (Schema::hasColumn('transferee_previous_schools', 'last_school')) {
                    $table->string('last_school', 255)->change();
                }
            });
        }
    }
};
