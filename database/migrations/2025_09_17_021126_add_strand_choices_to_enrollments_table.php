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
        if (!Schema::hasTable('enrollments')) {
            return;
        }

        Schema::table('enrollments', function (Blueprint $table) {
            if (!Schema::hasColumn('enrollments', 'first_strand_choice_id')) {
                $table->foreignId('first_strand_choice_id')->nullable()->after('school_year_id')->constrained('strands')->nullOnDelete();
            }
            if (!Schema::hasColumn('enrollments', 'second_strand_choice_id')) {
                $table->foreignId('second_strand_choice_id')->nullable()->after('first_strand_choice_id')->constrained('strands')->nullOnDelete();
            }
            if (!Schema::hasColumn('enrollments', 'third_strand_choice_id')) {
                $table->foreignId('third_strand_choice_id')->nullable()->after('second_strand_choice_id')->constrained('strands')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('enrollments')) {
            return;
        }

        Schema::table('enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('enrollments', 'third_strand_choice_id')) {
                $table->dropConstrainedForeignId('third_strand_choice_id');
            }
            if (Schema::hasColumn('enrollments', 'second_strand_choice_id')) {
                $table->dropConstrainedForeignId('second_strand_choice_id');
            }
            if (Schema::hasColumn('enrollments', 'first_strand_choice_id')) {
                $table->dropConstrainedForeignId('first_strand_choice_id');
            }
        });
    }
};
