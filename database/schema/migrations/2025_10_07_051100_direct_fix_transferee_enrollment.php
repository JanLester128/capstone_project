<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check current table structure
        $columns = DB::select("SHOW COLUMNS FROM enrollments");
        $columnNames = array_column($columns, 'Field');
        
        // Fix enrolled_by column if it exists but has wrong type
        if (in_array('enrolled_by', $columnNames)) {
            // Get current column info
            $enrolledByInfo = collect($columns)->firstWhere('Field', 'enrolled_by');
            if ($enrolledByInfo && strpos($enrolledByInfo->Type, 'bigint') === false) {
                // Column exists but wrong type - fix it
                DB::statement('ALTER TABLE enrollments MODIFY COLUMN enrolled_by BIGINT UNSIGNED NULL');
            }
        } else {
            // Column doesn't exist - add it
            DB::statement('ALTER TABLE enrollments ADD COLUMN enrolled_by BIGINT UNSIGNED NULL AFTER status');
        }
        
        // Add strand_id if missing
        if (!in_array('strand_id', $columnNames)) {
            DB::statement('ALTER TABLE enrollments ADD COLUMN strand_id BIGINT UNSIGNED NULL AFTER school_year_id');
            DB::statement('ALTER TABLE enrollments ADD CONSTRAINT enrollments_strand_id_foreign FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE SET NULL');
        }
        
        // Add enrollment_date if missing
        if (!in_array('enrollment_date', $columnNames)) {
            DB::statement('ALTER TABLE enrollments ADD COLUMN enrollment_date TIMESTAMP NULL AFTER status');
        }
        
        // Add student_type if missing
        if (!in_array('student_type', $columnNames)) {
            DB::statement('ALTER TABLE enrollments ADD COLUMN student_type VARCHAR(20) NULL AFTER enrolled_by');
        }
        
        // Try to add foreign key for enrolled_by if it doesn't exist
        try {
            DB::statement('ALTER TABLE enrollments ADD CONSTRAINT enrollments_enrolled_by_foreign FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL');
        } catch (Exception $e) {
            // Foreign key might already exist or there might be data issues
            // Log but don't fail the migration
            \Log::info('Could not add enrolled_by foreign key: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove added columns
        $columns = ['student_type', 'enrollment_date', 'strand_id', 'enrolled_by'];
        
        foreach ($columns as $column) {
            try {
                // Try to drop foreign key first
                if ($column === 'enrolled_by') {
                    DB::statement('ALTER TABLE enrollments DROP FOREIGN KEY enrollments_enrolled_by_foreign');
                } elseif ($column === 'strand_id') {
                    DB::statement('ALTER TABLE enrollments DROP FOREIGN KEY enrollments_strand_id_foreign');
                }
            } catch (Exception $e) {
                // Foreign key might not exist
            }
            
            try {
                DB::statement("ALTER TABLE enrollments DROP COLUMN {$column}");
            } catch (Exception $e) {
                // Column might not exist
            }
        }
    }
};
