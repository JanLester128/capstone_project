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
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->foreignId('faculty_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->foreignId('class_id')->constrained('class')->onDelete('cascade');
            $table->enum('semester', ['1st', '2nd']);
            $table->decimal('first_quarter', 5, 2)->nullable();
            $table->decimal('second_quarter', 5, 2)->nullable();
            $table->decimal('third_quarter', 5, 2)->nullable();
            $table->decimal('fourth_quarter', 5, 2)->nullable();
            $table->decimal('semester_grade', 5, 2)->nullable();
            $table->string('remarks', 100)->nullable();
            $table->enum('status', ['ongoing', 'completed', 'incomplete', 'dropped', 'pending_approval', 'approved'])->default('ongoing');
            $table->enum('approval_status', ['draft', 'pending_approval', 'approved', 'rejected'])->default('draft');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('grades');
        Schema::enableForeignKeyConstraints();
    }
};