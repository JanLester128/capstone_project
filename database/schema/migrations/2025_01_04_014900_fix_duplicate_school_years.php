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
        // Remove duplicate school years, keeping only the most recent one
        $duplicates = DB::table('school_years')
            ->select('year_start', 'year_end', 'semester', DB::raw('COUNT(*) as count'), DB::raw('MIN(id) as keep_id'))
            ->groupBy('year_start', 'year_end', 'semester')
            ->having('count', '>', 1)
            ->get();

        foreach ($duplicates as $duplicate) {
            // Delete all duplicates except the one we want to keep (the first/oldest one)
            DB::table('school_years')
                ->where('year_start', $duplicate->year_start)
                ->where('year_end', $duplicate->year_end)
                ->where('semester', $duplicate->semester)
                ->where('id', '!=', $duplicate->keep_id)
                ->delete();
                
            echo "Removed duplicate school year: {$duplicate->year_start}-{$duplicate->year_end} {$duplicate->semester}\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot reverse this migration as we've deleted duplicate data
        // This is intentional to prevent data inconsistency
    }
};
