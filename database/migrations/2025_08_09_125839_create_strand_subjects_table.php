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
        Schema::create('strand_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('strand_id')->constrained('strands')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['strand_id', 'subject_id']); // Prevent duplicate strand-subject combinations
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('strand_subjects');
        Schema::enableForeignKeyConstraints();
    }
};
