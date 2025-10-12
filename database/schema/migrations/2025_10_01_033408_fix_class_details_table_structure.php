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
        // Fix class_details table to match expected structure
        Schema::table('class_details', function (Blueprint $table) {
            // Add missing columns that should exist according to the original migration
            if (!Schema::hasColumn('class_details', 'enrollment_id')) {
                $table->foreignId('enrollment_id')->nullable()->constrained('enrollments')->onDelete('cascade');
            }
            if (!Schema::hasColumn('class_details', 'section_id')) {
                $table->foreignId('section_id')->nullable()->constrained('sections')->onDelete('cascade');
            }
            if (!Schema::hasColumn('class_details', 'is_enrolled')) {
                $table->boolean('is_enrolled')->default(true);
            }
            if (!Schema::hasColumn('class_details', 'enrolled_at')) {
                $table->timestamp('enrolled_at')->default(now());
            }
        });

        // Migrate existing data: convert student_id references to enrollment_id
        $this->migrateStudentIdToEnrollmentId();
        
        // After migration, we can make enrollment_id non-nullable
        Schema::table('class_details', function (Blueprint $table) {
            $table->foreignId('enrollment_id')->nullable(false)->change();
            $table->foreignId('section_id')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_details', function (Blueprint $table) {
            // Remove the columns we added
            if (Schema::hasColumn('class_details', 'enrollment_id')) {
                $table->dropForeign(['enrollment_id']);
                $table->dropColumn('enrollment_id');
            }
            if (Schema::hasColumn('class_details', 'section_id')) {
                $table->dropForeign(['section_id']);
                $table->dropColumn('section_id');
            }
            if (Schema::hasColumn('class_details', 'is_enrolled')) {
                $table->dropColumn('is_enrolled');
            }
            if (Schema::hasColumn('class_details', 'enrolled_at')) {
                $table->dropColumn('enrolled_at');
            }
        });
    }

    /**
     * Migrate existing student_id references to enrollment_id
     */
    private function migrateStudentIdToEnrollmentId()
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        
        try {
            // Get all class_details records with student_id
            $classDetails = DB::table('class_details')->get();
            
            foreach ($classDetails as $detail) {
                // Find the enrollment record for this student
                $enrollment = DB::table('enrollments')
                    ->where('student_id', $detail->student_id)
                    ->where('status', 'enrolled')
                    ->first();
                
                if ($enrollment) {
                    // Update the class_details record with enrollment_id and section_id
                    DB::table('class_details')
                        ->where('id', $detail->id)
                        ->update([
                            'enrollment_id' => $enrollment->id,
                            'section_id' => $enrollment->assigned_section_id ?? 1, // Default section if null
                            'is_enrolled' => true,
                            'enrolled_at' => $detail->created_at ?? now()
                        ]);
                        
                    echo "Migrated class_details record {$detail->id} to use enrollment {$enrollment->id}\n";
                } else {
                    echo "Warning: No enrollment found for student_id {$detail->student_id} in class_details {$detail->id}\n";
                }
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }
};
