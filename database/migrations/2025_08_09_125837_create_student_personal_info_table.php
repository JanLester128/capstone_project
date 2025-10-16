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
            $table->string('lrn', 100)->nullable();
            $table->string('grade_level', 100)->nullable();
            $table->enum('student_status', ['new', 'transferee', 'returnee'])->default('new');
            $table->date('birthdate')->nullable();
            $table->string('sex', 100)->nullable();
            $table->text('address')->nullable();
            $table->string('guardian_name', 100)->nullable();
            $table->string('guardian_contact', 100)->nullable();
            $table->string('guardian_relationship', 100)->nullable();
            $table->string('psa_birth_certificate', 100)->nullable();
            $table->string('report_card', 100)->nullable();
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
