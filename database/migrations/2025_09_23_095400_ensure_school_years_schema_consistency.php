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
        // Ensure the school_years table has the required columns
        if (Schema::hasTable('school_years')) {
            Schema::table('school_years', function (Blueprint $table) {
                // Add year_start and year_end columns if they don't exist
                if (!Schema::hasColumn('school_years', 'year_start')) {
                    $table->integer('year_start')->nullable()->after('id');
                }
                if (!Schema::hasColumn('school_years', 'year_end')) {
                    $table->integer('year_end')->nullable()->after('year_start');
                }
                
                // Add start_date and end_date columns if they don't exist
                if (!Schema::hasColumn('school_years', 'start_date')) {
                    $table->date('start_date')->nullable()->after('semester');
                }
                if (!Schema::hasColumn('school_years', 'end_date')) {
                    $table->date('end_date')->nullable()->after('start_date');
                }
            });

            // Migrate data from 'year' column to year_start/year_end if needed
            if (Schema::hasColumn('school_years', 'year')) {
                $schoolYears = DB::table('school_years')
                    ->whereNotNull('year')
                    ->whereNull('year_start')
                    ->get();
                
                foreach ($schoolYears as $schoolYear) {
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

            // Make year_start and year_end NOT NULL after data migration
            Schema::table('school_years', function (Blueprint $table) {
                if (Schema::hasColumn('school_years', 'year_start')) {
                    $table->integer('year_start')->nullable(false)->change();
                }
                if (Schema::hasColumn('school_years', 'year_end')) {
                    $table->integer('year_end')->nullable(false)->change();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is designed to be non-destructive
        // We don't remove columns in rollback to prevent data loss
        // Only make columns nullable again if needed
        if (Schema::hasTable('school_years')) {
            Schema::table('school_years', function (Blueprint $table) {
                if (Schema::hasColumn('school_years', 'year_start')) {
                    $table->integer('year_start')->nullable()->change();
                }
                if (Schema::hasColumn('school_years', 'year_end')) {
                    $table->integer('year_end')->nullable()->change();
                }
            });
        }
    }
};
