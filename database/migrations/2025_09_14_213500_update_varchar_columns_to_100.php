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
        // Check and update only existing columns in each table

        // Update enrollments table - only if columns exist
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

        // Update users table - without unique constraints
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'name')) {
                $table->string('name', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'firstname')) {
                $table->string('firstname', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'lastname')) {
                $table->string('lastname', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'middlename')) {
                $table->string('middlename', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'email')) {
                $table->string('email', 100)->change(); // Remove ->unique()
            }
            if (Schema::hasColumn('users', 'password')) {
                $table->string('password', 100)->change();
            }
            if (Schema::hasColumn('users', 'plain_password')) {
                $table->string('plain_password', 100)->nullable()->change();
            }
        });

        // Update student_personal_info table if it exists
        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                if (Schema::hasColumn('student_personal_info', 'school_year')) {
                    $table->string('school_year', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'lrn')) {
                    $table->string('lrn', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'grade_level')) {
                    $table->string('grade_level', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'extension_name')) {
                    $table->string('extension_name', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'sex')) {
                    $table->string('sex', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'birth_place')) {
                    $table->string('birth_place', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'religion')) {
                    $table->string('religion', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'mother_tongue')) {
                    $table->string('mother_tongue', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'image')) {
                    $table->string('image', 100)->nullable()->change();
                }
            });
        }

        // Update subjects table
        if (Schema::hasTable('subjects')) {
            Schema::table('subjects', function (Blueprint $table) {
                if (Schema::hasColumn('subjects', 'code')) {
                    $table->string('code', 100)->change();
                }
                if (Schema::hasColumn('subjects', 'name')) {
                    $table->string('name', 100)->change();
                }
                if (Schema::hasColumn('subjects', 'year_level')) {
                    $table->string('year_level', 100)->change();
                }
                if (Schema::hasColumn('subjects', 'description')) {
                    $table->string('description', 100)->nullable()->change();
                }
                if (Schema::hasColumn('subjects', 'prerequisites')) {
                    $table->string('prerequisites', 100)->nullable()->change();
                }
                if (Schema::hasColumn('subjects', 'corequisites')) {
                    $table->string('corequisites', 100)->nullable()->change();
                }
            });
        }

        // Update strands table
        if (Schema::hasTable('strands')) {
            Schema::table('strands', function (Blueprint $table) {
                if (Schema::hasColumn('strands', 'code')) {
                    $table->string('code', 100)->change(); // Remove ->unique()
                }
                if (Schema::hasColumn('strands', 'name')) {
                    $table->string('name', 100)->change();
                }
                if (Schema::hasColumn('strands', 'description')) {
                    $table->string('description', 100)->nullable()->change();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert changes if needed - only for columns that exist
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

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'name')) {
                $table->string('name', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'firstname')) {
                $table->string('firstname', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'lastname')) {
                $table->string('lastname', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'middlename')) {
                $table->string('middlename', 100)->nullable()->change();
            }
            if (Schema::hasColumn('users', 'email')) {
                $table->string('email', 100)->change(); // Remove ->unique()
            }
            if (Schema::hasColumn('users', 'password')) {
                $table->string('password', 100)->change();
            }
            if (Schema::hasColumn('users', 'plain_password')) {
                $table->string('plain_password', 100)->nullable()->change();
            }
        });

        if (Schema::hasTable('student_personal_info')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                if (Schema::hasColumn('student_personal_info', 'school_year')) {
                    $table->string('school_year', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'lrn')) {
                    $table->string('lrn', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'grade_level')) {
                    $table->string('grade_level', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'extension_name')) {
                    $table->string('extension_name', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'sex')) {
                    $table->string('sex', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'birth_place')) {
                    $table->string('birth_place', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'religion')) {
                    $table->string('religion', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'ip_community')) {
                    $table->string('ip_community', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'four_ps')) {
                    $table->string('four_ps', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'special_needs')) {
                    $table->string('special_needs', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'pwd_id')) {
                    $table->string('pwd_id', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'last_grade')) {
                    $table->string('last_grade', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'last_sy')) {
                    $table->string('last_sy', 100)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'report_card')) {
                    $table->string('report_card', 255)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'image')) {
                    $table->string('image', 255)->nullable()->change();
                }
                if (Schema::hasColumn('student_personal_info', 'hs_grade')) {
                    $table->string('hs_grade', 255)->default('N/A')->change();
                }
            });
        }

        if (Schema::hasTable('subjects')) {
            Schema::table('subjects', function (Blueprint $table) {
                if (Schema::hasColumn('subjects', 'code')) {
                    $table->string('code', 100)->change(); // Remove ->unique()
                }
                if (Schema::hasColumn('subjects', 'name')) {
                    $table->string('name', 100)->change();
                }
                if (Schema::hasColumn('subjects', 'description')) {
                    $table->string('description', 150)->nullable()->change();
                }
            });
        }

        if (Schema::hasTable('strands')) {
            Schema::table('strands', function (Blueprint $table) {
                if (Schema::hasColumn('strands', 'code')) {
                    $table->string('code', 100)->change(); // Remove ->unique()
                }
                if (Schema::hasColumn('strands', 'name')) {
                    $table->string('name', 100)->change();
                }
                if (Schema::hasColumn('strands', 'description')) {
                    $table->string('description', 150)->nullable()->change();
                }
            });
        }
    }
};
