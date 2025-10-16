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
        // Drop the cor_subjects table since we're using existing class_details table
        Schema::dropIfExists('cor_subjects');
        
        // Remove any note/reason columns from enrollments table if they exist
        Schema::table('enrollments', function (Blueprint $table) {
            // Check and drop columns that might exist
            $columns = Schema::getColumnListing('enrollments');
            
            if (in_array('coordinator_notes', $columns)) {
                $table->dropColumn('coordinator_notes');
            }
            
            if (in_array('rejection_reason', $columns)) {
                $table->dropColumn('rejection_reason');
            }
            
            if (in_array('notes', $columns)) {
                $table->dropColumn('notes');
            }
            
            if (in_array('reason', $columns)) {
                $table->dropColumn('reason');
            }
            
            if (in_array('admin_notes', $columns)) {
                $table->dropColumn('admin_notes');
            }
            
            if (in_array('remarks', $columns)) {
                $table->dropColumn('remarks');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate cor_subjects table if needed for rollback
        Schema::create('cor_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cor_id')->constrained('certificates_of_registration')->onDelete('cascade');
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->onDelete('set null');
            $table->foreignId('class_schedule_id')->nullable()->constrained('class', 'id')->onDelete('set null');
            $table->string('subject_code', 20);
            $table->string('subject_name');
            $table->decimal('units', 3, 1)->default(0);
            $table->string('day_of_week', 20)->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('faculty_name')->nullable();
            $table->string('room', 50)->nullable();
            $table->integer('semester');
            $table->boolean('is_credited')->default(false);
            $table->timestamps();

            // Indexes with custom names to avoid MySQL length limit
            $table->index(['cor_id', 'semester'], 'cor_subjects_cor_semester_idx');
            $table->index('subject_code', 'cor_subjects_code_idx');
            $table->index('is_credited', 'cor_subjects_credited_idx');
        });
    }
};
