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
        Schema::create('certificates_of_registration', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->foreignId('section_id')->constrained('sections')->onDelete('cascade');
            $table->foreignId('strand_id')->constrained('strands')->onDelete('cascade');
            $table->integer('semester');
            $table->integer('year_level');
            $table->date('registration_date');
            $table->decimal('total_units', 5, 2)->default(0);
            $table->enum('status', ['active', 'inactive', 'cancelled'])->default('active');
            $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('generated_at');
            $table->timestamp('printed_at')->nullable();
            $table->integer('print_count')->default(0);
            $table->timestamps();

            // Indexes with custom names to avoid MySQL length limit
            $table->index(['student_id', 'school_year_id', 'semester'], 'cor_student_sy_semester_idx');
            $table->index(['section_id', 'semester'], 'cor_section_semester_idx');
            $table->index(['strand_id', 'year_level'], 'cor_strand_year_idx');
            $table->index('status', 'cor_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificates_of_registration');
    }
};
