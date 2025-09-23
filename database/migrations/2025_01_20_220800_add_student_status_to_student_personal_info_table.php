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
            // Only add column if it doesn't already exist
            if (!Schema::hasColumn('student_personal_info', 'student_status')) {
                // Add student_status field with enum values following HCI Principle 6: Recognition rather than recall
                $table->enum('student_status', ['New Student', 'Continuing', 'Transferee'])
                      ->default('New Student')
                      ->after('user_id')
                      ->comment('Student enrollment status: New Student, Continuing, or Transferee');
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
            // Only drop column if it exists
            if (Schema::hasColumn('student_personal_info', 'student_status')) {
                $table->dropColumn('student_status');
            }
        });
    }
};
