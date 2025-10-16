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
        Schema::table('school_years', function (Blueprint $table) {
            // Quarter management fields
            $table->enum('current_quarter', ['1st', '2nd', '3rd', '4th'])->nullable()->after('semester');
            $table->boolean('is_quarter_open')->default(false)->after('current_quarter');
            $table->date('quarter_start_date')->nullable()->after('is_quarter_open');
            $table->date('quarter_end_date')->nullable()->after('quarter_start_date');
            $table->date('grade_submission_deadline')->nullable()->after('quarter_end_date');
            
            // Grading period settings
            $table->boolean('allow_grade_encoding')->default(true)->after('grade_submission_deadline');
            $table->boolean('require_grade_approval')->default(true)->after('allow_grade_encoding');
            $table->text('quarter_notes')->nullable()->after('require_grade_approval');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            $table->dropColumn([
                'current_quarter',
                'is_quarter_open',
                'quarter_start_date',
                'quarter_end_date',
                'grade_submission_deadline',
                'allow_grade_encoding',
                'require_grade_approval',
                'quarter_notes'
            ]);
        });
    }
};
