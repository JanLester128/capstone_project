<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\SchoolYear;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if there's an active school year
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            // Create a default active school year for the current academic year
            $currentYear = (int)date('Y');
            $nextYear = $currentYear + 1;
            
            SchoolYear::create([
                'year_start' => $currentYear,           // Required field
                'year_end' => $nextYear,               // Required field
                'semester' => '1st Semester',
                'is_active' => true,
                'start_date' => $currentYear . '-08-01', // August start
                'end_date' => $nextYear . '-05-31'       // May end
            ]);
            
            Log::info('Created default active school year', [
                'year_start' => $currentYear,
                'year_end' => $nextYear,
                'semester' => '1st Semester'
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't remove school years in rollback as they might have data
        Log::info('School year migration rollback - no action taken');
    }
};
