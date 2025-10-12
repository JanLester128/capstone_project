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
            $table->string('extension_name', 100)->nullable();
            $table->date('birthdate')->nullable();
            $table->integer('age')->nullable();
            $table->string('sex', 100)->nullable();
            $table->string('birth_place', 100)->nullable();
            $table->text('address')->nullable();
            $table->string('religion', 100)->nullable();
            $table->string('ip_community', 100)->nullable();
            $table->string('four_ps', 100)->nullable();
            $table->string('special_needs', 100)->nullable();
            $table->string('pwd_id', 100)->nullable();
            $table->string('last_grade', 100)->nullable();
            $table->string('last_sy', 100)->nullable();
            $table->string('report_card', 100)->nullable();
            $table->string('image', 100)->nullable();
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
