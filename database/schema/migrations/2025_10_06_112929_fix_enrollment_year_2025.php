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
        // Fix enrollment dates to correct year (2025, not 2024)
        DB::table('school_years')
            ->where('is_active', true)
            ->update([
                'enrollment_start' => '2025-10-06 00:00:00',
                'enrollment_end' => '2025-10-20 23:59:59',  // October 6-20, 2025
                'enrollment_open' => true
            ]);
            
        echo "✅ Fixed enrollment dates to October 2025 (correct year)\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to 2024 dates
        DB::table('school_years')
            ->where('is_active', true)
            ->update([
                'enrollment_start' => '2024-10-06 00:00:00',
                'enrollment_end' => '2024-10-20 23:59:59',
                'enrollment_open' => true
            ]);
    }
};
