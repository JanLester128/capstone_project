<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            if (!Schema::hasColumn('school_years', 'allow_faculty_cor_print')) {
                $table->boolean('allow_faculty_cor_print')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            if (Schema::hasColumn('school_years', 'allow_faculty_cor_print')) {
                $table->dropColumn('allow_faculty_cor_print');
            }
        });
    }
};
