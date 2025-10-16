<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_personal_info_id')->constrained('student_personal_info')->onDelete('cascade');
            $table->foreignId('strand_id')->constrained('strands')->onDelete('cascade');
            $table->foreignId('assigned_section_id')->nullable()->constrained('sections')->onDelete('set null');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->integer('intended_grade_level');
            $table->string('status', 100)->default('pending');
            $table->enum('enrollment_type', ['regular', 'summer', 'transferee'])->default('regular');
            $table->enum('enrollment_method', ['self', 'auto', 'manual'])->default('self');
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('enrollment_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // No rollback actions for this migration to avoid destructive changes.
        return;
    }
};