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
        // Add manual enrollment fields to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_manual_enrollment')) {
                $table->boolean('is_manual_enrollment')->default(false);
            }
            if (!Schema::hasColumn('users', 'enrolled_by_coordinator')) {
                $table->unsignedBigInteger('enrolled_by_coordinator')->nullable();
            }
            if (!Schema::hasColumn('users', 'guardian_name')) {
                $table->string('guardian_name')->nullable();
            }
            if (!Schema::hasColumn('users', 'guardian_contact')) {
                $table->string('guardian_contact')->nullable();
            }
            if (!Schema::hasColumn('users', 'guardian_relationship')) {
                $table->string('guardian_relationship')->nullable();
            }
            if (!Schema::hasColumn('users', 'suffix')) {
                $table->string('suffix')->nullable();
            }
            if (!Schema::hasColumn('users', 'birthdate')) {
                $table->date('birthdate')->nullable();
            }
            if (!Schema::hasColumn('users', 'gender')) {
                $table->enum('gender', ['Male', 'Female'])->nullable();
            }
            if (!Schema::hasColumn('users', 'contact_number')) {
                $table->string('contact_number')->nullable();
            }
            if (!Schema::hasColumn('users', 'address')) {
                $table->text('address')->nullable();
            }
        });

        // Add foreign key constraint separately to avoid issues
        try {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'enrolled_by_coordinator')) {
                    $table->foreign('enrolled_by_coordinator')->references('id')->on('users')->onDelete('set null');
                }
            });
        } catch (\Exception $e) {
            // Foreign key might already exist, ignore
        }

        // Add manual enrollment fields to enrollments table
        Schema::table('enrollments', function (Blueprint $table) {
            if (!Schema::hasColumn('enrollments', 'enrolled_by')) {
                $table->enum('enrolled_by', ['student', 'coordinator'])->default('student');
            }
            if (!Schema::hasColumn('enrollments', 'coordinator_id')) {
                $table->unsignedBigInteger('coordinator_id')->nullable();
            }
            if (!Schema::hasColumn('enrollments', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        // Add foreign key constraint separately to avoid issues
        try {
            Schema::table('enrollments', function (Blueprint $table) {
                if (Schema::hasColumn('enrollments', 'coordinator_id')) {
                    $table->foreign('coordinator_id')->references('id')->on('users')->onDelete('set null');
                }
            });
        } catch (\Exception $e) {
            // Foreign key might already exist, ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['enrolled_by_coordinator']);
            $table->dropColumn([
                'is_manual_enrollment',
                'enrolled_by_coordinator', 
                'guardian_name',
                'guardian_contact',
                'guardian_relationship',
                'suffix',
                'birthdate',
                'gender',
                'contact_number',
                'address'
            ]);
        });

        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['coordinator_id']);
            $table->dropColumn([
                'enrolled_by',
                'coordinator_id',
                'notes'
            ]);
        });
    }
};
