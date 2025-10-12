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
            // Add section_id for coordinator section assignment
            if (!Schema::hasColumn('student_personal_info', 'section_id')) {
                $table->foreignId('section_id')->nullable()->constrained('sections')->onDelete('set null');
            }
            
            // Add strand_id for tracking student's assigned strand
            if (!Schema::hasColumn('student_personal_info', 'strand_id')) {
                $table->foreignId('strand_id')->nullable()->constrained('strands')->onDelete('set null');
            }
            
            // Add school_year_id for proper tracking
            if (!Schema::hasColumn('student_personal_info', 'school_year_id')) {
                $table->foreignId('school_year_id')->nullable()->constrained('school_years')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_personal_info', function (Blueprint $table) {
            if (Schema::hasColumn('student_personal_info', 'section_id')) {
                $table->dropForeign(['section_id']);
                $table->dropColumn('section_id');
            }
            
            if (Schema::hasColumn('student_personal_info', 'strand_id')) {
                $table->dropForeign(['strand_id']);
                $table->dropColumn('strand_id');
            }
            
            if (Schema::hasColumn('student_personal_info', 'school_year_id')) {
                $table->dropForeign(['school_year_id']);
                $table->dropColumn('school_year_id');
            }
        });
    }
};
