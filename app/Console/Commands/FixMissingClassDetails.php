<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Enrollment;
use App\Models\SchoolYear;

class FixMissingClassDetails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:class-details';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix missing class_details records for enrolled students';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Fixing missing class_details records...');
        
        // Get all enrollments that don't have class_details
        $enrollments = Enrollment::whereDoesntHave('classDetails')->get();
        
        $this->info("Found {$enrollments->count()} enrollments without class_details");
        
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            $this->error('No active school year found!');
            return 1;
        }
        
        foreach ($enrollments as $enrollment) {
            try {
                $this->createClassDetailsForEnrollment($enrollment, $activeSchoolYear->id);
                $this->info("Created class_details for enrollment ID: {$enrollment->id}");
            } catch (\Exception $e) {
                $this->error("Failed to create class_details for enrollment ID {$enrollment->id}: " . $e->getMessage());
            }
        }
        
        $this->info('Finished fixing class_details records!');
        return 0;
    }
    
    private function createClassDetailsForEnrollment($enrollment, $schoolYearId)
    {
        // Get all class schedules for the student's section and strand
        $classSchedules = DB::table('class')
            ->where('section_id', $enrollment->assigned_section_id)
            ->where('school_year_id', $schoolYearId)
            ->where('is_active', true)
            ->select('id as class_id')
            ->get();
            
        $this->info("Found {$classSchedules->count()} classes for section {$enrollment->assigned_section_id} in school year {$schoolYearId}");

        // Create class_details record for each class
        foreach ($classSchedules as $class) {
            DB::table('class_details')->updateOrInsert(
                [
                    'class_id' => $class->class_id,
                    'enrollment_id' => $enrollment->id
                ],
                [
                    'student_id' => $enrollment->student_id,
                    'section_id' => $enrollment->assigned_section_id,
                    'is_enrolled' => true,
                    'enrolled_at' => $enrollment->enrollment_date ?? now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]
            );
        }
    }
}
