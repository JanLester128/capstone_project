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
        try {
            // Disable foreign key checks temporarily
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            
            // Get all existing data first
            $existingData = DB::table('student_personal_info')->get();
            
            // Get all foreign key constraints that reference this table
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE REFERENCED_TABLE_NAME = 'student_personal_info'
            ");
            
            // Drop the table (foreign key checks are disabled)
            DB::statement('DROP TABLE IF EXISTS student_personal_info');
            
            // Recreate the table with proper column order
            DB::statement("
                CREATE TABLE student_personal_info (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL,
                    lrn VARCHAR(12) UNIQUE,
                    grade_level VARCHAR(255),
                    extension_name VARCHAR(255) NULL,
                    birthdate DATE,
                    age INT NULL,
                    sex ENUM('Male', 'Female') NULL,
                    birth_place VARCHAR(255) NULL,
                    address TEXT NULL,
                    religion VARCHAR(255) NULL,
                    ip_community VARCHAR(255) NULL,
                    four_ps VARCHAR(255) NULL,
                    pwd_id VARCHAR(255) NULL,
                    last_grade VARCHAR(255) NULL,
                    last_sy VARCHAR(255) NULL,
                    last_school VARCHAR(255) NULL,
                    student_status VARCHAR(255) NULL,
                    section_id BIGINT UNSIGNED NULL,
                    strand_id BIGINT UNSIGNED NULL,
                    school_year_id BIGINT UNSIGNED NULL,
                    guardian_name VARCHAR(100) NULL,
                    guardian_contact VARCHAR(100) NULL,
                    guardian_relationship VARCHAR(100) NULL,
                    emergency_contact_name VARCHAR(100) NULL,
                    emergency_contact_number VARCHAR(100) NULL,
                    emergency_contact_relationship VARCHAR(100) NULL,
                    psa_birth_certificate VARCHAR(255) NULL,
                    report_card VARCHAR(255) NULL,
                    image VARCHAR(255) NULL,
                    created_at TIMESTAMP NULL,
                    updated_at TIMESTAMP NULL
                )
            ");
            
            // Restore existing data
            foreach ($existingData as $record) {
                $recordArray = (array) $record;
                $columns = implode(',', array_keys($recordArray));
                $values = "'" . implode("','", array_map(function($value) {
                    return $value === null ? 'NULL' : addslashes($value);
                }, array_values($recordArray))) . "'";
                $values = str_replace("'NULL'", "NULL", $values);
                
                DB::statement("INSERT INTO student_personal_info ({$columns}) VALUES ({$values})");
            }
            
            // Re-enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            
            echo "Successfully reorganized student_personal_info table columns\n";
            echo "Document fields (psa_birth_certificate, report_card, image) are now before timestamps\n";
            echo "Timestamp fields (created_at, updated_at) are now at the end\n";
            
        } catch (\Exception $e) {
            // Re-enable foreign key checks in case of error
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            echo "Error reorganizing table: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot reverse column reordering
        echo "Column reordering cannot be reversed\n";
    }
};
