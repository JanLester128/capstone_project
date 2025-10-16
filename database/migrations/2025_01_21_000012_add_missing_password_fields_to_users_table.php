<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add missing password-related fields to users table
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add password_change_required field if it doesn't exist
            if (!Schema::hasColumn('users', 'password_change_required')) {
                $table->boolean('password_change_required')->default(true)->after('password');
            }
            
            // Add generated_password field if it doesn't exist
            if (!Schema::hasColumn('users', 'generated_password')) {
                $table->string('generated_password', 100)->nullable()->after('password_change_required');
            }
            
            // Add username field if it doesn't exist (it's in fillable array)
            if (!Schema::hasColumn('users', 'username')) {
                $table->string('username', 100)->nullable()->unique()->after('id');
            }
            
            // Add plain_password field if it doesn't exist (for temporary storage)
            if (!Schema::hasColumn('users', 'plain_password')) {
                $table->string('plain_password', 100)->nullable()->after('generated_password');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop the columns if they exist
            if (Schema::hasColumn('users', 'password_change_required')) {
                $table->dropColumn('password_change_required');
            }
            
            if (Schema::hasColumn('users', 'generated_password')) {
                $table->dropColumn('generated_password');
            }
            
            if (Schema::hasColumn('users', 'username')) {
                $table->dropIndex(['username']);
                $table->dropColumn('username');
            }
            
            if (Schema::hasColumn('users', 'plain_password')) {
                $table->dropColumn('plain_password');
            }
        });
    }
};
