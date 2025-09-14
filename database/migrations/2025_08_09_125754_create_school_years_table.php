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
            $table->string('year', 100);
            $table->string('semester', 20);
            $table->boolean('is_active')->default(false);
            $table->integer('current_semester')->default(1);
            $table->timestamps();

            // Ensure unique combination of year, semester
            $table->unique(['year', 'semester']);
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
