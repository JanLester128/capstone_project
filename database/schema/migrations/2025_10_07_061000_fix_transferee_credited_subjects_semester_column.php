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
        Schema::table('transferee_credited_subjects', function (Blueprint $table) {
            // Increase semester column size to accommodate "1st Semester" and "2nd Semester"
            $table->string('semester', 20)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transferee_credited_subjects', function (Blueprint $table) {
            // Revert back to original size
            $table->string('semester', 10)->change();
        });
    }
};
