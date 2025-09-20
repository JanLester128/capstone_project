<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('student_strand_preferences')) {
            Schema::table('student_strand_preferences', function (Blueprint $table) {
                if (!Schema::hasColumn('student_strand_preferences', 'enrollment_id')) {
                    $table->foreignId('enrollment_id')
                        ->nullable()
                        ->after('student_id')
                        ->constrained('enrollments')
                        ->nullOnDelete();
                }
                if (!Schema::hasColumn('student_strand_preferences', 'school_year_id')) {
                    $table->foreignId('school_year_id')
                        ->nullable()
                        ->after('preference_order')
                        ->constrained('school_years')
                        ->nullOnDelete();
                }
            });

            // Optional backfill: set school_year_id for existing rows to current active school year (if any)
            try {
                $active = DB::table('school_years')->where('is_active', 1)->first();
                if ($active) {
                    DB::table('student_strand_preferences')
                        ->whereNull('school_year_id')
                        ->update(['school_year_id' => $active->id]);
                }
            } catch (\Throwable $e) {
                // safe to ignore
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('student_strand_preferences')) {
            return;
        }

        $dbName = DB::getDatabaseName();

        $dropFkIfExists = function (string $tableName, string $columnName) use ($dbName) {
            $constraint = DB::selectOne(
                "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
                 AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1",
                [$dbName, $tableName, $columnName]
            );
            if ($constraint && isset($constraint->CONSTRAINT_NAME)) {
                $fk = $constraint->CONSTRAINT_NAME;
                try {
                    DB::statement("ALTER TABLE `{$tableName}` DROP FOREIGN KEY `{$fk}`");
                } catch (\Throwable $e) {
                    // ignore if already dropped
                }
            }
        };

        // Drop FKs first
        if (Schema::hasColumn('student_strand_preferences', 'enrollment_id')) {
            $dropFkIfExists('student_strand_preferences', 'enrollment_id');
        }
        if (Schema::hasColumn('student_strand_preferences', 'school_year_id')) {
            $dropFkIfExists('student_strand_preferences', 'school_year_id');
        }

        // Drop columns
        Schema::table('student_strand_preferences', function (Blueprint $table) {
            if (Schema::hasColumn('student_strand_preferences', 'enrollment_id')) {
                $table->dropColumn('enrollment_id');
            }
            if (Schema::hasColumn('student_strand_preferences', 'school_year_id')) {
                $table->dropColumn('school_year_id');
            }
        });
    }
};