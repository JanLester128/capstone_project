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
        // Skip if table doesn't exist
        if (!Schema::hasTable('student_strand_preferences')) {
            return;
        }

        try {
            // Drop any existing long-named indexes
            DB::statement('DROP INDEX IF EXISTS student_strand_preferences_student_personal_info_id_preference_order_index ON student_strand_preferences');
            DB::statement('DROP INDEX IF EXISTS student_strand_preferences_student_personal_info_id_preference_order_unique ON student_strand_preferences');
            
            // Create short-named indexes if they don't exist
            $indexes = DB::select("SHOW INDEX FROM student_strand_preferences WHERE Key_name = 'ssp_student_pref_unique'");
            if (empty($indexes)) {
                DB::statement('ALTER TABLE student_strand_preferences ADD UNIQUE KEY ssp_student_pref_unique (student_personal_info_id, preference_order)');
            }
            
            $indexes = DB::select("SHOW INDEX FROM student_strand_preferences WHERE Key_name = 'ssp_student_pref_index'");
            if (empty($indexes)) {
                DB::statement('ALTER TABLE student_strand_preferences ADD INDEX ssp_student_pref_index (student_personal_info_id, preference_order)');
            }
            
        } catch (\Exception $e) {
            // Log error but don't fail migration
            Log::warning('Could not fix student_strand_preferences indexes: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This is a fix migration, no rollback needed
    }
};
