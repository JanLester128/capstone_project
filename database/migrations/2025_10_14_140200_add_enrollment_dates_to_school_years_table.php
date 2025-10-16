<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            if (!Schema::hasColumn('school_years', 'enrollment_start_date')) {
                $table->date('enrollment_start_date')->nullable()->after('is_enrollment_open');
            }
            
            if (!Schema::hasColumn('school_years', 'enrollment_end_date')) {
                $table->date('enrollment_end_date')->nullable()->after('enrollment_start_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            if (Schema::hasColumn('school_years', 'enrollment_end_date')) {
                $table->dropColumn('enrollment_end_date');
            }
            
            if (Schema::hasColumn('school_years', 'enrollment_start_date')) {
                $table->dropColumn('enrollment_start_date');
            }
        });
    }
};
