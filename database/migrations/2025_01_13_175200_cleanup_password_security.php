<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, clear all plain_password fields for security
        DB::table('users')->update(['plain_password' => null]);
        
        // Remove the generated_password column as it's a security risk
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('generated_password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-add the generated_password column if needed for rollback
        Schema::table('users', function (Blueprint $table) {
            $table->string('generated_password')->nullable()->after('password_changed');
        });
    }
};
