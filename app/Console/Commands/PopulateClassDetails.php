<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PopulateClassDetails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'enrollment:populate-class-details';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Populate class_details table for existing enrolled students';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting to populate class_details for enrolled students...');

        try {
            // Get all enrolled students who don't have class_details records
            $enrolledStudents = DB::table('enrollments')
                ->leftJoin('class_details', 'enrollments.id', '=', 'class_details.enrollment_id')
                ->where('enrollments.status', 'enrolled')
                ->whereNull('class_details.id')
                ->select([
                    'enrollments.id as enrollment_id',
                    'enrollments.assigned_section_id',
                    'enrollments.strand_id',
                    'enrollments.school_year_id'
                ])
                ->get();

            $this->info("Found {$enrolledStudents->count()} enrolled students without class_details records");

            $createdCount = 0;
            foreach ($enrolledStudents as $student) {
                if (!$student->assigned_section_id) {
                    $this->warn("Skipping enrollment {$student->enrollment_id} - no assigned section");
                    continue;
                }

                // Get all class schedules for the student's section and strand
                // Note: The table might be named 'class' instead of 'class_schedules'
                $classSchedules = DB::table('class')
                    ->join('subjects', 'class.subject_id', '=', 'subjects.id')
                    ->where('class.section_id', $student->assigned_section_id)
                    ->where('class.school_year_id', $student->school_year_id)
                    ->where('subjects.strand_id', $student->strand_id)
                    ->select('class.id as class_id')
                    ->get();

                $this->info("Creating class_details for enrollment {$student->enrollment_id} - found {$classSchedules->count()} classes");

                // Create class_details record for each class
                foreach ($classSchedules as $class) {
                    DB::table('class_details')->updateOrInsert(
                        [
                            'class_id' => $class->class_id,
                            'enrollment_id' => $student->enrollment_id
                        ],
                        [
                            'section_id' => $student->assigned_section_id,
                            'is_enrolled' => true,
                            'enrolled_at' => now(),
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );
                    $createdCount++;
                }
            }

            $this->info("Successfully created {$createdCount} class_details records");
            Log::info('PopulateClassDetails command completed', [
                'enrolled_students_processed' => $enrolledStudents->count(),
                'class_details_created' => $createdCount
            ]);

        } catch (\Exception $e) {
            $this->error("Error populating class_details: " . $e->getMessage());
            Log::error('PopulateClassDetails command failed: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
