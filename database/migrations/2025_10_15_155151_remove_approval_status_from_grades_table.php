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
        // First, migrate any data where approval_status is different from status
        DB::statement("
            UPDATE grades 
            SET status = approval_status 
            WHERE approval_status IN ('approved', 'rejected', 'draft') 
            AND status != approval_status
        ");
        
        Schema::table('grades', function (Blueprint $table) {
            // Remove the redundant approval_status column
            // We're consolidating to use only the 'status' column for grade workflow
            $table->dropColumn('approval_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Re-add approval_status column if rollback is needed
            $table->enum('approval_status', ['draft', 'pending_approval', 'approved', 'rejected'])
                  ->default('draft')
                  ->after('status');
        });
    }
};
