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
        // Update existing enrollments with default values
        DB::table('enrollments')
            ->whereNull('semester')
            ->orWhere('semester', 0)
            ->update([
                'semester' => 1,
                'enrollment_category' => 'initial',
                'is_summer_class' => false
            ]);

        // Update any enrollments that might have null enrollment_category
        DB::table('enrollments')
            ->whereNull('enrollment_category')
            ->update(['enrollment_category' => 'initial']);

        // Update any enrollments that might have null is_summer_class
        DB::table('enrollments')
            ->whereNull('is_summer_class')
            ->update(['is_summer_class' => false]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this data update
    }
};
