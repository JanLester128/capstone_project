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
        // Check if enrollments table exists and constraint doesn't exist
        if (Schema::hasTable('enrollments')) {
            $constraintExists = DB::select("
                SELECT COUNT(*) as count 
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'enrollments' 
                AND CONSTRAINT_NAME = 'enrollments_student_id_school_year_id_unique'
            ", [config('database.connections.mysql.database')]);

            if ($constraintExists[0]->count == 0) {
                Schema::table('enrollments', function (Blueprint $table) {
                    // Ensure a student can only be enrolled once per school year
                    $table->unique(['student_id', 'school_year_id']);
                });
            }
        }

        // Check if grades table exists and constraint doesn't exist
        if (Schema::hasTable('grades')) {
            $constraintExists = DB::select("
                SELECT COUNT(*) as count 
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'grades' 
                AND CONSTRAINT_NAME = 'grades_student_id_subject_id_school_year_id_unique'
            ", [config('database.connections.mysql.database')]);

            if ($constraintExists[0]->count == 0) {
                Schema::table('grades', function (Blueprint $table) {
                    // Ensure a student can only have one grade per subject per school year
                    $table->unique(['student_id', 'subject_id', 'school_year_id']);
                });
            }
        }

        // Check if class_details table exists and constraint doesn't exist
        if (Schema::hasTable('class_details')) {
            // Check for existing constraints (either name could exist)
            $constraintExists = DB::select("
                SELECT COUNT(*) as count 
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'class_details' 
                AND (CONSTRAINT_NAME = 'class_details_class_id_enrollment_id_unique' 
                     OR CONSTRAINT_NAME = 'unique_student_class_enrollment')
            ", [config('database.connections.mysql.database')]);

            if ($constraintExists[0]->count == 0) {
                Schema::table('class_details', function (Blueprint $table) {
                    // Ensure a student can only be enrolled once per class (using enrollment_id)
                    $table->unique(['class_id', 'enrollment_id']);
                });
            }
        }

        // Check if sections table exists and constraint doesn't exist
        if (Schema::hasTable('sections')) {
            $constraintExists = DB::select("
                SELECT COUNT(*) as count 
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'sections' 
                AND CONSTRAINT_NAME = 'sections_section_name_strand_id_year_level_unique'
            ", [config('database.connections.mysql.database')]);

            if ($constraintExists[0]->count == 0) {
                Schema::table('sections', function (Blueprint $table) {
                    // Ensure section names are unique within the same strand and year level
                    $table->unique(['section_name', 'strand_id', 'year_level']);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop unique constraints in reverse order to avoid foreign key conflicts
        try {
            if (Schema::hasTable('sections')) {
                Schema::table('sections', function (Blueprint $table) {
                    $table->dropUnique(['section_name', 'strand_id', 'year_level']);
                });
            }
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }

        try {
            if (Schema::hasTable('class_details')) {
                Schema::table('class_details', function (Blueprint $table) {
                    // Try to drop both possible constraint names
                    try {
                        $table->dropUnique(['class_id', 'enrollment_id']);
                    } catch (\Exception $e) {
                        // Try the other constraint name
                        try {
                            $table->dropUnique('unique_student_class_enrollment');
                        } catch (\Exception $e2) {
                            // Ignore if neither exists
                        }
                    }
                });
            }
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }

        try {
            if (Schema::hasTable('grades')) {
                Schema::table('grades', function (Blueprint $table) {
                    $table->dropUnique(['student_id', 'subject_id', 'school_year_id']);
                });
            }
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }

        try {
            if (Schema::hasTable('enrollments')) {
                Schema::table('enrollments', function (Blueprint $table) {
                    $table->dropUnique(['student_id', 'school_year_id']);
                });
            }
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }
    }
};
