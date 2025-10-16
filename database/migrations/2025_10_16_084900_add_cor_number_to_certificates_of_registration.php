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
        Schema::table('certificates_of_registration', function (Blueprint $table) {
            if (!Schema::hasColumn('certificates_of_registration', 'cor_number')) {
                $table->string('cor_number', 50)->unique()->after('id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certificates_of_registration', function (Blueprint $table) {
            if (Schema::hasColumn('certificates_of_registration', 'cor_number')) {
                $table->dropColumn('cor_number');
            }
        });
    }
};
