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
            // Remove room column from class table
            if (Schema::hasColumn('class', 'room')) {
                $table->dropColumn('room');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class', function (Blueprint $table) {
            // Re-add room column if rollback is needed
            $table->string('room', 100)->nullable()->after('semester');
        });
    }
};
