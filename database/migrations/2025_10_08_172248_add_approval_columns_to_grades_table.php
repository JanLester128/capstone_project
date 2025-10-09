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
            // Add approval workflow columns
            $table->enum('approval_status', ['draft', 'pending_approval', 'approved', 'rejected'])
                  ->default('draft')
                  ->after('status');
            $table->unsignedBigInteger('approved_by')->nullable()->after('approval_status');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('approval_notes')->nullable()->after('approved_at');
            $table->timestamp('submitted_for_approval_at')->nullable()->after('approval_notes');
            
            // Add foreign key constraint
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['approved_by']);
            
            // Drop columns
            $table->dropColumn([
                'approval_status',
                'approved_by',
                'approved_at',
                'approval_notes',
                'submitted_for_approval_at'
            ]);
        });
    }
};
