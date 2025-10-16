<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix any existing orphaned subjects data
     */
    public function up(): void
    {
        // Check for subjects with invalid school_year_id references
        $orphanedSubjects = DB::table('subjects')
            ->leftJoin('school_years', 'subjects.school_year_id', '=', 'school_years.id')
            ->whereNull('school_years.id')
            ->whereNotNull('subjects.school_year_id')
            ->count();

        if ($orphanedSubjects > 0) {
            echo "Found {$orphanedSubjects} orphaned subjects with invalid school year references.\n";
            
            // Set orphaned subjects' school_year_id to NULL
            DB::table('subjects')
                ->leftJoin('school_years', 'subjects.school_year_id', '=', 'school_years.id')
                ->whereNull('school_years.id')
                ->whereNotNull('subjects.school_year_id')
                ->update(['subjects.school_year_id' => null]);
                
            echo "Fixed {$orphanedSubjects} orphaned subjects by setting school_year_id to NULL.\n";
        }

        // Check for subjects without faculty assignment
        $subjectsWithoutFaculty = DB::table('subjects')
            ->leftJoin('users', 'subjects.faculty_id', '=', 'users.id')
            ->whereNull('users.id')
            ->whereNotNull('subjects.faculty_id')
            ->count();

        if ($subjectsWithoutFaculty > 0) {
            echo "Found {$subjectsWithoutFaculty} subjects with invalid faculty references.\n";
            
            // Set subjects' faculty_id to NULL for invalid references
            DB::table('subjects')
                ->leftJoin('users', 'subjects.faculty_id', '=', 'users.id')
                ->whereNull('users.id')
                ->whereNotNull('subjects.faculty_id')
                ->update(['subjects.faculty_id' => null]);
                
            echo "Fixed {$subjectsWithoutFaculty} subjects by setting faculty_id to NULL.\n";
        }

        // Check for subjects without strand assignment
        $subjectsWithoutStrand = DB::table('subjects')
            ->leftJoin('strands', 'subjects.strand_id', '=', 'strands.id')
            ->whereNull('strands.id')
            ->whereNotNull('subjects.strand_id')
            ->count();

        if ($subjectsWithoutStrand > 0) {
            echo "Warning: Found {$subjectsWithoutStrand} subjects with invalid strand references.\n";
            echo "These subjects may need manual review as strand_id is required.\n";
        }

        // Show summary of subjects status
        $totalSubjects = DB::table('subjects')->count();
        $subjectsWithSchoolYear = DB::table('subjects')->whereNotNull('school_year_id')->count();
        $subjectsWithoutSchoolYear = $totalSubjects - $subjectsWithSchoolYear;

        echo "\n=== SUBJECTS STATUS SUMMARY ===\n";
        echo "Total subjects: {$totalSubjects}\n";
        echo "Subjects with school year: {$subjectsWithSchoolYear}\n";
        echo "Subjects without school year: {$subjectsWithoutSchoolYear}\n";
        echo "Data integrity check completed.\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration only fixes data, no schema changes to reverse
        echo "No schema changes to reverse. Data fixes cannot be undone automatically.\n";
    }
};
