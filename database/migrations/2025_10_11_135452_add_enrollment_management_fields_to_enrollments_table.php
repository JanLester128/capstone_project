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
            // Add student_name field for easier display
            if (!Schema::hasColumn('enrollments', 'student_name')) {
                $table->string('student_name')->nullable()->after('student_id');
            }
            
            // Add student_lrn field for easier display
            if (!Schema::hasColumn('enrollments', 'student_lrn')) {
                $table->string('student_lrn', 20)->nullable()->after('student_name');
            }
            
            // Add last_school_attended field
            if (!Schema::hasColumn('enrollments', 'last_school_attended')) {
                $table->string('last_school_attended')->nullable()->after('student_lrn');
            }
            
            // Add coordinator_notes field
            if (!Schema::hasColumn('enrollments', 'coordinator_notes')) {
                $table->text('coordinator_notes')->nullable()->after('coordinator_id');
            }
            
            // Add reviewed_at timestamp
            if (!Schema::hasColumn('enrollments', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('coordinator_notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn([
                'student_name',
                'student_lrn', 
                'last_school_attended',
                'coordinator_notes',
                'reviewed_at'
            ]);
        });
    }
};
