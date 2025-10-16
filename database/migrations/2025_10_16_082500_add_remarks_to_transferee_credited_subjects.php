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
        Schema::table('transferee_credited_subjects', function (Blueprint $table) {
            // Add remarks column if it doesn't exist
            if (!Schema::hasColumn('transferee_credited_subjects', 'remarks')) {
                $table->text('remarks')->nullable()->after('grade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transferee_credited_subjects', function (Blueprint $table) {
            if (Schema::hasColumn('transferee_credited_subjects', 'remarks')) {
                $table->dropColumn('remarks');
            }
        });
    }
};
