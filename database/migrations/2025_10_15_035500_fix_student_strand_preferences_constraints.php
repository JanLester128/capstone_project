<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if the table exists and fix any constraint issues
        if (Schema::hasTable('student_strand_preferences')) {
            try {
                // Get current table structure
                $columns = Schema::getColumnListing('student_strand_preferences');
                
                // Check if we have the old 'student_id' column instead of 'student_personal_info_id'
                if (in_array('student_id', $columns) && !in_array('student_personal_info_id', $columns)) {
                    Schema::table('student_strand_preferences', function (Blueprint $table) {
                        // Drop old constraints first
                        $table->dropForeign(['student_id']);
                        $table->dropUnique(['student_id', 'preference_order']);
                        
                        // Rename the column
                        $table->renameColumn('student_id', 'student_personal_info_id');
                    });
                    
                    // Add the correct foreign key constraint
                    Schema::table('student_strand_preferences', function (Blueprint $table) {
                        $table->foreign('student_personal_info_id')->references('id')->on('student_personal_info')->onDelete('cascade');
                        $table->unique(['student_personal_info_id', 'preference_order']);
                    });
                }
                
                // Clean up any duplicate entries that might exist
                DB::statement("
                    DELETE t1 FROM student_strand_preferences t1
                    INNER JOIN student_strand_preferences t2 
                    WHERE t1.id > t2.id 
                    AND t1.student_personal_info_id = t2.student_personal_info_id 
                    AND t1.preference_order = t2.preference_order
                ");
                
            } catch (\Exception $e) {
                // Log the error but don't fail the migration
                Log::warning('Could not fix student_strand_preferences constraints: ' . $e->getMessage());
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is a fix, so we don't reverse it
    }
};
