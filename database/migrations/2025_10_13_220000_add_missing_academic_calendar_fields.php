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
            // Only add columns that don't already exist
            if (!Schema::hasColumn('school_years', 'enrollment_start')) {
                $table->date('enrollment_start')->nullable()->after('end_date');
            }
            
            if (!Schema::hasColumn('school_years', 'enrollment_end')) {
                $table->date('enrollment_end')->nullable()->after('enrollment_start');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_1_start')) {
                $table->date('quarter_1_start')->nullable()->after('enrollment_end');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_1_end')) {
                $table->date('quarter_1_end')->nullable()->after('quarter_1_start');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_2_start')) {
                $table->date('quarter_2_start')->nullable()->after('quarter_1_end');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_2_end')) {
                $table->date('quarter_2_end')->nullable()->after('quarter_2_start');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_3_start')) {
                $table->date('quarter_3_start')->nullable()->after('quarter_2_end');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_3_end')) {
                $table->date('quarter_3_end')->nullable()->after('quarter_3_start');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_4_start')) {
                $table->date('quarter_4_start')->nullable()->after('quarter_3_end');
            }
            
            if (!Schema::hasColumn('school_years', 'quarter_4_end')) {
                $table->date('quarter_4_end')->nullable()->after('quarter_4_start');
            }
            
            if (!Schema::hasColumn('school_years', 'grading_deadline')) {
                $table->date('grading_deadline')->nullable()->after('quarter_4_end');
            }
            
            if (!Schema::hasColumn('school_years', 'is_enrollment_open')) {
                $table->boolean('is_enrollment_open')->default(false)->after('grading_deadline');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            $columnsToCheck = [
                'enrollment_start',
                'enrollment_end',
                'quarter_1_start',
                'quarter_1_end',
                'quarter_2_start',
                'quarter_2_end',
                'quarter_3_start',
                'quarter_3_end',
                'quarter_4_start',
                'quarter_4_end',
                'grading_deadline',
                'is_enrollment_open',
            ];
            
            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('school_years', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
