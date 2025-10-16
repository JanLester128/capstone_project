<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Drop the existing table completely to remove all old constraints
        Schema::dropIfExists('student_strand_preferences');
        
        // Step 2: Recreate the table with correct structure
        Schema::create('student_strand_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_personal_info_id')->constrained('student_personal_info')->onDelete('cascade');
            $table->foreignId('strand_id')->constrained('strands')->onDelete('cascade');
            $table->integer('preference_order')->comment('1 = First choice, 2 = Second choice, 3 = Third choice');
            $table->timestamps();
            
            // Ensure unique preference order per student
            $table->unique(['student_personal_info_id', 'preference_order'], 'ssp_student_pref_unique');
            
            // Index for better performance
            $table->index(['student_personal_info_id', 'preference_order'], 'ssp_student_pref_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_strand_preferences');
    }
};
