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
            if (!Schema::hasColumn('class', 'duration')) {
                $table->integer('duration')->default(60)->after('start_time'); // Duration in minutes (60, 90, 120)
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class', function (Blueprint $table) {
            if (Schema::hasColumn('class', 'duration')) {
                $table->dropColumn('duration');
            }
        });
    }
};
