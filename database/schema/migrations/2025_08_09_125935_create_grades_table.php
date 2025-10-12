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
        $table->foreignId('student_id')->constrained('student_personal_info');
        $table->foreignId('subject_id')->constrained('subjects');
        $table->foreignId('faculty_id')->constrained('users');
        $table->foreignId('school_year_id')->constrained('school_years');
        $table->string('grade_value', 100);
        $table->timestamps();
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