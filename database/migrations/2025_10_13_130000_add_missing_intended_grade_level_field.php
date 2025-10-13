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
        Schema::table('enrollments', function (Blueprint $table) {
            // Add the missing intended_grade_level field that the controller expects
            if (!Schema::hasColumn('enrollments', 'intended_grade_level')) {
                $table->enum('intended_grade_level', ['Grade 11', 'Grade 12'])->after('school_year_id')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('enrollments', 'intended_grade_level')) {
                $table->dropColumn('intended_grade_level');
            }
        });
    }
};
