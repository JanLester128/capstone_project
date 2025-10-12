<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add adviser_id to sections table for faculty adviser assignments
     */
    public function up(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            // Add adviser_id field to link sections to faculty advisers
            $table->unsignedBigInteger('adviser_id')->nullable()->after('strand_id');
            
            // Add foreign key constraint
            $table->foreign('adviser_id')->references('id')->on('users')->onDelete('set null');
            
            // Add index for better query performance
            $table->index('adviser_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['adviser_id']);
            
            // Drop the column
            $table->dropColumn('adviser_id');
        });
    }
};
