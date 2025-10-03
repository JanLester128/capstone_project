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
            // Get existing columns to check what's already there
            $columns = DB::select("SHOW COLUMNS FROM student_personal_info");
            $existingColumns = collect($columns)->pluck('Field')->toArray();
            
            // List of columns we want to add
            $columnsToAdd = [
                'guardian_name' => 'VARCHAR(100) NULL',
                'guardian_contact' => 'VARCHAR(100) NULL', 
                'guardian_relationship' => 'VARCHAR(100) NULL',
                'guardian_address' => 'VARCHAR(255) NULL',
                'emergency_contact_name' => 'VARCHAR(100) NULL',
                'emergency_contact_number' => 'VARCHAR(100) NULL',
                'emergency_contact_relationship' => 'VARCHAR(100) NULL'
            ];
            
            // Add columns that don't exist
            foreach ($columnsToAdd as $columnName => $columnDefinition) {
                if (!in_array($columnName, $existingColumns)) {
                    DB::statement("ALTER TABLE student_personal_info ADD COLUMN {$columnName} {$columnDefinition}");
                    echo "Added column: {$columnName}\n";
                } else {
                    echo "Column {$columnName} already exists, skipping\n";
                }
            }
            
        } catch (\Exception $e) {
            echo "Error: " . $e->getMessage() . "\n";
            // Don't throw the exception, just log it
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            $columnsToRemove = [
                'guardian_name',
                'guardian_contact', 
                'guardian_relationship',
                'guardian_address',
                'emergency_contact_name',
                'emergency_contact_number',
                'emergency_contact_relationship'
            ];
            
            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('student_personal_info', $column)) {
                    DB::statement("ALTER TABLE student_personal_info DROP COLUMN {$column}");
                }
            }
        } catch (\Exception $e) {
            // Ignore errors on rollback
        }
    }
};
