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
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('session_token', 255)->unique();
            $table->string('ip_address', 100)->nullable();
            $table->text('device_info')->nullable();
            $table->string('browser_info', 255)->nullable();
            $table->timestamp('login_time');
            $table->timestamp('last_activity');
            $table->enum('status', ['active', 'expired', 'terminated'])->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Indexes for performance
            $table->index(['user_id', 'status']);
            $table->index('session_token');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_sessions');
    }
};
