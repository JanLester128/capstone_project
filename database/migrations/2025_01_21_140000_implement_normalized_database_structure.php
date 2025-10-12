<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Implement normalized database structure with single source of truth
     */
    public function up(): void
    {
        // PHASE 1: Update ENROLLMENTS table to reference student_personal_info instead of users
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Add student_personal_info_id as the main reference
                if (!Schema::hasColumn('enrollments', 'student_personal_info_id')) {
                    $table->foreignId('student_personal_info_id')
                          ->nullable()
                          ->after('id')
                          ->constrained('student_personal_info')
                          ->cascadeOnDelete();
                }
                
                // Keep student_id for backward compatibility but make it nullable
                if (Schema::hasColumn('enrollments', 'student_id')) {
                    $table->unsignedBigInteger('student_id')->nullable()->change();
                }
            });
        }

        // PHASE 2: Update STUDENT_STRAND_PREFERENCES to reference student_personal_info
        if (Schema::hasTable('student_strand_preferences')) {
            Schema::table('student_strand_preferences', function (Blueprint $table) {
                // Add student_personal_info_id reference
                if (!Schema::hasColumn('student_strand_preferences', 'student_personal_info_id')) {
                    $table->foreignId('student_personal_info_id')
                          ->nullable()
                          ->after('id')
                          ->constrained('student_personal_info')
                          ->cascadeOnDelete();
                }
            });
        }

        // PHASE 3: Ensure STUDENT_PERSONAL_INFO has all necessary fields
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                // Add missing fields if they don't exist
                if (!Schema::hasColumn('student_personal_info', 'lrn')) {
                    $table->string('lrn', 20)->nullable()->after('user_id');
                }
                
                if (!Schema::hasColumn('student_personal_info', 'grade_level')) {
                    $table->string('grade_level', 10)->nullable()->after('lrn');
                }
                
                if (!Schema::hasColumn('student_personal_info', 'student_status')) {
                    $table->string('student_status', 50)->nullable()->after('grade_level');
                }
                
                if (!Schema::hasColumn('student_personal_info', 'previous_school')) {
                    $table->string('previous_school')->nullable()->after('student_status');
                }
                
                // Convert documents to JSON if it's not already
                if (Schema::hasColumn('student_personal_info', 'report_card') && 
                    !Schema::hasColumn('student_personal_info', 'documents')) {
                    $table->json('documents')->nullable()->after('previous_school');
                }
            });
        }

        // PHASE 4: Update CLASS_DETAILS to reference enrollments properly
        if (Schema::hasTable('class_details')) {
            Schema::table('class_details', function (Blueprint $table) {
                // Ensure enrollment_id exists and is properly constrained
                if (!Schema::hasColumn('class_details', 'enrollment_id')) {
                    $table->foreignId('enrollment_id')
                          ->nullable()
                          ->after('id')
                          ->constrained('enrollments')
                          ->cascadeOnDelete();
                }
                
                // Add enrollment status if not exists
                if (!Schema::hasColumn('class_details', 'enrollment_status')) {
                    $table->string('enrollment_status', 20)
                          ->default('enrolled')
                          ->after('enrollment_id');
                }
                
                // Add enrolled_at timestamp if not exists
                if (!Schema::hasColumn('class_details', 'enrolled_at')) {
                    $table->timestamp('enrolled_at')
                          ->nullable()
                          ->after('enrollment_status');
                }
            });
        }

        // PHASE 5: Clean up redundant columns from ENROLLMENTS (move to student_personal_info)
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Remove redundant columns that should be in student_personal_info
                $redundantColumns = [
                    'lrn',
                    'grade_level', 
                    'student_type',
                    'previous_school',
                    'student_status'
                ];
                
                foreach ($redundantColumns as $column) {
                    if (Schema::hasColumn('enrollments', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore enrollments table structure
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Restore removed columns
                if (!Schema::hasColumn('enrollments', 'lrn')) {
                    $table->string('lrn', 20)->nullable();
                }
                if (!Schema::hasColumn('enrollments', 'grade_level')) {
                    $table->string('grade_level', 10)->nullable();
                }
                if (!Schema::hasColumn('enrollments', 'student_type')) {
                    $table->string('student_type', 20)->nullable();
                }
                if (!Schema::hasColumn('enrollments', 'previous_school')) {
                    $table->string('previous_school')->nullable();
                }
                if (!Schema::hasColumn('enrollments', 'student_status')) {
                    $table->string('student_status', 50)->nullable();
                }
                
                // Remove new foreign key
                if (Schema::hasColumn('enrollments', 'student_personal_info_id')) {
                    $table->dropForeign(['student_personal_info_id']);
                    $table->dropColumn('student_personal_info_id');
                }
            });
        }

        // Remove additions from student_strand_preferences
        if (Schema::hasTable('student_strand_preferences')) {
            Schema::table('student_strand_preferences', function (Blueprint $table) {
                if (Schema::hasColumn('student_strand_preferences', 'student_personal_info_id')) {
                    $table->dropForeign(['student_personal_info_id']);
                    $table->dropColumn('student_personal_info_id');
                }
            });
        }

        // Remove additions from class_details
        if (Schema::hasTable('class_details')) {
            Schema::table('class_details', function (Blueprint $table) {
                $columnsToRemove = ['enrollment_status', 'enrolled_at'];
                foreach ($columnsToRemove as $column) {
                    if (Schema::hasColumn('class_details', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
