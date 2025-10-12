<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix redundant columns and optimize string lengths
     */
    public function up(): void
    {
        // PHASE 1: Fix redundant columns - last_school_attended vs previous_school
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                // Remove last_school_attended (redundant with previous_school)
                if (Schema::hasColumn('enrollments', 'last_school_attended')) {
                    $table->dropColumn('last_school_attended');
                }
            });
        }

        // PHASE 2: Optimize string lengths from 255 to 100
        
        // Fix student_personal_info table
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                // Optimize string lengths
                if (Schema::hasColumn('student_personal_info', 'guardian_name')) {
                    $table->string('guardian_name', 100)->nullable()->change();
                }
                
                if (Schema::hasColumn('student_personal_info', 'last_school')) {
                    $table->string('last_school', 100)->nullable()->change();
                }
                
                if (Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
                    $table->string('psa_birth_certificate', 100)->nullable()->change();
                }
                
                if (Schema::hasColumn('student_personal_info', 'report_card')) {
                    $table->string('report_card', 100)->nullable()->change();
                }
                
                if (Schema::hasColumn('student_personal_info', 'image')) {
                    $table->string('image', 100)->nullable()->change();
                }
                
                if (Schema::hasColumn('student_personal_info', 'hs_grade')) {
                    $table->string('hs_grade', 100)->nullable()->change();
                }
            });
        }

        // Fix transferee_previous_schools table
        if (Schema::hasTable('transferee_previous_schools')) {
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                if (Schema::hasColumn('transferee_previous_schools', 'last_school')) {
                    $table->string('last_school', 100)->change();
                }
            });
        }

        // Fix enrollments table
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                if (Schema::hasColumn('enrollments', 'student_photo')) {
                    $table->string('student_photo', 100)->nullable()->change();
                }
                
                if (Schema::hasColumn('enrollments', 'psa_birth_certificate')) {
                    $table->string('psa_birth_certificate', 100)->nullable()->change();
                }
                
                if (Schema::hasColumn('enrollments', 'report_card')) {
                    $table->string('report_card', 100)->nullable()->change();
                }
            });
        }

        // PHASE 3: Convert unnecessary JSON columns to regular strings
        
        // Fix credited_subjects - convert from JSON to text
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                if (Schema::hasColumn('student_personal_info', 'credited_subjects')) {
                    // Change from JSON to TEXT for simpler storage
                    $table->text('credited_subjects')->nullable()->change();
                }
            });
        }

        // Fix allowed_enrollment_days - convert from JSON to string
        if (Schema::hasTable('school_years')) {
            Schema::table('school_years', function (Blueprint $table) {
                if (Schema::hasColumn('school_years', 'allowed_enrollment_days')) {
                    // Change from JSON to simple string (e.g., "Monday,Tuesday,Wednesday")
                    $table->string('allowed_enrollment_days', 100)->nullable()->change();
                }
            });
        }

        // Fix summer_class_schedules class_days - convert from JSON to string
        if (Schema::hasTable('summer_class_schedules')) {
            Schema::table('summer_class_schedules', function (Blueprint $table) {
                if (Schema::hasColumn('summer_class_schedules', 'class_days')) {
                    // Change from JSON to simple string (e.g., "Monday,Tuesday,Wednesday")
                    $table->string('class_days', 100)->change();
                }
            });
        }

        // PHASE 4: Keep necessary JSON columns but optimize them
        // Keep these as JSON since they store complex data:
        // - enrollments.summer_subjects (array of subject IDs)
        // - enrollments.documents (file paths and metadata)
        // - student_personal_info.documents (file paths and metadata)
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore last_school_attended column to enrollments
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                if (!Schema::hasColumn('enrollments', 'last_school_attended')) {
                    $table->string('last_school_attended')->nullable();
                }
            });
        }

        // Restore 255 character lengths
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                if (Schema::hasColumn('student_personal_info', 'guardian_name')) {
                    $table->string('guardian_name', 255)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'last_school')) {
                    $table->string('last_school', 255)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
                    $table->string('psa_birth_certificate', 255)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'report_card')) {
                    $table->string('report_card', 255)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'image')) {
                    $table->string('image', 255)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'hs_grade')) {
                    $table->string('hs_grade', 255)->nullable()->change();
                }
            });
        }

        if (Schema::hasTable('transferee_previous_schools')) {
            Schema::table('transferee_previous_schools', function (Blueprint $table) {
                if (Schema::hasColumn('transferee_previous_schools', 'last_school')) {
                    $table->string('last_school', 255)->change();
                }
            });
        }

        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                if (Schema::hasColumn('enrollments', 'student_photo')) {
                    $table->string('student_photo', 255)->nullable()->change();
                }
                if (Schema::hasColumn('enrollments', 'psa_birth_certificate')) {
                    $table->string('psa_birth_certificate', 255)->nullable()->change();
                }
                if (Schema::hasColumn('enrollments', 'report_card')) {
                    $table->string('report_card', 255)->nullable()->change();
                }
            });
        }

        // Restore JSON columns
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                if (Schema::hasColumn('student_personal_info', 'credited_subjects')) {
                    $table->json('credited_subjects')->nullable()->change();
                }
            });
        }

        if (Schema::hasTable('school_years')) {
            Schema::table('school_years', function (Blueprint $table) {
                if (Schema::hasColumn('school_years', 'allowed_enrollment_days')) {
                    $table->json('allowed_enrollment_days')->nullable()->change();
                }
            });
        }

        if (Schema::hasTable('summer_class_schedules')) {
            Schema::table('summer_class_schedules', function (Blueprint $table) {
                if (Schema::hasColumn('summer_class_schedules', 'class_days')) {
                    $table->json('class_days')->change();
                }
            });
        }
    }
};
