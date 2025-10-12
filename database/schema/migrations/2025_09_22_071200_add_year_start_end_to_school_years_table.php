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
        Schema::table('school_years', function (Blueprint $table) {
            // Add year_start and year_end columns if they don't exist
            if (!Schema::hasColumn('school_years', 'year_start')) {
                $table->integer('year_start')->nullable()->after('id');
            }
            if (!Schema::hasColumn('school_years', 'year_end')) {
                $table->integer('year_end')->nullable()->after('year_start');
            }
        });

        // Only migrate data if 'year' column exists and year_start/year_end are empty
        if (Schema::hasColumn('school_years', 'year')) {
            $schoolYears = DB::table('school_years')->whereNotNull('year')->get();
            
            foreach ($schoolYears as $schoolYear) {
                // Only update if year_start and year_end are null
                if (is_null($schoolYear->year_start) && is_null($schoolYear->year_end)) {
                    // Parse year format like "2024-2025" or "2024"
                    $yearParts = explode('-', $schoolYear->year);
                    
                    if (count($yearParts) === 2) {
                        // Format: "2024-2025"
                        $yearStart = (int)$yearParts[0];
                        $yearEnd = (int)$yearParts[1];
                    } else {
                        // Format: "2024" - assume it's the start year
                        $yearStart = (int)$yearParts[0];
                        $yearEnd = $yearStart + 1;
                    }

                    DB::table('school_years')
                        ->where('id', $schoolYear->id)
                        ->update([
                            'year_start' => $yearStart,
                            'year_end' => $yearEnd
                        ]);
                }
            }
        }
        
        // If year_start and year_end columns already exist and have data, no migration needed
        // This handles the case where the schema already has the new structure
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            // Only drop columns if they exist and if 'year' column exists to fall back to
            if (Schema::hasColumn('school_years', 'year')) {
                if (Schema::hasColumn('school_years', 'year_start')) {
                    $table->dropColumn('year_start');
                }
                if (Schema::hasColumn('school_years', 'year_end')) {
                    $table->dropColumn('year_end');
                }
            }
            // If no 'year' column exists, don't drop year_start/year_end as they're the primary columns
        });
    }
};
