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
        Schema::create('transferee_credited_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->decimal('grade', 5, 2); // Grade for the credited subject (e.g., 85.50)
            $table->string('semester', 10); // 1st or 2nd semester
            $table->string('school_year', 20); // Academic year when subject was taken (e.g., "2023-2024")
            $table->text('remarks')->nullable(); // Additional notes about the credited subject
            $table->timestamps();
            
            // Ensure a student can only have one credit record per subject per semester
            $table->unique(['student_id', 'subject_id', 'semester'], 'unique_student_subject_semester');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transferee_credited_subjects');
    }
};
