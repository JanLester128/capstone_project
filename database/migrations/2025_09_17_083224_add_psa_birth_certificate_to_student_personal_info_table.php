<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('student_personal_info') && !Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                $table->string('psa_birth_certificate', 255)->nullable()->after('report_card');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('student_personal_info') && Schema::hasColumn('student_personal_info', 'psa_birth_certificate')) {
            Schema::table('student_personal_info', function (Blueprint $table) {
                $table->dropColumn('psa_birth_certificate');
            });
        }
    }
};