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
            // Add missing fields if they don't exist
            if (!Schema::hasColumn('student_personal_info', 'lrn')) {
                $table->string('lrn', 20)->nullable()->after('user_id');
            }
            
            if (!Schema::hasColumn('student_personal_info', 'sex')) {
                $table->enum('sex', ['Male', 'Female'])->nullable()->after('birthdate');
            }
            
            if (!Schema::hasColumn('student_personal_info', 'guardian_contact')) {
                $table->string('guardian_contact', 20)->nullable()->after('guardian_name');
            }
            
            if (!Schema::hasColumn('student_personal_info', 'guardian_relationship')) {
                $table->string('guardian_relationship', 100)->nullable()->after('guardian_contact');
            }
            
            if (!Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
                $table->string('psa_birth_certificate')->nullable()->after('guardian_relationship');
            }
            
            if (!Schema::hasColumn('student_personal_info', 'report_card')) {
                $table->string('report_card')->nullable()->after('psa_birth_certificate');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_personal_info', function (Blueprint $table) {
            $columnsToCheck = [
                'lrn', 'sex', 'guardian_contact', 'guardian_relationship', 
                'psa_birth_certificate', 'report_card'
            ];
            
            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('student_personal_info', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
