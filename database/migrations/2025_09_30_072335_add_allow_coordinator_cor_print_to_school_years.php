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
            if (!Schema::hasColumn('school_years', 'allow_coordinator_cor_print')) {
                $table->boolean('allow_coordinator_cor_print')->default(true);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            if (Schema::hasColumn('school_years', 'allow_coordinator_cor_print')) {
                $table->dropColumn('allow_coordinator_cor_print');
            }
        });
    }
};
