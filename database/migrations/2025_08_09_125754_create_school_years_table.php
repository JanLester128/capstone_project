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
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->integer('year_start');
            $table->integer('year_end');
            $table->string('semester', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false);
            $table->boolean('is_current_academic_year')->default(false);
            $table->timestamps();

            // Ensure unique combination of year_start, year_end, semester
            $table->unique(['year_start', 'year_end', 'semester']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('school_years');
        Schema::enableForeignKeyConstraints();
    }
};
