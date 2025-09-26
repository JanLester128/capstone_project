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
            // Remove assigned_strand_id if it exists (we use strand_id instead)
            if (Schema::hasColumn('enrollments', 'assigned_strand_id')) {
                $table->dropForeign(['assigned_strand_id']);
                $table->dropColumn('assigned_strand_id');
            }
            
            // Add assigned_section_id column if it doesn't exist
            // This is needed for section assignments during enrollment approval
            if (!Schema::hasColumn('enrollments', 'assigned_section_id')) {
                $table->foreignId('assigned_section_id')->nullable()->after('strand_id')
                      ->constrained('sections')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            // Drop assigned_section_id if it exists
            if (Schema::hasColumn('enrollments', 'assigned_section_id')) {
                $table->dropForeign(['assigned_section_id']);
                $table->dropColumn('assigned_section_id');
            }
            
            // Note: We don't re-add assigned_strand_id because it was redundant
            // The existing strand_id column should be used instead
        });
    }
};
