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
        // First, drop foreign key constraints that depend on columns we want to remove
        try {
            Schema::table('users', function (Blueprint $table) {
                // Drop foreign key constraint on enrolled_by_coordinator
                if (Schema::hasColumn('users', 'enrolled_by_coordinator')) {
                    $table->dropForeign(['enrolled_by_coordinator']);
                }
            });
        } catch (\Exception $e) {
            // Foreign key might not exist, continue
        }

        // Now drop the columns
        Schema::table('users', function (Blueprint $table) {
            // Remove columns that are already in student_personal_info table
            // These columns are redundant and should only exist in student_personal_info
            
            // Guardian information (already in student_personal_info)
            if (Schema::hasColumn('users', 'guardian_name')) {
                $table->dropColumn('guardian_name');
            }
            if (Schema::hasColumn('users', 'guardian_contact')) {
                $table->dropColumn('guardian_contact');
            }
            if (Schema::hasColumn('users', 'guardian_relationship')) {
                $table->dropColumn('guardian_relationship');
            }
            
            // Personal information (already in student_personal_info)
            if (Schema::hasColumn('users', 'suffix')) {
                $table->dropColumn('suffix');
            }
            if (Schema::hasColumn('users', 'birthdate')) {
                $table->dropColumn('birthdate');
            }
            if (Schema::hasColumn('users', 'gender')) {
                $table->dropColumn('gender');
            }
            if (Schema::hasColumn('users', 'contact_number')) {
                $table->dropColumn('contact_number');
            }
            if (Schema::hasColumn('users', 'address')) {
                $table->dropColumn('address');
            }
            
            // Enrollment related columns (already in student_personal_info)
            if (Schema::hasColumn('users', 'is_manual_enrollment')) {
                $table->dropColumn('is_manual_enrollment');
            }
            if (Schema::hasColumn('users', 'enrolled_by_coordinator')) {
                $table->dropColumn('enrolled_by_coordinator');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add back the columns if needed to rollback
            // Note: Data will be lost during rollback as these columns are being removed
            
            // Guardian information
            $table->string('guardian_name')->nullable();
            $table->string('guardian_contact')->nullable();
            $table->string('guardian_relationship')->nullable();
            
            // Personal information
            $table->string('suffix')->nullable();
            $table->date('birthdate')->nullable();
            $table->enum('gender', ['Male', 'Female'])->nullable();
            $table->string('contact_number')->nullable();
            $table->text('address')->nullable();
            
            // Enrollment related columns
            $table->boolean('is_manual_enrollment')->default(false);
            $table->unsignedBigInteger('enrolled_by_coordinator')->nullable();
        });

        // Recreate foreign key constraint
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->foreign('enrolled_by_coordinator')->references('id')->on('users')->onDelete('set null');
            });
        } catch (\Exception $e) {
            // Foreign key creation failed, ignore
        }
    }
};
