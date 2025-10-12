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
        // Drop enrollment_subjects table as it's being replaced by class_details
        Schema::dropIfExists('enrollment_subjects');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate enrollment_subjects table if needed for rollback
        Schema::create('enrollment_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('enrollment_id');
            $table->unsignedBigInteger('subject_id');
            $table->string('semester', 20)->default('1st');
            $table->enum('status', ['enrolled', 'dropped', 'completed'])->default('enrolled');
            $table->decimal('first_quarter_grade', 5, 2)->nullable();
            $table->decimal('second_quarter_grade', 5, 2)->nullable();
            $table->decimal('third_quarter_grade', 5, 2)->nullable();
            $table->decimal('fourth_quarter_grade', 5, 2)->nullable();
            $table->decimal('final_grade', 5, 2)->nullable();
            $table->timestamps();
            
            $table->foreign('enrollment_id')->references('id')->on('enrollments')->onDelete('cascade');
            $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
            
            $table->unique(['enrollment_id', 'subject_id'], 'unique_enrollment_subject');
        });
    }
};
