<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('class')->onDelete('cascade'); // Schedule reference
            $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade'); // Student enrollment
            $table->foreignId('section_id')->constrained('sections')->onDelete('cascade'); // Section assignment
            $table->boolean('is_enrolled')->default(true); // Enrollment status
            $table->timestamp('enrolled_at')->default(now());
            $table->timestamps();
            
            // Ensure unique enrollment per class per student
            $table->unique(['class_id', 'enrollment_id'], 'unique_student_class_enrollment');
            
            // Index for section-based queries
            $table->index(['section_id', 'class_id'], 'section_class_index');
        });
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('class_details');
        Schema::enableForeignKeyConstraints();
    }
};
