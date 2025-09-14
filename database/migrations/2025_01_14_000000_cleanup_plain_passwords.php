<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For existing faculty/coordinator accounts that have plain_password but password_changed is true,
        // remove the plain_password for security
        DB::table('users')
            ->whereIn('role', ['faculty', 'coordinator'])
            ->where('password_changed', true)
            ->whereNotNull('plain_password')
            ->update([
                'plain_password' => null,
                'password_change_required' => false
            ]);

        // For existing faculty/coordinator accounts that have plain_password but haven't changed it yet,
        // ensure they are marked as requiring password change
        DB::table('users')
            ->whereIn('role', ['faculty', 'coordinator'])
            ->where(function($query) {
                $query->where('password_changed', false)
                      ->orWhereNull('password_changed');
            })
            ->whereNotNull('plain_password')
            ->update([
                'password_change_required' => true,
                'password_changed' => false
            ]);

        // Ensure all faculty/coordinator accounts have proper boolean values
        DB::table('users')
            ->whereIn('role', ['faculty', 'coordinator'])
            ->whereNull('password_changed')
            ->update(['password_changed' => false]);

        DB::table('users')
            ->whereIn('role', ['faculty', 'coordinator'])
            ->whereNull('password_change_required')
            ->update(['password_change_required' => false]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is for security cleanup, so we don't reverse it
        // as that would reintroduce security vulnerabilities
    }
};
