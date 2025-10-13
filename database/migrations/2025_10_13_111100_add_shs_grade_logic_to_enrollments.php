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
            // Add Grade 11-12 specific fields
            $table->enum('grade_level', ['Grade 11', 'Grade 12'])->after('intended_grade_level')->nullable();
            $table->boolean('has_grade_11_enrollment')->default(false)->after('grade_level');
            $table->foreignId('previous_enrollment_id')->nullable()->constrained('enrollments')->after('has_grade_11_enrollment');
            $table->enum('enrollment_method', ['self', 'auto', 'manual'])->default('self')->after('previous_enrollment_id');
            $table->boolean('cor_generated')->default(false)->after('enrollment_method');
            $table->timestamp('cor_generated_at')->nullable()->after('cor_generated');
            $table->text('cor_subjects')->nullable()->after('cor_generated_at'); // JSON field for COR subjects
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['previous_enrollment_id']);
            $table->dropColumn([
                'grade_level',
                'has_grade_11_enrollment', 
                'previous_enrollment_id',
                'enrollment_method',
                'cor_generated',
                'cor_generated_at',
                'cor_subjects'
            ]);
        });
    }
};
