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
    Schema::create('subjects', function (Blueprint $table) {
        $table->id();
        $table->string('code', 100)->unique();
        $table->string('name', 100);
        $table->integer('semester')->default(1);
        $table->string('year_level', 100);
        $table->foreignId('school_year_id')->nullable()->constrained('school_years')->onDelete('cascade');
        $table->foreignId('strand_id')->nullable()->constrained()->onDelete('cascade');
        $table->foreignId('faculty_id')->nullable()->constrained('users')->onDelete('set null');
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('subjects');
        Schema::enableForeignKeyConstraints();
    }
};
