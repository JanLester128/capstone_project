<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix adviser_id field to be nullable in sections table
     */
    public function up(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            // Check if adviser_id exists and make it nullable
            if (Schema::hasColumn('sections', 'adviser_id')) {
                // Drop existing foreign key constraint first
                $table->dropForeign(['adviser_id']);
                
                // Modify the column to be nullable
                $table->unsignedBigInteger('adviser_id')->nullable()->change();
                
                // Re-add foreign key constraint with cascade delete
                $table->foreign('adviser_id')->references('id')->on('users')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            if (Schema::hasColumn('sections', 'adviser_id')) {
                // Drop foreign key constraint
                $table->dropForeign(['adviser_id']);
                
                // Make adviser_id NOT NULL again
                $table->unsignedBigInteger('adviser_id')->nullable(false)->change();
                
                // Re-add foreign key constraint
                $table->foreign('adviser_id')->references('id')->on('users')->onDelete('cascade');
            }
        });
    }
};
