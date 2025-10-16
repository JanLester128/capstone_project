<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Find and fix enrollments where the section's strand doesn't match the enrollment's strand
        $mismatches = DB::select("
            SELECT 
                e.id as enrollment_id,
                e.strand_id as enrollment_strand_id,
                e.assigned_section_id,
                sec.strand_id as section_strand_id,
                st1.name as enrollment_strand_name,
                st2.name as section_strand_name,
                sec.section_name
            FROM enrollments e
            JOIN sections sec ON e.assigned_section_id = sec.id
            LEFT JOIN strands st1 ON e.strand_id = st1.id
            LEFT JOIN strands st2 ON sec.strand_id = st2.id
            WHERE e.assigned_section_id IS NOT NULL 
            AND e.strand_id != sec.strand_id
            AND e.status = 'enrolled'
        ");

        if (!empty($mismatches)) {
            Log::info('Found enrollment-section strand mismatches', [
                'count' => count($mismatches),
                'mismatches' => $mismatches
            ]);

            foreach ($mismatches as $mismatch) {
                // Option 1: Reset the enrollment strand to match the section
                // This assumes the section assignment was correct
                DB::table('enrollments')
                    ->where('id', $mismatch->enrollment_id)
                    ->update(['strand_id' => $mismatch->section_strand_id]);

                Log::info('Fixed enrollment strand mismatch', [
                    'enrollment_id' => $mismatch->enrollment_id,
                    'changed_from_strand' => $mismatch->enrollment_strand_name,
                    'changed_to_strand' => $mismatch->section_strand_name,
                    'section' => $mismatch->section_name
                ]);
            }
        } else {
            Log::info('No enrollment-section strand mismatches found');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration fixes data inconsistencies, no rollback needed
        Log::info('Rollback of enrollment strand mismatch fix - no action taken');
    }
};
