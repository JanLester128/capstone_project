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
        if (!Schema::hasTable('student_personal_info')) {
            return;
        }

        Schema::table('student_personal_info', function (Blueprint $table) {
            if (Schema::hasColumn('student_personal_info', 'enrollment_status')) {
                $table->dropColumn('enrollment_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('student_personal_info')) {
            return;
        }

        Schema::table('student_personal_info', function (Blueprint $table) {
            if (!Schema::hasColumn('student_personal_info', 'enrollment_status')) {
                $table->string('enrollment_status', 20)->nullable()->default('pending')->after('hs_grade');
            }
        });
    }
};
