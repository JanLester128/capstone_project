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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->string('type', 30); // enrollment, grades, academic, system
            $table->string('status', 20); // approved, rejected, pending, submitted, etc.
            $table->string('title', 150);
            $table->text('message');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->boolean('action_required')->default(false);
            $table->json('details')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('student_personal_info')->onDelete('cascade');
            $table->index(['student_id', 'type']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
