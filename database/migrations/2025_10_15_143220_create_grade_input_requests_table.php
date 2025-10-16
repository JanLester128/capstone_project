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
        Schema::create('grade_input_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('faculty_id');
            $table->unsignedBigInteger('class_id');
            $table->unsignedBigInteger('school_year_id');
            $table->enum('quarter', ['1st', '2nd', '3rd', '4th']);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('reason')->nullable(); // Faculty's reason for requesting
            $table->text('registrar_notes')->nullable(); // Registrar's notes on approval/rejection
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('expires_at')->nullable(); // When the approval expires
            $table->boolean('is_urgent')->default(false); // For urgent requests
            $table->json('student_list')->nullable(); // List of students without grades
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('faculty_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('class_id')->references('id')->on('class')->onDelete('cascade');
            $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');

            // Indexes
            $table->index(['faculty_id', 'status']);
            $table->index(['class_id', 'quarter']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grade_input_requests');
    }
};
