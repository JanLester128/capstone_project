<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Make faculty_id nullable in subjects table to allow subject creation without faculty assignment
     */
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            $table->dropForeign(['faculty_id']);
            
            // Make faculty_id nullable
            $table->unsignedBigInteger('faculty_id')->nullable()->change();
            
            // Add the foreign key constraint back with SET NULL
            $table->foreign('faculty_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
        
        echo "Made subjects.faculty_id nullable - subjects can now be created without faculty assignment.\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Drop the SET NULL constraint
            $table->dropForeign(['faculty_id']);
            
            // Make faculty_id NOT NULL again
            $table->unsignedBigInteger('faculty_id')->nullable(false)->change();
            
            // Add back the CASCADE constraint
            $table->foreign('faculty_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });
    }
};
