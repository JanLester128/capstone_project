<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\DB;

class ClassScheduleSeeder extends Seeder
{
    public function run(): void
    {
        // Clean up duplicate school years first
        $this->cleanupDuplicateSchoolYears();
        
        // Only create a basic current school year if none exists
        $currentYear = date('Y');
        $yearString = $currentYear . '-' . ($currentYear + 1);
        
        // Check if any active school year exists
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            // Create only one initial school year if none exists
            $schoolYear = SchoolYear::create([
                'year' => $yearString,
                'semester' => '1st Semester',
                'is_active' => true,
                'start_date' => $currentYear . '-08-01',
                'end_date' => ($currentYear + 1) . '-05-31',
                'current_semester' => 1
            ]);
            
            $this->command->info('Created initial school year: ' . $yearString);
        } else {
            $this->command->info('Active school year already exists: ' . ($activeSchoolYear->year ?? 'Legacy'));
        }

        // Note: School years should be created dynamically through the registrar interface
        $this->command->info('Additional school years can be created through the Registrar > Semesters page');
        $this->command->info('Class schedules and subjects should be managed through the application interface');
    }

    /**
     * Clean up duplicate school years and keep only the most recent ones
     */
    private function cleanupDuplicateSchoolYears()
    {
        // Find duplicate school years (same year, semester)
        $duplicates = DB::table('school_years')
            ->select('year', 'semester', DB::raw('COUNT(*) as count'), DB::raw('MIN(id) as keep_id'))
            ->groupBy('year', 'semester')
            ->having('count', '>', 1)
            ->get();

        foreach ($duplicates as $duplicate) {
            // Delete all duplicates except the first one (keep_id)
            DB::table('school_years')
                ->where('year', $duplicate->year)
                ->where('semester', $duplicate->semester)
                ->where('id', '!=', $duplicate->keep_id)
                ->delete();
        }

        // Deactivate old school years (before current year)
        $currentYear = date('Y');
        $currentYearString = $currentYear . '-' . ($currentYear + 1);
        DB::table('school_years')
            ->where('year', '<', $currentYearString)
            ->update(['is_active' => false]);
    }
}
