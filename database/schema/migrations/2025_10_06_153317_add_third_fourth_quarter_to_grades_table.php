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
        Schema::table('grades', function (Blueprint $table) {
            // Add third and fourth quarter columns
            $table->decimal('third_quarter', 5, 2)->nullable()->after('second_quarter')->comment('3rd Quarter Grade');
            $table->decimal('fourth_quarter', 5, 2)->nullable()->after('third_quarter')->comment('4th Quarter Grade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            //
        });
    }
};
