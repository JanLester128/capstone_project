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
        // Drop the strand_subjects table as it's no longer used
        // The relationship between strands and subjects is now handled directly
        // through the subjects table with strand_id foreign key
        Schema::dropIfExists('strand_subjects');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the strand_subjects table if rollback is needed
        Schema::create('strand_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('strand_id')->constrained('strands')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->timestamps();
            
            // Ensure unique combination of strand and subject
            $table->unique(['strand_id', 'subject_id']);
        });
    }
};
