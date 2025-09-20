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
        Schema::table('student_personal_info', function (Blueprint $table) {
            // Add student_status field with enum values following HCI Principle 6: Recognition rather than recall
            $table->enum('student_status', ['New Student', 'Continuing', 'Transferee'])
                  ->default('New Student')
                  ->after('user_id')
                  ->comment('Student enrollment status: New Student, Continuing, or Transferee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_personal_info', function (Blueprint $table) {
            $table->dropColumn('student_status');
        });
    }
};
