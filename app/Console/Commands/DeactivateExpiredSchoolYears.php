<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SchoolYear;
use Carbon\Carbon;

class DeactivateExpiredSchoolYears extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'schoolyears:deactivate-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically deactivate school years that have passed their end date';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today();
        
        // Find active school years that have passed their end date
        $expiredSchoolYears = SchoolYear::where('is_active', true)
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', $today)
            ->get();

        if ($expiredSchoolYears->isEmpty()) {
            $this->info('No expired school years found.');
            return 0;
        }

        $deactivatedCount = 0;
        
        foreach ($expiredSchoolYears as $schoolYear) {
            $schoolYear->update(['is_active' => false]);
            $deactivatedCount++;
            
            $this->info("Deactivated: {$schoolYear->semester} ({$schoolYear->year_start}-{$schoolYear->year_end}) - End date: {$schoolYear->end_date}");
        }

        $this->info("Successfully deactivated {$deactivatedCount} expired school year(s).");
        
        return 0;
    }
}
