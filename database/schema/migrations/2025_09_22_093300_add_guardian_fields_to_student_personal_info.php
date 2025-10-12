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
        // Check if table exists before trying to modify it
        if (!Schema::hasTable('student_personal_info')) {
            return;
        }

        Schema::table('student_personal_info', function (Blueprint $table) {
            // Add guardian_name column if it doesn't exist
            if (!Schema::hasColumn('student_personal_info', 'guardian_name')) {
                $table->string('guardian_name', 255)->nullable()
                      ->after('last_sy')
                      ->comment('Name of student guardian/parent');
            }

            // Add guardian_contact column if it doesn't exist
            if (!Schema::hasColumn('student_personal_info', 'guardian_contact')) {
                $table->string('guardian_contact', 20)->nullable()
                      ->after('guardian_name')
                      ->comment('Contact number of student guardian/parent');
            }

            // Add last_school column if it doesn't exist
            if (!Schema::hasColumn('student_personal_info', 'last_school')) {
                $table->string('last_school', 255)->nullable()
                      ->after('guardian_contact')
                      ->comment('Last school attended by student');
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
            // Drop columns if they exist
            if (Schema::hasColumn('student_personal_info', 'guardian_name')) {
                $table->dropColumn('guardian_name');
            }

            if (Schema::hasColumn('student_personal_info', 'guardian_contact')) {
                $table->dropColumn('guardian_contact');
            }

            if (Schema::hasColumn('student_personal_info', 'last_school')) {
                $table->dropColumn('last_school');
            }
        });
    }
};
