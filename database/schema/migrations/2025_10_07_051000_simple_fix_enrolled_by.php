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
        // Simple approach: just modify the column type directly
        DB::statement('ALTER TABLE enrollments MODIFY COLUMN enrolled_by BIGINT UNSIGNED NULL');
        
        // Add foreign key constraint if it doesn't exist
        try {
            DB::statement('ALTER TABLE enrollments ADD CONSTRAINT enrollments_enrolled_by_foreign FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL');
        } catch (Exception $e) {
            // Foreign key might already exist, that's okay
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to smaller column type (though this might cause data loss)
        DB::statement('ALTER TABLE enrollments MODIFY COLUMN enrolled_by INT NULL');
    }
};
