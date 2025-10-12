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
            // Remove special_needs column as requested
            if (Schema::hasColumn('student_personal_info', 'special_needs')) {
                $table->dropColumn('special_needs');
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
            // Add back special_needs column if needed
            if (!Schema::hasColumn('student_personal_info', 'special_needs')) {
                $table->string('special_needs', 100)->nullable()->after('four_ps');
            }
        });
    }
};
