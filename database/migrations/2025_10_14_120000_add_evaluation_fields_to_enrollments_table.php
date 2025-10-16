<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            // Add evaluation and revision fields if they don't exist
            if (!Schema::hasColumn('enrollments', 'evaluation_notes')) {
                $table->text('evaluation_notes')->nullable()->after('enrollment_date');
            }
            
            if (!Schema::hasColumn('enrollments', 'revision_notes')) {
                $table->text('revision_notes')->nullable()->after('evaluation_notes');
            }
            
            if (!Schema::hasColumn('enrollments', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('revision_notes');
            }
            
            // Add returned status to enum if not exists
            $table->string('status', 100)->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn(['evaluation_notes', 'revision_notes', 'rejection_reason']);
        });
    }
};
