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
        Schema::dropIfExists('transferee_credits');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the table if rollback is needed
        Schema::create('transferee_credits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('subject_id');
            $table->string('grade', 10)->nullable(); // Grade received (e.g., 85, 90, A, B+)
            $table->string('semester_completed', 20)->nullable(); // Which semester it was completed
            $table->string('previous_school')->nullable(); // School where it was completed
            $table->boolean('is_credited')->default(true); // Whether the subject is credited
            $table->text('remarks')->nullable(); // Additional notes
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('student_id')->references('id')->on('student_personal_info')->onDelete('cascade');
            $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
            
            // Unique constraint to prevent duplicate credits for same subject
            $table->unique(['student_id', 'subject_id']);
        });
    }
};
