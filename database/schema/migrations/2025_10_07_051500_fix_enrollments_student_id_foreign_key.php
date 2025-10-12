<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check current foreign key constraint
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'enrollments' 
            AND COLUMN_NAME = 'student_id' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");
        
        if (!empty($foreignKeys)) {
            $constraint = $foreignKeys[0];
            Log::info('Current student_id foreign key constraint', [
                'constraint_name' => $constraint->CONSTRAINT_NAME,
                'references_table' => $constraint->REFERENCED_TABLE_NAME,
                'references_column' => $constraint->REFERENCED_COLUMN_NAME
            ]);
            
            // If it's pointing to student_personal_info, change it to users
            if ($constraint->REFERENCED_TABLE_NAME === 'student_personal_info') {
                // Drop the incorrect foreign key
                DB::statement("ALTER TABLE enrollments DROP FOREIGN KEY {$constraint->CONSTRAINT_NAME}");
                
                // Add the correct foreign key pointing to users table
                DB::statement('ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_id_foreign FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE');
                
                Log::info('Fixed student_id foreign key to point to users table');
            }
        } else {
            // No foreign key exists, add the correct one
            DB::statement('ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_id_foreign FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE');
            Log::info('Added student_id foreign key pointing to users table');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the foreign key we added/modified
        try {
            DB::statement('ALTER TABLE enrollments DROP FOREIGN KEY enrollments_student_id_foreign');
        } catch (Exception $e) {
            // Foreign key might not exist
        }
        
        // Optionally restore the old foreign key (though this might not work if data exists)
        // DB::statement('ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_id_foreign FOREIGN KEY (student_id) REFERENCES student_personal_info(id) ON DELETE CASCADE');
    }
};
