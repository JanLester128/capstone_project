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
        Schema::table('enrollments', function (Blueprint $table) {
            // Registrar approval fields
            $table->foreignId('registrar_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('registrar_approval_date')->nullable();
            $table->text('registrar_notes')->nullable();
            $table->text('registrar_rejection_reason')->nullable();
            $table->timestamp('registrar_rejection_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            //
        });
    }
};
