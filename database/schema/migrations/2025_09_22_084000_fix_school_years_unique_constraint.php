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
        // Check if the old constraint exists and drop it
        $oldConstraintExists = $this->constraintExists('school_years_year_semester_unique');
        if ($oldConstraintExists) {
            Schema::table('school_years', function (Blueprint $table) {
                $table->dropUnique('school_years_year_semester_unique');
            });
        }

        // Check if the new constraint already exists
        $newConstraintExists = $this->constraintExists('school_years_year_start_year_end_semester_unique');
        if (!$newConstraintExists) {
            Schema::table('school_years', function (Blueprint $table) {
                // Add new unique constraint on year_start, year_end, and semester
                $table->unique(['year_start', 'year_end', 'semester'], 'school_years_year_start_year_end_semester_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Check if the new constraint exists and drop it
        $newConstraintExists = $this->constraintExists('school_years_year_start_year_end_semester_unique');
        if ($newConstraintExists) {
            Schema::table('school_years', function (Blueprint $table) {
                $table->dropUnique('school_years_year_start_year_end_semester_unique');
            });
        }

        // Restore the old unique constraint if year column still exists
        if (Schema::hasColumn('school_years', 'year')) {
            $oldConstraintExists = $this->constraintExists('school_years_year_semester_unique');
            if (!$oldConstraintExists) {
                Schema::table('school_years', function (Blueprint $table) {
                    $table->unique(['year', 'semester'], 'school_years_year_semester_unique');
                });
            }
        }
    }

    /**
     * Check if a constraint exists on the school_years table
     */
    private function constraintExists(string $constraintName): bool
    {
        $result = DB::select("
            SELECT COUNT(*) as count 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'school_years' 
            AND CONSTRAINT_NAME = ?
        ", [config('database.connections.mysql.database'), $constraintName]);

        return $result[0]->count > 0;
    }
};
