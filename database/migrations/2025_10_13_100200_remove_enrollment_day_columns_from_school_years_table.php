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
            // Remove enrollment day restriction columns
            if (Schema::hasColumn('school_years', 'enrollment_day_message')) {
                $table->dropColumn('enrollment_day_message');
            }
            
            if (Schema::hasColumn('school_years', 'allowed_enrollment_days')) {
                $table->dropColumn('allowed_enrollment_days');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            // Re-add enrollment day restriction columns if rollback is needed
            $table->json('allowed_enrollment_days')->nullable()->after('enrollment_end')
                ->comment('JSON array of allowed days (0=Sunday, 1=Monday, etc.). NULL means Monday-Saturday default.');
            $table->text('enrollment_day_message')->nullable()->after('allowed_enrollment_days')
                ->comment('Custom message for day restrictions');
        });
    }
};
