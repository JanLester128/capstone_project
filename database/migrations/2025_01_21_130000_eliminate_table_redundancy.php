<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Eliminate redundancy between enrollments, student_personal_info, and student_strand_preferences tables
     */
    public function up(): void
    {
        // PHASE 1: Remove redundant columns from student_personal_info
        if (Schema::hasTable('student_personal_info')) {
            // First, drop all foreign key constraints using raw SQL to avoid naming issues
            $this->dropForeignKeysFromTable('student_personal_info');
            
            Schema::table('student_personal_info', function (Blueprint $table) {
                // Remove columns that are duplicated in enrollments table
                $redundantColumns = [
                    'lrn',           // Duplicate of enrollments.lrn
                    'grade_level',   // Duplicate of enrollments.grade_level
                    'strand_id',     // Duplicate of enrollments.strand_id
                    'section_id',    // Duplicate of enrollments.assigned_section_id
                    'student_status', // Duplicate of enrollments.student_status
                    'school_year_id', // Can get via enrollments relationship
                    'report_card'    // Duplicate of enrollments.report_card
                ];
                
                foreach ($redundantColumns as $column) {
                    if (Schema::hasColumn('student_personal_info', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        // PHASE 2: Remove redundant strand choice columns from enrollments
        if (Schema::hasTable('enrollments')) {
            $this->dropForeignKeysFromTable('enrollments');
            
            Schema::table('enrollments', function (Blueprint $table) {
                // Remove strand choice columns (will use student_strand_preferences table instead)
                $strandChoiceColumns = [
                    'first_strand_choice_id',
                    'second_strand_choice_id', 
                    'third_strand_choice_id'
                ];
                
                foreach ($strandChoiceColumns as $column) {
                    if (Schema::hasColumn('enrollments', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        // PHASE 3: Optimize student_strand_preferences table
        if (Schema::hasTable('student_strand_preferences')) {
            $this->dropForeignKeysFromTable('student_strand_preferences');
            
            Schema::table('student_strand_preferences', function (Blueprint $table) {
                // Remove redundant student_id and school_year_id (can get via enrollment relationship)
                $redundantColumns = ['student_id', 'school_year_id'];
                
                foreach ($redundantColumns as $column) {
                    if (Schema::hasColumn('student_strand_preferences', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        // PHASE 4: Add any missing essential columns to enrollments (single source of truth)
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Ensure all essential enrollment data is in enrollments table
                if (!Schema::hasColumn('enrollments', 'lrn')) {
                    $table->string('lrn', 20)->nullable()->after('student_id');
                }
                
                if (!Schema::hasColumn('enrollments', 'grade_level')) {
                    $table->string('grade_level', 10)->nullable()->after('lrn');
                }
                
                if (!Schema::hasColumn('enrollments', 'student_status')) {
                    $table->string('student_status', 50)->nullable()->after('grade_level');
                }
            });
        }
    }

    /**
     * Helper method to safely drop all foreign key constraints from a table
     */
    private function dropForeignKeysFromTable($tableName)
    {
        try {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = ? 
                AND TABLE_SCHEMA = DATABASE()
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ", [$tableName]);
            
            foreach ($foreignKeys as $fk) {
                try {
                    DB::statement("ALTER TABLE `{$tableName}` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
                } catch (\Exception $e) {
                    // Ignore if foreign key doesn't exist or already dropped
                }
            }
        } catch (\Exception $e) {
            // Ignore if table doesn't exist or no foreign keys
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore removed columns to student_personal_info
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                $table->string('lrn', 20)->nullable();
                $table->string('grade_level', 10)->nullable();
                $table->foreignId('strand_id')->nullable()->constrained('strands')->nullOnDelete();
                $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
                $table->string('student_status', 50)->nullable();
                $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
                $table->string('report_card')->nullable();
            });
        }

        // Restore strand choice columns to enrollments
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                $table->foreignId('first_strand_choice_id')->nullable()->constrained('strands')->nullOnDelete();
                $table->foreignId('second_strand_choice_id')->nullable()->constrained('strands')->nullOnDelete();
                $table->foreignId('third_strand_choice_id')->nullable()->constrained('strands')->nullOnDelete();
            });
        }

        // Restore columns to student_strand_preferences
        if (Schema::hasTable('student_strand_preferences')) {
            Schema::table('student_strand_preferences', function (Blueprint $table) {
                $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
            });
        }
    }
};
