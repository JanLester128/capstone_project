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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->nullable();
            $table->string('firstname', 100)->nullable();
            $table->string('lastname', 100)->nullable();
            $table->string('middlename', 100)->nullable();
            $table->string('email', 100)->unique();
            $table->string('password', 100);
            $table->string('plain_password', 100)->nullable();
            $table->enum('role', ['student', 'faculty', 'coordinator', 'registrar']);
            $table->enum('status', ['active', 'inactive', 'pending'])->default('active');
            $table->boolean('password_change_required')->default(false);
            $table->boolean('is_disabled')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
