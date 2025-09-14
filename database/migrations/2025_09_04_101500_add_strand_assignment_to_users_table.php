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
            $table->unsignedBigInteger('assigned_strand_id')->nullable()->after('role');
            $table->boolean('is_coordinator')->default(false)->after('assigned_strand_id');
            
            $table->foreign('assigned_strand_id')->references('id')->on('strands')->onDelete('set null');
            $table->index(['role', 'assigned_strand_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['assigned_strand_id']);
            $table->dropIndex(['role', 'assigned_strand_id']);
            $table->dropColumn(['assigned_strand_id', 'is_coordinator']);
        });
    }
};
