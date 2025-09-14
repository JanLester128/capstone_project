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
        Schema::create('class', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->foreignId('faculty_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->enum('day_of_week', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('duration'); // Duration in minutes (60, 90, 120)
            $table->enum('semester', ['1st Semester', '2nd Semester'])->default('1st Semester');
            $table->string('room', 100)->nullable(); // Classroom assignment
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Ensure no overlapping schedules for the same faculty
            $table->unique(['faculty_id', 'day_of_week', 'start_time', 'school_year_id', 'semester'], 'unique_faculty_schedule');
            
            // Index for better schedule queries
            $table->index(['day_of_week', 'semester', 'school_year_id'], 'schedule_lookup_index');
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('class');
        Schema::enableForeignKeyConstraints();
    }
};
