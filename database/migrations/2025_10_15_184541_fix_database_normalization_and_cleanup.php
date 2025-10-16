<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix database normalization issues:
     * 1. Remove all JSON fields (violate 1NF)
     * 2. Limit all VARCHAR fields to max 100 characters
     * 3. Remove all notes/reasons columns
     * 4. Optimize grade_input_requests by moving fields to grades table
     */
    public function up(): void
    {
        // 1. REMOVE JSON FIELDS (1NF Violations)
        
        // Remove JSON fields from school_years table
        if (Schema::hasTable('school_years')) {
            Schema::table('school_years', function (Blueprint $table) {
                if (Schema::hasColumn('school_years', 'allowed_enrollment_days')) {
                    $table->dropColumn('allowed_enrollment_days');
                }
            });
        }

        // Remove JSON fields from enrollments table
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                if (Schema::hasColumn('enrollments', 'failed_subjects')) {
                    $table->dropColumn('failed_subjects');
                }
                if (Schema::hasColumn('enrollments', 'summer_subjects')) {
                    $table->dropColumn('summer_subjects');
                }
            });
        }

        // Remove JSON fields from semester_progressions table
        if (Schema::hasTable('semester_progressions')) {
            Schema::table('semester_progressions', function (Blueprint $table) {
                if (Schema::hasColumn('semester_progressions', 'completion_requirements')) {
                    $table->dropColumn('completion_requirements');
                }
            });
        }

        // Remove JSON fields from summer_class_schedules table
        if (Schema::hasTable('summer_class_schedules')) {
            Schema::table('summer_class_schedules', function (Blueprint $table) {
                if (Schema::hasColumn('summer_class_schedules', 'class_days')) {
                    // Replace JSON with simple string field
                    $table->dropColumn('class_days');
                    $table->string('class_days', 100)->default('Monday,Tuesday,Wednesday,Thursday,Friday')->after('schedule_type');
                }
            });
        }

        // Remove JSON fields from grade_input_requests table
        if (Schema::hasTable('grade_input_requests')) {
            Schema::table('grade_input_requests', function (Blueprint $table) {
                if (Schema::hasColumn('grade_input_requests', 'student_list')) {
                    $table->dropColumn('student_list');
                }
            });
        }

        // Remove JSON fields from student_personal_info table
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                if (Schema::hasColumn('student_personal_info', 'credited_subjects')) {
                    $table->dropColumn('credited_subjects');
                }
                if (Schema::hasColumn('student_personal_info', 'documents')) {
                    $table->dropColumn('documents');
                }
            });
        }

        // Remove JSON fields from faculty_notifications table
        if (Schema::hasTable('faculty_notifications')) {
            Schema::table('faculty_notifications', function (Blueprint $table) {
                if (Schema::hasColumn('faculty_notifications', 'data')) {
                    $table->dropColumn('data');
                }
            });
        }

        // 2. FIX VARCHAR FIELDS > 100 CHARACTERS
        
        // Fix VARCHAR fields in various tables
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                if (Schema::hasColumn('student_personal_info', 'guardian_name')) {
                    $table->string('guardian_name', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'last_school')) {
                    $table->string('last_school', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'emergency_contact_name')) {
                    $table->string('emergency_contact_name', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'report_card')) {
                    $table->string('report_card', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
                    $table->string('psa_birth_certificate', 100)->nullable()->change();
                }
            });
        }

        if (Schema::hasTable('transferee_previous_schools')) {
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                if (Schema::hasColumn('transferee_previous_schools', 'last_school')) {
                    $table->string('last_school', 100)->nullable()->change();
                }
            });
        }

        // 3. REMOVE ALL NOTES/REASONS COLUMNS
        
        // Remove notes from grade_input_requests
        if (Schema::hasTable('grade_input_requests')) {
            Schema::table('grade_input_requests', function (Blueprint $table) {
                if (Schema::hasColumn('grade_input_requests', 'registrar_notes')) {
                    $table->dropColumn('registrar_notes');
                }
                if (Schema::hasColumn('grade_input_requests', 'reason')) {
                    $table->dropColumn('reason');
                }
            });
        }

        // Remove notes from enrollments
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                if (Schema::hasColumn('enrollments', 'registrar_notes')) {
                    $table->dropColumn('registrar_notes');
                }
                if (Schema::hasColumn('enrollments', 'registrar_rejection_reason')) {
                    $table->dropColumn('registrar_rejection_reason');
                }
                if (Schema::hasColumn('enrollments', 'evaluation_notes')) {
                    $table->dropColumn('evaluation_notes');
                }
                if (Schema::hasColumn('enrollments', 'revision_notes')) {
                    $table->dropColumn('revision_notes');
                }
                if (Schema::hasColumn('enrollments', 'rejection_reason')) {
                    $table->dropColumn('rejection_reason');
                }
            });
        }

        // Remove notes from semester_progressions
        if (Schema::hasTable('semester_progressions')) {
            Schema::table('semester_progressions', function (Blueprint $table) {
                if (Schema::hasColumn('semester_progressions', 'coordinator_notes')) {
                    $table->dropColumn('coordinator_notes');
                }
            });
        }

        // Remove notes from faculty_loads
        if (Schema::hasTable('faculty_loads')) {
            Schema::table('faculty_loads', function (Blueprint $table) {
                if (Schema::hasColumn('faculty_loads', 'load_notes')) {
                    $table->dropColumn('load_notes');
                }
            });
        }

        // Remove notes from transferee_credited_subjects
        if (Schema::hasTable('transferee_credited_subjects')) {
            Schema::table('transferee_credited_subjects', function (Blueprint $table) {
                if (Schema::hasColumn('transferee_credited_subjects', 'remarks')) {
                    $table->dropColumn('remarks');
                }
            });
        }

        // 4. OPTIMIZE GRADE_INPUT_REQUESTS TABLE
        // Move relevant fields to grades table and simplify grade_input_requests
        
        // Add fields to grades table that should be there
        if (Schema::hasTable('grades')) {
            Schema::table('grades', function (Blueprint $table) {
                // Add request tracking fields
                if (!Schema::hasColumn('grades', 'input_requested_at')) {
                    $table->timestamp('input_requested_at')->nullable()->after('approved_at');
                }
                if (!Schema::hasColumn('grades', 'input_approved_at')) {
                    $table->timestamp('input_approved_at')->nullable()->after('input_requested_at');
                }
                if (!Schema::hasColumn('grades', 'input_approved_by')) {
                    $table->unsignedBigInteger('input_approved_by')->nullable()->after('input_approved_at');
                    $table->foreign('input_approved_by')->references('id')->on('users')->onDelete('set null');
                }
            });
        }

        // Simplify grade_input_requests table - keep only essential fields
        if (Schema::hasTable('grade_input_requests')) {
            Schema::table('grade_input_requests', function (Blueprint $table) {
                // Remove redundant fields that are now in grades table
                if (Schema::hasColumn('grade_input_requests', 'expires_at')) {
                    $table->dropColumn('expires_at');
                }
                if (Schema::hasColumn('grade_input_requests', 'is_urgent')) {
                    $table->dropColumn('is_urgent');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     * Note: This migration removes denormalized data, so rollback may cause data loss
     */
    public function down(): void
    {
        // WARNING: Rolling back this migration will cause data loss
        // JSON fields and notes columns will be recreated but data will be lost
        
        // Recreate essential JSON fields only if absolutely necessary
        if (Schema::hasTable('summer_class_schedules')) {
            Schema::table('summer_class_schedules', function (Blueprint $table) {
                if (Schema::hasColumn('summer_class_schedules', 'class_days')) {
                    $table->dropColumn('class_days');
                }
                $table->json('class_days')->nullable()->after('schedule_type');
            });
        }

        // Remove added fields from grades table
        if (Schema::hasTable('grades')) {
            Schema::table('grades', function (Blueprint $table) {
                if (Schema::hasColumn('grades', 'input_approved_by')) {
                    $table->dropForeign(['input_approved_by']);
                    $table->dropColumn(['input_requested_at', 'input_approved_at', 'input_approved_by']);
                }
            });
        }
    }
};
