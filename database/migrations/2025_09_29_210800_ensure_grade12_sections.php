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
        // Ensure Grade 12 sections exist for all strands
        $strands = DB::table('strands')->get();
        
        foreach ($strands as $strand) {
            // Check if Grade 12 section exists for this strand
            $existingSection = DB::table('sections')
                ->where('strand_id', $strand->id)
                ->where('grade_level', '12')
                ->first();
            
            if (!$existingSection) {
                // Create Grade 12 section for this strand
                DB::table('sections')->insert([
                    'name' => $strand->code . '-A', // e.g., STEM-A, HUMSS-A
                    'strand_id' => $strand->id,
                    'grade_level' => '12',
                    'capacity' => 40, // Default capacity
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove Grade 12 sections created by this migration
        DB::table('sections')
            ->where('grade_level', '12')
            ->delete();
    }
};
