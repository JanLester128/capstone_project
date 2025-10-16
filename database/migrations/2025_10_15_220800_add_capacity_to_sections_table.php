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
        Schema::table('sections', function (Blueprint $table) {
            $table->integer('max_capacity')->default(40)->after('school_year_id');
            $table->boolean('is_full')->default(false)->after('max_capacity');
            $table->timestamp('capacity_reached_at')->nullable()->after('is_full');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            $table->dropColumn(['max_capacity', 'is_full', 'capacity_reached_at']);
        });
    }
};
