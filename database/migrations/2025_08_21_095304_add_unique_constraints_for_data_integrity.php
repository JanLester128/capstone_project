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
        Schema::table('enrollments', function (Blueprint $table) {
            // Ensure a student can only be enrolled once per school year
            $table->unique(['student_id', 'school_year_id']);
        });

        Schema::table('grades', function (Blueprint $table) {
            // Ensure a student can only have one grade per subject per school year
            $table->unique(['student_id', 'subject_id', 'school_year_id']);
        });

        Schema::table('class_details', function (Blueprint $table) {
            // Ensure a student can only be enrolled once per class
            $table->unique(['class_id', 'student_id']);
        });

        // Skip semester_subject table - it no longer exists since we integrated semesters into school_years
        // Schema::table('semester_subject', function (Blueprint $table) {
        //     // Ensure a subject can only be assigned once per semester
        //     $table->unique(['semester_id', 'subject_id']);
        // });

        // Skip strands unique constraint - already exists from create_strands_table migration
        // Schema::table('strands', function (Blueprint $table) {
        //     $table->unique('code'); // Already unique from table creation
        // });

        Schema::table('sections', function (Blueprint $table) {
            // Ensure section names are unique within the same strand and year level
            $table->unique(['section_name', 'strand_id', 'year_level']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop unique constraints in reverse order to avoid foreign key conflicts
        try {
            Schema::table('sections', function (Blueprint $table) {
                $table->dropUnique(['section_name', 'strand_id', 'year_level']);
            });
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }

        // Skip semester_subject table - it no longer exists
        // try {
        //     Schema::table('semester_subject', function (Blueprint $table) {
        //         $table->dropUnique(['semester_id', 'subject_id']);
        //     });
        // } catch (\Exception $e) {
        //     // Ignore if constraint doesn't exist
        // }

        try {
            Schema::table('class_details', function (Blueprint $table) {
                $table->dropUnique(['class_id', 'student_id']);
            });
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }

        try {
            Schema::table('grades', function (Blueprint $table) {
                $table->dropUnique(['student_id', 'subject_id', 'school_year_id']);
            });
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }

        try {
            Schema::table('enrollments', function (Blueprint $table) {
                $table->dropUnique(['student_id', 'school_year_id']);
            });
        } catch (\Exception $e) {
            // Ignore if constraint doesn't exist
        }
    }
};
