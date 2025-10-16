<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drop the unused summer_schedules table if it exists.
     */
    public function up(): void
    {
        // Drop summer_schedules table if it exists
        Schema::dropIfExists('summer_schedules');
    }

    /**
     * Reverse the migrations.
     * Recreate the table structure if needed (though this table was unused).
     */
    public function down(): void
    {
        // Note: This table was not used in the application, 
        // so we don't recreate it in the down method.
        // If you need to recreate it, you would define the schema here.
    }
};
