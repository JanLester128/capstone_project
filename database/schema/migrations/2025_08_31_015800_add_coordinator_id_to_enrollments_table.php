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
        Schema::table('enrollments', function (Blueprint $table) {
            $table->unsignedBigInteger('coordinator_id')->nullable()->after('status');
            $table->foreign('coordinator_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop FK constraint if it exists
        if (Schema::hasTable('enrollments') && Schema::hasColumn('enrollments', 'coordinator_id')) {
            $dbName = DB::getDatabaseName();
            $constraint = DB::selectOne(
                "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1",
                [$dbName, 'enrollments', 'coordinator_id']
            );
            if ($constraint && isset($constraint->CONSTRAINT_NAME)) {
                $fkName = $constraint->CONSTRAINT_NAME;
                try {
                    DB::statement("ALTER TABLE `enrollments` DROP FOREIGN KEY `{$fkName}`");
                } catch (\Throwable $e) {
                    // ignore if already dropped
                }
            }
        }

        // Drop the column if it exists
        Schema::table('enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('enrollments', 'coordinator_id')) {
                $table->dropColumn('coordinator_id');
            }
        });
    }
};
