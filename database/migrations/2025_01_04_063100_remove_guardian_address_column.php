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
        try {
            // Check if the column exists before trying to drop it
            $columns = DB::select("SHOW COLUMNS FROM student_personal_info");
            $existingColumns = collect($columns)->pluck('Field')->toArray();
            
            if (in_array('guardian_address', $existingColumns)) {
                DB::statement("ALTER TABLE student_personal_info DROP COLUMN guardian_address");
                echo "Removed guardian_address column from student_personal_info table\n";
            } else {
                echo "Column guardian_address does not exist, skipping\n";
            }
            
        } catch (\Exception $e) {
            echo "Error removing guardian_address column: " . $e->getMessage() . "\n";
            // Don't throw the exception, just log it
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            // Check if the column doesn't exist before trying to add it back
            $columns = DB::select("SHOW COLUMNS FROM student_personal_info");
            $existingColumns = collect($columns)->pluck('Field')->toArray();
            
            if (!in_array('guardian_address', $existingColumns)) {
                DB::statement("ALTER TABLE student_personal_info ADD COLUMN guardian_address VARCHAR(255) NULL");
                echo "Added back guardian_address column to student_personal_info table\n";
            } else {
                echo "Column guardian_address already exists, skipping\n";
            }
            
        } catch (\Exception $e) {
            echo "Error adding back guardian_address column: " . $e->getMessage() . "\n";
            // Don't throw the exception, just log it
        }
    }
};
