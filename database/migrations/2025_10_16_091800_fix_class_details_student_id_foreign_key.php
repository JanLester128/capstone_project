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
        // Fix the foreign key constraint for student_id in class_details table
        // The error shows it's trying to reference student_personal_info.id instead of users.id
        
        Schema::table('class_details', function (Blueprint $table) {
            // Drop the incorrect foreign key constraint
            $table->dropForeign(['student_id']);
        });
        
        // Add the correct foreign key constraint
        Schema::table('class_details', function (Blueprint $table) {
            $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_details', function (Blueprint $table) {
            // Drop the correct foreign key
            $table->dropForeign(['student_id']);
        });
        
        // Re-add the incorrect foreign key (for rollback purposes)
        Schema::table('class_details', function (Blueprint $table) {
            $table->foreign('student_id')->references('id')->on('student_personal_info')->onDelete('cascade');
        });
    }
};
