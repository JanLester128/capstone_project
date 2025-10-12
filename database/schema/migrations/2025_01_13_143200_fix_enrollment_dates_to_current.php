<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Fix enrollment dates to current time so toggle works immediately
     */
    public function up(): void
    {
        // Update active school year enrollment dates to current time
        $activeSchoolYear = DB::table('school_years')->where('is_active', true)->first();
        
        if ($activeSchoolYear) {
            // Set enrollment start to beginning of today, end to end of 30 days from now
            $startDate = now()->startOfDay();
            $endDate = now()->addDays(30)->endOfDay();
            
            DB::table('school_years')
                ->where('id', $activeSchoolYear->id)
                ->update([
                    'enrollment_start' => $startDate,
                    'enrollment_end' => $endDate,
                    'enrollment_open' => true,
                    'updated_at' => now()
                ]);
                
            echo "✅ Fixed enrollment dates for active school year:\n";
            echo "   - Start: {$startDate->format('Y-m-d H:i:s')} (beginning of day)\n";
            echo "   - End: {$endDate->format('Y-m-d H:i:s')} (end of day)\n";
            echo "   - Status: Enabled\n";
            echo "   - Current time: " . now()->format('Y-m-d H:i:s') . "\n";
            echo "   - Enrollment should now be open!\n";
        } else {
            echo "⚠️  No active school year found.\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't reverse - this is a fix migration
    }
};
