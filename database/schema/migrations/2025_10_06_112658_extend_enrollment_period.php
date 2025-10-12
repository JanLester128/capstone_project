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
        // Extend enrollment period to include today and next week
        DB::table('school_years')
            ->where('is_active', true)
            ->update([
                'enrollment_start' => '2024-10-06 00:00:00',
                'enrollment_end' => '2024-10-20 23:59:59',  // Extended to October 20, 2024
                'enrollment_open' => true
            ]);
            
        echo "✅ Extended enrollment period to October 20, 2024\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to shorter period
        DB::table('school_years')
            ->where('is_active', true)
            ->update([
                'enrollment_start' => '2024-10-06 00:00:00',
                'enrollment_end' => '2024-10-13 23:59:59',
                'enrollment_open' => true
            ]);
    }
};
