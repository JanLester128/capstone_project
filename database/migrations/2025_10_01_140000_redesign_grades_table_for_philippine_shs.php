<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Redesigns the grades table for proper Philippine SHS grading system:
     * - Each record represents ONE SUBJECT for ONE SEMESTER
     * - 1st Semester: Q1 + Q2 grades for 1st semester subjects
     * - 2nd Semester: Q3 + Q4 grades for 2nd semester subjects (different subjects)
     * - Semester grade calculated from the 2 quarters of that semester
     * - Final grade calculated from both semester grades (if same subject exists in both)
     */
    public function up(): void
    {
        // Drop the existing grades table and recreate with proper structure
        Schema::dropIfExists('grades');
        
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            
            // Core relationships
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade')->comment('Student (from users table)');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade')->comment('Subject for this semester');
            $table->foreignId('faculty_id')->constrained('users')->onDelete('cascade')->comment('Faculty teaching this subject');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade')->comment('Academic year');
            $table->foreignId('class_id')->nullable()->constrained('class')->onDelete('cascade')->comment('Class section');
            
            // Semester identification - CRITICAL for Philippine SHS
            $table->enum('semester', ['1st', '2nd'])->comment('Which semester (1st or 2nd)');
            
            // Quarter grades for THIS SEMESTER ONLY
            $table->decimal('first_quarter', 5, 2)->nullable()->comment('1st Quarter Grade (1st sem) OR 3rd Quarter Grade (2nd sem)');
            $table->decimal('second_quarter', 5, 2)->nullable()->comment('2nd Quarter Grade (1st sem) OR 4th Quarter Grade (2nd sem)');
            
            // Semester final grade (calculated from the 2 quarters above)
            $table->decimal('semester_grade', 5, 2)->nullable()->comment('Final grade for this semester (average of 2 quarters)');
            
            // Status and metadata
            $table->text('remarks')->nullable()->comment('Faculty remarks');
            $table->enum('status', ['ongoing', 'completed', 'incomplete', 'dropped', 'pending_approval', 'approved'])->default('ongoing');
            
            // Timestamps
            $table->timestamps();
            
            // Unique constraint: One grade record per student-subject-semester combination
            $table->unique(['student_id', 'subject_id', 'semester', 'school_year_id'], 'unique_student_subject_semester');
            
            // Indexes for performance
            $table->index(['student_id', 'school_year_id'], 'idx_student_school_year');
            $table->index(['faculty_id', 'school_year_id'], 'idx_faculty_school_year');
            $table->index(['subject_id', 'semester'], 'idx_subject_semester');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
        
        // Restore the old grades table structure (if needed)
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users');
            $table->foreignId('subject_id')->constrained('subjects');
            $table->foreignId('faculty_id')->constrained('users');
            $table->foreignId('school_year_id')->constrained('school_years');
            $table->foreignId('class_id')->nullable()->constrained('class');
            $table->decimal('first_quarter', 5, 2)->nullable();
            $table->decimal('second_quarter', 5, 2)->nullable();
            $table->decimal('third_quarter', 5, 2)->nullable();
            $table->decimal('fourth_quarter', 5, 2)->nullable();
            $table->decimal('semester_grade', 5, 2)->nullable();
            $table->enum('semester', ['1st', '2nd']);
            $table->string('status', 50)->default('pending_approval');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }
};
