<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Rename 'enrolled_grade_level' to 'intended_grade_level' to better reflect
     * that this is the grade level the student is applying for, not their current
     * enrolled status.
     */
    public function up(): void
    {
        if (Schema::hasTable('enrollments') && Schema::hasColumn('enrollments', 'enrolled_grade_level')) {
            Schema::table('enrollments', function (Blueprint $table) {
                $table->renameColumn('enrolled_grade_level', 'intended_grade_level');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('enrollments') && Schema::hasColumn('enrollments', 'intended_grade_level')) {
            Schema::table('enrollments', function (Blueprint $table) {
                $table->renameColumn('intended_grade_level', 'enrolled_grade_level');
            });
        }
    }
};
