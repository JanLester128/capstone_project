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
        // Check if enrolled_by column exists and what type it is
        $columnExists = Schema::hasColumn('enrollments', 'enrolled_by');
        
        if ($columnExists) {
            // Get column information
            $columnInfo = DB::select("SHOW COLUMNS FROM enrollments LIKE 'enrolled_by'");
            $currentType = $columnInfo[0]->Type ?? '';
            
            \Log::info("Current enrolled_by column type: " . $currentType);
            
            // Check if foreign key constraint exists
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'enrollments' 
                AND COLUMN_NAME = 'enrolled_by' 
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            
            $hasForeignKey = !empty($foreignKeys);
            
            // If it's not already a proper foreign key type, fix it
            if (strpos($currentType, 'bigint') === false) {
                Schema::table('enrollments', function (Blueprint $table) use ($hasForeignKey) {
                    // Drop foreign key constraint if it exists
                    if ($hasForeignKey) {
                        $table->dropForeign(['enrolled_by']);
                    }
                    
                    // Change column to proper bigint unsigned
                    $table->unsignedBigInteger('enrolled_by')->nullable()->change();
                    
                    // Re-add foreign key constraint
                    $table->foreign('enrolled_by')->references('id')->on('users')->nullOnDelete();
                });
            } elseif (!$hasForeignKey) {
                // Column is correct type but missing foreign key
                Schema::table('enrollments', function (Blueprint $table) {
                    $table->foreign('enrolled_by')->references('id')->on('users')->nullOnDelete();
                });
            }
        } else {
            // Column doesn't exist, create it
            Schema::table('enrollments', function (Blueprint $table) {
                $table->foreignId('enrolled_by')->nullable()->after('status')
                      ->constrained('users')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('enrollments', 'enrolled_by')) {
                // Check if foreign key exists before dropping
                $foreignKeys = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'enrollments' 
                    AND COLUMN_NAME = 'enrolled_by' 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ");
                
                if (!empty($foreignKeys)) {
                    $table->dropForeign(['enrolled_by']);
                }
                $table->dropColumn('enrolled_by');
            }
        });
    }
};
