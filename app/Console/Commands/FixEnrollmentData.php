<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Enrollment;

class FixEnrollmentData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:enrollment';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix enrollment data - change from registrar to student';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Fixing enrollment data...');

        // Find the student and registrar
        $student = User::where('role', 'student')->first();
        $registrar = User::where('role', 'registrar')->first();

        if (!$student) {
            $this->error('No student found!');
            return 1;
        }

        if (!$registrar) {
            $this->error('No registrar found!');
            return 1;
        }

        $this->info("Student found: {$student->firstname} {$student->lastname} (ID: {$student->id})");
        $this->info("Registrar found: {$registrar->firstname} (ID: {$registrar->id})");

        // Find the enrollment record
        $enrollment = Enrollment::first();

        if (!$enrollment) {
            $this->error('No enrollment found!');
            return 1;
        }

        $this->info("Current enrollment student_id: {$enrollment->student_id}");

        // Fix the enrollment
        $enrollment->student_id = $student->id;
        $enrollment->save();

        $this->info("✅ FIXED! Enrollment now points to student: {$student->firstname} {$student->lastname}");
        $this->info("Faculty Classes should now show the correct student!");

        return 0;
    }
}
