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
        Schema::table('strands', function (Blueprint $table) {
            if (!Schema::hasColumn('strands', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('description');
            }
        });

        // Set all existing strands to active
        DB::table('strands')->update(['is_active' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('strands', function (Blueprint $table) {
            if (Schema::hasColumn('strands', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};
