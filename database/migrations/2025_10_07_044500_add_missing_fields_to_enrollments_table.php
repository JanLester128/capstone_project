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
            // Add strand_id if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'strand_id')) {
                $table->foreignId('strand_id')->nullable()->after('school_year_id')
                      ->constrained('strands')->nullOnDelete();
            }
            
            // Add enrollment_date if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'enrollment_date')) {
                $table->timestamp('enrollment_date')->nullable()->after('status');
            }
            
            // Add enrolled_by if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'enrolled_by')) {
                $table->foreignId('enrolled_by')->nullable()->after('enrollment_date')
                      ->constrained('users')->nullOnDelete();
            }
            
            // Add student_type if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'student_type')) {
                $table->string('student_type', 20)->nullable()->after('enrolled_by');
            }
            
            // Add grade_level if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'grade_level')) {
                $table->string('grade_level', 10)->nullable()->after('student_type');
            }
            
            // Add lrn if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'lrn')) {
                $table->string('lrn', 20)->nullable()->after('grade_level');
            }
            
            // Add previous_school if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'previous_school')) {
                $table->string('previous_school')->nullable()->after('lrn');
            }
            
            // Add strand choice fields if they don't exist
            if (!Schema::hasColumn('enrollments', 'first_strand_choice_id')) {
                $table->foreignId('first_strand_choice_id')->nullable()->after('previous_school')
                      ->constrained('strands')->nullOnDelete();
            }
            
            if (!Schema::hasColumn('enrollments', 'second_strand_choice_id')) {
                $table->foreignId('second_strand_choice_id')->nullable()->after('first_strand_choice_id')
                      ->constrained('strands')->nullOnDelete();
            }
            
            if (!Schema::hasColumn('enrollments', 'third_strand_choice_id')) {
                $table->foreignId('third_strand_choice_id')->nullable()->after('second_strand_choice_id')
                      ->constrained('strands')->nullOnDelete();
            }
            
            // Add student_status if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'student_status')) {
                $table->string('student_status', 50)->nullable()->after('third_strand_choice_id');
            }
            
            // Add notes if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'notes')) {
                $table->text('notes')->nullable()->after('student_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            // Remove added columns in reverse order
            $columnsToRemove = [
                'notes',
                'student_status', 
                'third_strand_choice_id',
                'second_strand_choice_id',
                'first_strand_choice_id',
                'previous_school',
                'lrn',
                'grade_level',
                'student_type',
                'enrolled_by',
                'enrollment_date',
                'strand_id'
            ];
            
            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('enrollments', $column)) {
                    // Drop foreign key constraints first
                    if (in_array($column, ['strand_id', 'enrolled_by', 'first_strand_choice_id', 'second_strand_choice_id', 'third_strand_choice_id'])) {
                        $table->dropForeign([$column]);
                    }
                    $table->dropColumn($column);
                }
            }
        });
    }
};
