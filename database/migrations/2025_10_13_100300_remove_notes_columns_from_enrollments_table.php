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
        Schema::table('enrollments', function (Blueprint $table) {
            // Remove notes-related columns from enrollments table
            if (Schema::hasColumn('enrollments', 'notes')) {
                $table->dropColumn('notes');
            }
            
            if (Schema::hasColumn('enrollments', 'coordinator_notes')) {
                $table->dropColumn('coordinator_notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            // Re-add notes columns if rollback is needed
            $table->text('notes')->nullable()->after('status');
            $table->text('coordinator_notes')->nullable()->after('coordinator_id');
        });
    }
};
