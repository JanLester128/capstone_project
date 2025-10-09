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
        if (!Schema::hasTable('student_personal_info')) {
            return;
        }

        // Check and add missing guardian columns
        $columnsToAdd = [
            'guardian_relationship' => 'VARCHAR(100) NULL COMMENT "Relationship of guardian to student"',
            'emergency_contact_name' => 'VARCHAR(100) NULL COMMENT "Emergency contact person name"',
            'emergency_contact_number' => 'VARCHAR(100) NULL COMMENT "Emergency contact phone number"',
            'emergency_contact_relationship' => 'VARCHAR(100) NULL COMMENT "Emergency contact relationship to student"'
        ];

        foreach ($columnsToAdd as $columnName => $columnDefinition) {
            if (!Schema::hasColumn('student_personal_info', $columnName)) {
                try {
                    DB::statement("ALTER TABLE student_personal_info ADD COLUMN {$columnName} {$columnDefinition}");
                    echo "Added column: {$columnName}\n";
                } catch (\Exception $e) {
                    echo "Error adding column {$columnName}: " . $e->getMessage() . "\n";
                }
            } else {
                echo "Column {$columnName} already exists\n";
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('student_personal_info')) {
            return;
        }

        $columnsToRemove = [
            'guardian_relationship',
            'emergency_contact_name',
            'emergency_contact_number',
            'emergency_contact_relationship'
        ];

        foreach ($columnsToRemove as $column) {
            if (Schema::hasColumn('student_personal_info', $column)) {
                try {
                    DB::statement("ALTER TABLE student_personal_info DROP COLUMN {$column}");
                } catch (\Exception $e) {
                    // Ignore errors on rollback
                }
            }
        }
    }
};
