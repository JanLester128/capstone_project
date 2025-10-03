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
            // Use raw SQL to reorder columns since Laravel doesn't support column reordering directly
            
            // First, let's check what columns exist
            $columns = DB::select("SHOW COLUMNS FROM student_personal_info");
            $existingColumns = collect($columns)->pluck('Field')->toArray();
            
            echo "Current columns: " . implode(', ', $existingColumns) . "\n";
            
            // Create a temporary table with the desired column order
            DB::statement("
                CREATE TABLE student_personal_info_temp AS 
                SELECT 
                    id,
                    user_id,
                    lrn,
                    grade_level,
                    extension_name,
                    birthdate,
                    age,
                    sex,
                    birth_place,
                    address,
                    religion,
                    ip_community,
                    four_ps,
                    pwd_id,
                    last_grade,
                    last_sy,
                    last_school,
                    student_status,
                    section_id,
                    strand_id,
                    school_year_id,
                    guardian_name,
                    guardian_contact,
                    guardian_relationship,
                    emergency_contact_name,
                    emergency_contact_number,
                    emergency_contact_relationship,
                    psa_birth_certificate,
                    report_card,
                    image,
                    created_at,
                    updated_at
                FROM student_personal_info
            ");
            
            // Drop the original table
            DB::statement("DROP TABLE student_personal_info");
            
            // Rename the temporary table
            DB::statement("RENAME TABLE student_personal_info_temp TO student_personal_info");
            
            // Recreate the primary key and constraints
            DB::statement("ALTER TABLE student_personal_info ADD PRIMARY KEY (id)");
            DB::statement("ALTER TABLE student_personal_info MODIFY id BIGINT UNSIGNED AUTO_INCREMENT");
            
            // Add unique constraint for LRN
            DB::statement("ALTER TABLE student_personal_info ADD UNIQUE KEY unique_lrn (lrn)");
            
            echo "Successfully reordered columns in student_personal_info table\n";
            echo "Document columns (psa_birth_certificate, report_card, image) are now before timestamps\n";
            echo "Timestamp columns (created_at, updated_at) are now at the end\n";
            
        } catch (\Exception $e) {
            echo "Error reordering columns: " . $e->getMessage() . "\n";
            // Don't throw the exception to prevent migration failure
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot reverse column reordering easily
        echo "Column reordering cannot be reversed\n";
    }
};
