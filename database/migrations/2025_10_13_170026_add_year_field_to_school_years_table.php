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
            // Add year field if it doesn't exist (format: "2024-2025")
            if (!Schema::hasColumn('school_years', 'year')) {
                $table->string('year', 20)->nullable()->after('year_end');
            }
        });

        // Populate existing records with year field
        if (Schema::hasColumn('school_years', 'year_start') && Schema::hasColumn('school_years', 'year_end')) {
            DB::table('school_years')
                ->whereNull('year')
                ->update([
                    'year' => DB::raw("CONCAT(year_start, '-', year_end)")
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            if (Schema::hasColumn('school_years', 'year')) {
                $table->dropColumn('year');
            }
        });
    }
};
