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
        Schema::table('certificates_of_registration', function (Blueprint $table) {
            // Remove total_units column as it's causing enrollment issues
            // The subjects table doesn't have a units field, so total_units calculation fails
            // This prevents COR generation and enrollment completion
            $table->dropColumn('total_units');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certificates_of_registration', function (Blueprint $table) {
            // Re-add total_units column if rollback is needed
            $table->decimal('total_units', 5, 2)->default(0)->after('registration_date');
        });
    }
};
