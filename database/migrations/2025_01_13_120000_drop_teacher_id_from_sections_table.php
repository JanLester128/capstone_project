<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Remove deprecated teacher_id field from sections table
     * Use adviser_id instead for faculty adviser assignments
     */
    public function up(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            // Check if teacher_id column exists before dropping
            if (Schema::hasColumn('sections', 'teacher_id')) {
                // Drop foreign key constraint first
                $table->dropForeign(['teacher_id']);
                
                // Drop the column
                $table->dropColumn('teacher_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            // Re-add teacher_id field if migration is rolled back
            $table->foreignId('teacher_id')->nullable()->constrained('users')->onDelete('set null');
        });
    }
};
