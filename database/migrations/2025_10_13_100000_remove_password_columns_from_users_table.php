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
        Schema::table('users', function (Blueprint $table) {
            // Remove password-related columns that are no longer needed
            if (Schema::hasColumn('users', 'generated_password')) {
                $table->dropColumn('generated_password');
            }
            
            if (Schema::hasColumn('users', 'plain_password')) {
                $table->dropColumn('plain_password');
            }
            
            if (Schema::hasColumn('users', 'password_change_required')) {
                $table->dropColumn('password_change_required');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Re-add the columns if rollback is needed
            $table->string('generated_password', 100)->nullable()->after('password');
            $table->string('plain_password', 100)->nullable()->after('password');
            $table->boolean('password_change_required')->default(false)->after('status');
        });
    }
};
