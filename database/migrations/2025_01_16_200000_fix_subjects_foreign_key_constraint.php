<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix the subjects table foreign key constraint to prevent cascade deletion
     */
    public function up(): void
    {
        // First, make school_year_id nullable to allow subjects without school year assignment
        Schema::table('subjects', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            $table->dropForeign(['school_year_id']);
            
            // Make school_year_id nullable
            $table->unsignedBigInteger('school_year_id')->nullable()->change();
            
            // Add the foreign key constraint back with SET NULL instead of CASCADE
            $table->foreign('school_year_id')
                  ->references('id')
                  ->on('school_years')
                  ->onDelete('set null'); // This prevents cascade deletion
        });
        
        echo "Fixed subjects foreign key constraint - subjects will no longer be deleted when school years are removed.\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Drop the SET NULL constraint
            $table->dropForeign(['school_year_id']);
            
            // Make school_year_id NOT NULL again
            $table->unsignedBigInteger('school_year_id')->nullable(false)->change();
            
            // Add back the CASCADE constraint (original behavior)
            $table->foreign('school_year_id')
                  ->references('id')
                  ->on('school_years')
                  ->onDelete('cascade');
        });
    }
};
