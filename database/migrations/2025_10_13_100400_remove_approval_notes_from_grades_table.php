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
        Schema::table('grades', function (Blueprint $table) {
            // Remove approval_notes column from grades table
            if (Schema::hasColumn('grades', 'approval_notes')) {
                $table->dropColumn('approval_notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Re-add approval_notes column if rollback is needed
            $table->text('approval_notes')->nullable()->after('approved_at');
        });
    }
};
