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
        Schema::table('student_personal_info', function (Blueprint $table) {
            // Add guardian_relationship if it doesn't exist
            if (!Schema::hasColumn('student_personal_info', 'guardian_relationship')) {
                $table->string('guardian_relationship', 50)->nullable()
                      ->after('guardian_contact')
                      ->comment('Relationship of guardian to student');
            }
            
            // Add emergency contact fields if they don't exist
            if (!Schema::hasColumn('student_personal_info', 'emergency_contact_name')) {
                $table->string('emergency_contact_name', 255)->nullable()
                      ->after('guardian_relationship')
                      ->comment('Emergency contact person name');
            }
            
            if (!Schema::hasColumn('student_personal_info', 'emergency_contact_number')) {
                $table->string('emergency_contact_number', 20)->nullable()
                      ->after('emergency_contact_name')
                      ->comment('Emergency contact person phone number');
            }
            
            if (!Schema::hasColumn('student_personal_info', 'emergency_contact_relationship')) {
                $table->string('emergency_contact_relationship', 50)->nullable()
                      ->after('emergency_contact_number')
                      ->comment('Relationship of emergency contact to student');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_personal_info', function (Blueprint $table) {
            // Drop columns if they exist
            $columnsToRemove = [
                'guardian_relationship',
                'emergency_contact_name', 
                'emergency_contact_number',
                'emergency_contact_relationship'
            ];
            
            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('student_personal_info', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
