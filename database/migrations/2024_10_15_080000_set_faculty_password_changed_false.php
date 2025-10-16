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
        // Set password_changed to false for all faculty/coordinator users who haven't changed their password
        DB::table('users')
            ->whereIn('role', ['faculty', 'coordinator'])
            ->whereNull('password_changed')
            ->update(['password_changed' => false]);
            
        // Also set it to false for those who have it explicitly set to true but should be required to change
        // (This is for testing - in production you might want to be more selective)
        DB::table('users')
            ->whereIn('role', ['faculty', 'coordinator'])
            ->where('password_changed', true)
            ->update(['password_changed' => false]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally revert the changes
        DB::table('users')
            ->whereIn('role', ['faculty', 'coordinator'])
            ->update(['password_changed' => null]);
    }
};
