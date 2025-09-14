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
        Schema::table('class', function (Blueprint $table) {
            // Check if column doesn't exist before adding
            if (!Schema::hasColumn('class', 'school_year_id')) {
                $table->foreignId('school_year_id')->nullable()->constrained('school_years')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class', function (Blueprint $table) {
            if (Schema::hasColumn('class', 'school_year_id')) {
                $table->dropForeign(['school_year_id']);
                $table->dropColumn('school_year_id');
            }
        });
    }
};
