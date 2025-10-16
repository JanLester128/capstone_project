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
        Schema::table('transferee_credited_subjects', function (Blueprint $table) {
            // Make school_year nullable temporarily to fix existing records
            $table->string('school_year', 20)->nullable()->change();
        });
        
        // Update any existing null school_year values
        DB::table('transferee_credited_subjects')
            ->whereNull('school_year')
            ->update(['school_year' => '2025-2026']);
            
        // Now make it not nullable with a default
        Schema::table('transferee_credited_subjects', function (Blueprint $table) {
            $table->string('school_year', 20)->default('2025-2026')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transferee_credited_subjects', function (Blueprint $table) {
            // Remove default and make nullable
            $table->string('school_year', 20)->nullable()->change();
        });
    }
};
