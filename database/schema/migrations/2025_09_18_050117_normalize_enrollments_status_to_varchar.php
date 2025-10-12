<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('enrollments') || !Schema::hasColumn('enrollments', 'status')) {
            return;
        }
        // Backfill any null/empty to 'pending' before altering type
        DB::statement("UPDATE enrollments SET status = 'pending' WHERE status IS NULL OR status = ''");
        // Standardize to VARCHAR(20) with default 'pending'
        DB::statement("ALTER TABLE enrollments MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (!Schema::hasTable('enrollments') || !Schema::hasColumn('enrollments', 'status')) {
            return;
        }
        // Revert to a safe ENUM definition if you want rollback capability
        DB::statement("ALTER TABLE enrollments MODIFY COLUMN status ENUM('pending','approved','rejected','enrolled') NOT NULL DEFAULT 'pending'");
    }
};