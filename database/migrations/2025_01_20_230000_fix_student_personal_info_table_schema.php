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
        // Check if table exists before trying to modify it
        if (!Schema::hasTable('student_personal_info')) {
            return;
        }

        // First, drop foreign key constraints before dropping columns
        Schema::table('student_personal_info', function (Blueprint $table) {
            // Drop foreign key constraints first
            if (Schema::hasColumn('student_personal_info', 'strand_id')) {
                $table->dropForeign(['strand_id']);
            }
            if (Schema::hasColumn('student_personal_info', 'section_id')) {
                $table->dropForeign(['section_id']);
            }
            if (Schema::hasColumn('student_personal_info', 'school_year_id')) {
                $table->dropForeign(['school_year_id']);
            }
            if (Schema::hasColumn('student_personal_info', 'reviewed_by')) {
                $table->dropForeign(['reviewed_by']);
            }
        });

        // Then drop the unwanted columns
        Schema::table('student_personal_info', function (Blueprint $table) {
            $columnsToRemove = [
                'nongraded', 'psa', 'mother_tongue', 
                'hs_grade', 'strand_preferences', 'strand_id', 'section_id', 
                'school_year_id', 'coordinator_notes', 'reviewed_at', 'reviewed_by'
            ];
            
            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('student_personal_info', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        // Add missing columns that should exist
        Schema::table('student_personal_info', function (Blueprint $table) {
            // Add missing columns from enrollment form
            if (!Schema::hasColumn('student_personal_info', 'guardian_name')) {
                $table->string('guardian_name', 100)->nullable()->after('last_sy');
            }
            if (!Schema::hasColumn('student_personal_info', 'guardian_contact')) {
                $table->string('guardian_contact', 100)->nullable()->after('guardian_name');
            }
            if (!Schema::hasColumn('student_personal_info', 'last_school')) {
                $table->string('last_school', 100)->nullable()->after('guardian_contact');
            }
            
            // Ensure PSA birth certificate column exists with correct name
            if (!Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
                $table->string('psa_birth_certificate', 100)->nullable()->after('image');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Check if table exists before trying to modify it
        if (!Schema::hasTable('student_personal_info')) {
            return;
        }

        Schema::table('student_personal_info', function (Blueprint $table) {
            // Remove the columns we added
            $columnsToRemove = ['guardian_name', 'guardian_contact', 'last_school'];
            
            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('student_personal_info', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
