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
            // Approval status: pending_approval, approved, rejected
            $table->enum('approval_status', ['pending_approval', 'approved', 'rejected'])
                  ->default('pending_approval')
                  ->after('status');
            
            // Who approved/rejected the grade
            $table->unsignedBigInteger('approved_by')->nullable()->after('approval_status');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            
            // When was it approved/rejected
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            
            // Approval notes/comments
            $table->text('approval_notes')->nullable()->after('approved_at');
            
            // Submitted for approval timestamp
            $table->timestamp('submitted_for_approval_at')->nullable()->after('approval_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
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
