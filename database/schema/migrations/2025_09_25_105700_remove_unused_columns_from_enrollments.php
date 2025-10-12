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
            // Remove enrolled_strand_id (we use strand_id instead)
            if (Schema::hasColumn('enrollments', 'enrolled_strand_id')) {
                $table->dropForeign(['enrolled_strand_id']);
                $table->dropColumn('enrolled_strand_id');
            }
            
            // Remove enrolled_at (we can use updated_at instead)
            if (Schema::hasColumn('enrollments', 'enrolled_at')) {
                $table->dropColumn('enrolled_at');
            }
            
            // Keep assigned_section_id for section assignments
            // This can be used instead of student_personal_info.section_id
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            // Re-add enrolled_at
            if (!Schema::hasColumn('enrollments', 'enrolled_at')) {
                $table->timestamp('enrolled_at')->nullable()->after('assigned_section_id');
            }
            
            // Re-add enrolled_strand_id
            if (!Schema::hasColumn('enrollments', 'enrolled_strand_id')) {
                $table->foreignId('enrolled_strand_id')->nullable()->after('third_strand_choice_id')
                      ->constrained('strands')->nullOnDelete();
            }
        });
    }
};
