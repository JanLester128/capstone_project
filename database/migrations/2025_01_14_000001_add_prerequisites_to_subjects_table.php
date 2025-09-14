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
        Schema::table('subjects', function (Blueprint $table) {
            $table->json('prerequisites')->nullable()->after('strand_id');
            $table->json('corequisites')->nullable()->after('prerequisites');
            $table->text('description')->nullable()->after('corequisites');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn(['prerequisites', 'corequisites', 'description']);
        });
    }
};
