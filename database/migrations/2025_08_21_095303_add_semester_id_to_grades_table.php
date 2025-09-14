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
        Schema::table('grades', function (Blueprint $table) {
            // Remove semester_id since we integrated semesters into school_years table
            // $table->foreignId('semester_id')->after('school_year_id')->constrained('semesters')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // No changes to rollback since we didn't add semester_id
            // $table->dropForeign(['semester_id']);
            // $table->dropColumn('semester_id');
        });
    }
};
