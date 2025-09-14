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
        Schema::create('student_personal_info', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // Personal Information Fields (from enrollment form)
            $table->string('school_year', 100)->nullable();
            $table->string('lrn', 100)->nullable();
            $table->string('grade_level', 100)->nullable();
            $table->string('nongraded', 100)->nullable();
            $table->string('psa', 100)->nullable();
            $table->string('extension_name', 100)->nullable();
            $table->date('birthdate')->nullable();
            $table->integer('age')->nullable();
            $table->string('sex', 100)->nullable();
            $table->string('birth_place', 100)->nullable();
            $table->text('address')->nullable();
            $table->string('religion', 100)->nullable();
            $table->string('mother_tongue', 100)->nullable();
            $table->string('ip_community', 100)->nullable();
            $table->string('four_ps', 100)->nullable();
            $table->string('special_needs', 100)->nullable();
            $table->string('pwd_id', 100)->nullable();
            $table->string('last_grade', 100)->nullable();
            $table->string('last_sy', 100)->nullable();
            $table->string('psa_birth_certificate', 100)->nullable();
            $table->string('report_card', 100)->nullable();
            $table->string('image', 100)->nullable();
            
            // Enrollment Data
            $table->string('hs_grade', 100)->default('N/A');
            $table->json('strand_preferences')->nullable(); // Store 3 strand choices as JSON array
            $table->foreignId('strand_id')->nullable()->constrained('strands')->nullOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->foreignId('school_year_id')->nullable()->constrained('school_years')->nullOnDelete();
            $table->enum('enrollment_status', ['pending', 'approved', 'rejected', 'enrolled'])->default('pending');
            $table->text('coordinator_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('student_personal_info');
        Schema::enableForeignKeyConstraints();
    }
};
