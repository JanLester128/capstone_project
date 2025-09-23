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
        Schema::table('users', function (Blueprint $table) {
            // Only add assigned_strand_id if it doesn't exist
            if (!Schema::hasColumn('users', 'assigned_strand_id')) {
                $table->unsignedBigInteger('assigned_strand_id')->nullable()->after('role');
                $table->foreign('assigned_strand_id')->references('id')->on('strands')->onDelete('set null');
            }
            
            // Only add is_coordinator if it doesn't exist
            if (!Schema::hasColumn('users', 'is_coordinator')) {
                $table->boolean('is_coordinator')->default(false)->after('assigned_strand_id');
            }
            
            // Check if index exists before creating
            $indexExists = DB::select("
                SELECT INDEX_NAME 
                FROM information_schema.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'users' 
                AND INDEX_NAME = 'users_role_assigned_strand_id_index'
            ");
            
            if (empty($indexExists)) {
                $table->index(['role', 'assigned_strand_id']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Try to drop foreign key and index safely
            try {
                if (Schema::hasColumn('users', 'assigned_strand_id')) {
                    // Check if foreign key exists by querying information_schema
                    $foreignKeyExists = DB::select("
                        SELECT CONSTRAINT_NAME 
                        FROM information_schema.KEY_COLUMN_USAGE 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = 'users' 
                        AND CONSTRAINT_NAME = 'users_assigned_strand_id_foreign'
                    ");
                    
                    if (!empty($foreignKeyExists)) {
                        $table->dropForeign(['assigned_strand_id']);
                    }
                    
                    // Check if index exists
                    $indexExists = DB::select("
                        SELECT INDEX_NAME 
                        FROM information_schema.STATISTICS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = 'users' 
                        AND INDEX_NAME = 'users_role_assigned_strand_id_index'
                    ");
                    
                    if (!empty($indexExists)) {
                        $table->dropIndex(['role', 'assigned_strand_id']);
                    }
                }
            } catch (\Exception $e) {
                // Silently continue if foreign key or index doesn't exist
            }
            
            // Check if columns exist before dropping
            $columnsToDrop = [];
            if (Schema::hasColumn('users', 'assigned_strand_id')) {
                $columnsToDrop[] = 'assigned_strand_id';
            }
            if (Schema::hasColumn('users', 'is_coordinator')) {
                $columnsToDrop[] = 'is_coordinator';
            }
            
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
