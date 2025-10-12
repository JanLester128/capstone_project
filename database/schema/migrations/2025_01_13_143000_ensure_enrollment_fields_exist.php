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
     * Ensures enrollment control fields exist in school_years table
     */
    public function up(): void
    {
        // Check if columns exist and add them if they don't
        if (!Schema::hasColumn('school_years', 'enrollment_open')) {
            Schema::table('school_years', function (Blueprint $table) {
                $table->boolean('enrollment_open')->default(true)->after('is_active');
            });
        }

        if (!Schema::hasColumn('school_years', 'enrollment_start')) {
            Schema::table('school_years', function (Blueprint $table) {
                $table->datetime('enrollment_start')->nullable()->after('enrollment_open');
            });
        }

        if (!Schema::hasColumn('school_years', 'enrollment_end')) {
            Schema::table('school_years', function (Blueprint $table) {
                $table->datetime('enrollment_end')->nullable()->after('enrollment_start');
            });
        }

        // Set default enrollment dates for active school year if they don't exist
        $activeSchoolYear = DB::table('school_years')->where('is_active', true)->first();
        
        if ($activeSchoolYear && (!$activeSchoolYear->enrollment_start || !$activeSchoolYear->enrollment_end)) {
            // Set enrollment period to current date + 30 days
            $startDate = now();
            $endDate = now()->addDays(30);
            
            DB::table('school_years')
                ->where('id', $activeSchoolYear->id)
                ->update([
                    'enrollment_start' => $startDate,
                    'enrollment_end' => $endDate,
                    'enrollment_open' => true,
                    'updated_at' => now()
                ]);
                
            echo "✅ Set enrollment period for active school year: {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't remove columns in down() to prevent data loss
        // This is a safety migration to ensure fields exist
    }
};
