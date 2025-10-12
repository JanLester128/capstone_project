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
            // Add strand_id if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'strand_id')) {
                $table->unsignedBigInteger('strand_id')->nullable()->after('school_year_id');
                $table->foreign('strand_id')->references('id')->on('strands')->nullOnDelete();
            }
            
            // Add enrollment_date if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'enrollment_date')) {
                $table->timestamp('enrollment_date')->nullable()->after('status');
            }
            
            // Fix enrolled_by column - ensure it's the right type
            if (!Schema::hasColumn('enrollments', 'enrolled_by')) {
                $table->unsignedBigInteger('enrolled_by')->nullable()->after('enrollment_date');
                $table->foreign('enrolled_by')->references('id')->on('users')->nullOnDelete();
            }
            
            // Add student_type if it doesn't exist
            if (!Schema::hasColumn('enrollments', 'student_type')) {
                $table->string('student_type', 20)->nullable()->after('enrolled_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $columns = ['student_type', 'enrolled_by', 'enrollment_date', 'strand_id'];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('enrollments', $column)) {
                    // Drop foreign key if it exists
                    if (in_array($column, ['strand_id', 'enrolled_by'])) {
                        try {
                            $table->dropForeign([$column]);
                        } catch (Exception $e) {
                            // Foreign key might not exist
                        }
                    }
                    $table->dropColumn($column);
                }
            }
        });
    }
};
