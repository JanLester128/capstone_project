<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Create table if it doesn't exist yet
        if (!Schema::hasTable('enrollments')) {
            Schema::create('enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
                // Optional strand choice columns are added by a separate migration if needed
                $table->string('status', 20)->default('pending');
                $table->string('report_card')->nullable();
                $table->text('documents')->nullable();
                $table->foreignId('coordinator_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();
            });
            return; // Fresh create done; nothing else to modify.
        }

        // Existing table detected; no further adjustments to legacy columns.
        // Keeping schema minimal and avoiding brittle type/nullable changes.
        return;
    }

    public function down(): void
    {
        // No rollback actions for this migration to avoid destructive changes.
        return;
    }
};