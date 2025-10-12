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
            // Add report_card column back - needed for enrollment document storage
            if (!Schema::hasColumn('student_personal_info', 'report_card')) {
                $table->string('report_card', 255)->nullable()
                      ->after('last_school')
                      ->comment('Path to uploaded report card document');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_personal_info', function (Blueprint $table) {
            // Remove report_card column if it exists
            if (Schema::hasColumn('student_personal_info', 'report_card')) {
                $table->dropColumn('report_card');
            }
        });
    }
};
