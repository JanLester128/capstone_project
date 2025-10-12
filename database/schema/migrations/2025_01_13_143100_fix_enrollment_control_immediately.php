<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Quick fix for enrollment control - ensures everything works immediately
     */
    public function up(): void
    {
        // Ensure enrollment fields exist
        $this->ensureEnrollmentFields();
        
        // Fix active school year enrollment settings
        $this->fixActiveSchoolYearEnrollment();
        
        echo "✅ Enrollment control fix completed!\n";
    }
    
    private function ensureEnrollmentFields()
    {
        $columns = [
            'enrollment_open' => 'boolean',
            'enrollment_start' => 'datetime',
            'enrollment_end' => 'datetime'
        ];
        
        foreach ($columns as $column => $type) {
            if (!Schema::hasColumn('school_years', $column)) {
                Schema::table('school_years', function (Blueprint $table) use ($column, $type) {
                    if ($type === 'boolean') {
                        $table->boolean($column)->default(true)->after('is_active');
                    } else {
                        $table->datetime($column)->nullable()->after('is_active');
                    }
                });
                echo "✅ Added {$column} column to school_years table\n";
            }
        }
    }
    
    private function fixActiveSchoolYearEnrollment()
    {
        $activeSchoolYear = DB::table('school_years')->where('is_active', true)->first();
        
        if ($activeSchoolYear) {
            $updates = [];
            
            // Ensure enrollment_open is set
            if (!isset($activeSchoolYear->enrollment_open)) {
                $updates['enrollment_open'] = true;
            }
            
            // Set enrollment dates if missing
            if (!$activeSchoolYear->enrollment_start || !$activeSchoolYear->enrollment_end) {
                $updates['enrollment_start'] = now();
                $updates['enrollment_end'] = now()->addDays(30);
            }
            
            if (!empty($updates)) {
                $updates['updated_at'] = now();
                DB::table('school_years')
                    ->where('id', $activeSchoolYear->id)
                    ->update($updates);
                    
                echo "✅ Updated active school year enrollment settings\n";
                echo "   - Enrollment Start: " . ($updates['enrollment_start'] ?? $activeSchoolYear->enrollment_start) . "\n";
                echo "   - Enrollment End: " . ($updates['enrollment_end'] ?? $activeSchoolYear->enrollment_end) . "\n";
                echo "   - Enrollment Open: " . ($updates['enrollment_open'] ?? $activeSchoolYear->enrollment_open ? 'Yes' : 'No') . "\n";
            } else {
                echo "✅ Active school year enrollment settings are already configured\n";
            }
        } else {
            echo "⚠️  No active school year found. Please activate a school year first.\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't reverse - this is a fix migration
    }
};
