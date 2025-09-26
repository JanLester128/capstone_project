<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SchoolYear;
use Carbon\Carbon;

class EnableEnrollment extends Command
{
    protected $signature = 'enrollment:enable {--school-year-id= : Specific school year ID to enable enrollment for}';
    protected $description = 'Enable enrollment for school year(s)';

    public function handle()
    {
        $schoolYearId = $this->option('school-year-id');
        
        if ($schoolYearId) {
            $schoolYear = SchoolYear::find($schoolYearId);
            if (!$schoolYear) {
                $this->error("School year with ID {$schoolYearId} not found.");
                return 1;
            }
            $schoolYears = collect([$schoolYear]);
        } else {
            // Get all school years (active or not)
            $schoolYears = SchoolYear::all();
            
            if ($schoolYears->isEmpty()) {
                $this->error('No school years found. Please create a school year first.');
                return 1;
            }
            
            // If no active school years, activate the first one
            $activeSchoolYears = $schoolYears->where('is_active', true);
            if ($activeSchoolYears->isEmpty()) {
                $this->info('No active school years found. Activating the first school year...');
                $firstSchoolYear = $schoolYears->first();
                $firstSchoolYear->update(['is_active' => true]);
                $schoolYears = collect([$firstSchoolYear]);
            } else {
                $schoolYears = $activeSchoolYears;
            }
        }
        
        foreach ($schoolYears as $schoolYear) {
            $schoolYear->update([
                'enrollment_open' => true,
                'enrollment_start' => Carbon::now()->subDays(30), // Started 30 days ago
                'enrollment_end' => Carbon::now()->addDays(60),   // Ends in 60 days
                'is_current_academic_year' => true
            ]);
            
            $this->info("Enrollment enabled for school year: {$schoolYear->year_start}-{$schoolYear->year_end} {$schoolYear->semester}");
            $this->info("Enrollment period: " . $schoolYear->enrollment_start->format('M d, Y') . " to " . $schoolYear->enrollment_end->format('M d, Y'));
        }
        
        $this->info('Enrollment has been successfully enabled!');
        $this->info('Students can now submit their enrollment applications.');
        
        return 0;
    }
}
