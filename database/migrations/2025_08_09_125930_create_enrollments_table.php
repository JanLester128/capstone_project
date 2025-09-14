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
        if (!Schema::hasTable('enrollments')) {
            Schema::create('enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Student user account
                
                // Personal Information
                $table->string('firstname', 100);
                $table->string('lastname', 100);
                $table->string('middlename', 100)->nullable();
                $table->string('lrn', 12)->unique();
                $table->string('email', 100)->unique();
                $table->string('phone', 15)->nullable();
                $table->date('birthdate');
                $table->string('birthplace', 100);
                $table->enum('sex', ['Male', 'Female']);
                $table->string('religion', 100)->nullable();
                $table->text('address');
                $table->integer('age');
                $table->string('mother_tongue', 100)->nullable();
                $table->boolean('is_ip_community')->default(false);
                $table->boolean('is_4ps')->default(false);
                $table->string('pwd_id', 100)->nullable();
                
                // Academic Information
                $table->enum('grade_level', ['Grade 11', 'Grade 12'])->default('Grade 11');
                $table->string('last_school_attended', 100);
                $table->string('last_grade_completed', 100);
                $table->string('last_school_year', 100);
                
                // Strand Preferences (3 choices)
                $table->foreignId('first_strand_choice')->nullable()->constrained('strands')->onDelete('set null');
                $table->foreignId('second_strand_choice')->nullable()->constrained('strands')->onDelete('set null');
                $table->foreignId('third_strand_choice')->nullable()->constrained('strands')->onDelete('set null');
                
                // Assignment (after coordinator approval)
                $table->foreignId('assigned_strand_id')->nullable()->constrained('strands')->onDelete('set null');
                $table->foreignId('assigned_section_id')->nullable()->constrained('sections')->onDelete('set null');
                
                // Documents
                $table->string('student_photo')->nullable();
                $table->string('psa_birth_certificate')->nullable();
                $table->string('report_card')->nullable();
                
                // Workflow
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->foreignId('coordinator_id')->nullable()->constrained('users')->onDelete('set null');
                $table->text('coordinator_notes')->nullable();
                $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
                $table->timestamp('submitted_at')->default(now());
                $table->timestamp('reviewed_at')->nullable();
                
                $table->timestamps();
                
                // Indexes
                $table->index(['status', 'school_year_id']);
                $table->index(['assigned_strand_id', 'assigned_section_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('enrollments');
        Schema::enableForeignKeyConstraints();
    }
};
