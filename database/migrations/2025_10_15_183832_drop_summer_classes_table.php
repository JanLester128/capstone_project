<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drop the summer_classes table due to normalization violations.
     */
    public function up(): void
    {
        // Drop summer_classes table - violates 1NF with JSON arrays
        // and mixes enrollment/grading/admin responsibilities
        Schema::dropIfExists('summer_classes');
    }

    /**
     * Reverse the migrations.
     * Note: This table violated normalization principles,
     * so we don't recreate it in the down method.
     */
    public function down(): void
    {
        // Table was poorly designed with JSON fields violating 1NF
        // Use summer_class_schedules table instead for proper normalization
    }
};
