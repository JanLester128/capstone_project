<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Updates the grades table to follow Philippine SHS quarterly grading system:
     * - 1st Quarter, 2nd Quarter, 3rd Quarter, 4th Quarter
     * - Semester Final Grade (average of quarters)
     * - Final Grade (average of both semesters)
     */
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Drop the old grade_value column
            $table->dropColumn('grade_value');
            
            // Add quarterly grades (Philippine SHS system)
            $table->decimal('first_quarter', 5, 2)->nullable()->after('school_year_id')->comment('1st Quarter Grade (0-100)');
            $table->decimal('second_quarter', 5, 2)->nullable()->after('first_quarter')->comment('2nd Quarter Grade (0-100)');
            $table->decimal('third_quarter', 5, 2)->nullable()->after('second_quarter')->comment('3rd Quarter Grade (0-100)');
            $table->decimal('fourth_quarter', 5, 2)->nullable()->after('third_quarter')->comment('4th Quarter Grade (0-100)');
            
            // Semester and final grades (calculated)
            $table->decimal('semester_grade', 5, 2)->nullable()->after('fourth_quarter')->comment('Semester Final Grade (average of 4 quarters)');
            $table->decimal('final_grade', 5, 2)->nullable()->after('semester_grade')->comment('Final Grade (if multiple semesters)');
            
            // Add semester indicator (1st or 2nd semester)
            $table->enum('semester', ['1st', '2nd'])->after('final_grade')->comment('Semester (1st or 2nd)');
            
            // Add grade status
            $table->enum('status', ['ongoing', 'completed', 'incomplete', 'dropped'])->default('ongoing')->after('semester');
            
            // Add remarks for additional notes
            $table->text('remarks')->nullable()->after('status')->comment('Teacher remarks or notes');
            
            // Add class_id to link grades to specific class sections
            $table->foreignId('class_id')->nullable()->after('faculty_id')->constrained('class')->onDelete('cascade');
            
            // Add unique constraint to prevent duplicate grades
            $table->unique(['student_id', 'subject_id', 'class_id', 'semester', 'school_year_id'], 'unique_student_subject_semester_grade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Drop the unique constraint first
            $table->dropUnique('unique_student_subject_semester_grade');
            
            // Drop new columns
            $table->dropColumn([
                'first_quarter',
                'second_quarter', 
                'third_quarter',
                'fourth_quarter',
                'semester_grade',
                'final_grade',
                'semester',
                'status',
                'remarks',
                'class_id'
            ]);
            
            // Restore the old grade_value column
            $table->string('grade_value', 100)->after('school_year_id');
        });
    }
};
