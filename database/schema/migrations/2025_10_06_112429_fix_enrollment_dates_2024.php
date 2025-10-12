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
        // Fix enrollment dates that were incorrectly set to 2025 instead of 2024
        DB::table('school_years')
            ->where('is_active', true)
            ->update([
                'enrollment_start' => '2024-10-06 00:00:00',
                'enrollment_end' => '2024-10-13 23:59:59',
                'enrollment_open' => true
            ]);
            
        echo "✅ Fixed enrollment dates to October 2024\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original dates (though this shouldn't be needed)
        DB::table('school_years')
            ->where('is_active', true)
            ->update([
                'enrollment_start' => '2025-10-06 00:00:00',
                'enrollment_end' => '2025-10-13 23:59:59',
                'enrollment_open' => false
            ]);
    }
};
