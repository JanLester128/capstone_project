<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ClassSchedule;
use App\Models\Subject;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\User;
use App\Models\Student;
use App\Models\ClassDetail;
use Illuminate\Support\Facades\DB;

class ClassScheduleSeeder extends Seeder
{
    public function run(): void
    {
        // Clean up duplicate school years first
        $this->cleanupDuplicateSchoolYears();
        
        // Get or create current active school year (2025-2026)
        $currentYear = date('Y');
        
        // Check if the school year already exists
        $existingSchoolYear = SchoolYear::where('year_start', $currentYear)
                                       ->where('year_end', $currentYear + 1)
                                       ->where('semester', '1st Semester')
                                       ->first();
        
        if ($existingSchoolYear) {
            // Update existing school year to be active
            $existingSchoolYear->update([
                'is_active' => true,
                'start_date' => $currentYear . '-08-01',
                'end_date' => ($currentYear + 1) . '-05-31',
                'current_semester' => 1
            ]);
            $schoolYear = $existingSchoolYear;
        } else {
            // Create new school year
            $schoolYear = SchoolYear::create([
                'year_start' => $currentYear,
                'year_end' => $currentYear + 1,
                'semester' => '1st Semester',
                'is_active' => true,
                'start_date' => $currentYear . '-08-01',
                'end_date' => ($currentYear + 1) . '-05-31',
                'current_semester' => 1
            ]);
        }

        // Deactivate any other active school years
        SchoolYear::where('id', '!=', $schoolYear->id)
                  ->where('is_active', true)
                  ->update(['is_active' => false]);

        // Create sample subjects for current school year if they don't exist
        $subjects = [
            ['code' => 'MATH101', 'name' => 'General Mathematics', 'description' => 'Basic Mathematics for Grade 11', 'year_level' => '11', 'semester' => 1],
            ['code' => 'ENG101', 'name' => 'Oral Communication', 'description' => 'English Communication Skills', 'year_level' => '11', 'semester' => 1],
            ['code' => 'SCI101', 'name' => 'Earth and Life Science', 'description' => 'Basic Science for Grade 11', 'year_level' => '11', 'semester' => 1],
            ['code' => 'FIL101', 'name' => 'Komunikasyon at Pananaliksik', 'description' => 'Filipino Language and Research', 'year_level' => '11', 'semester' => 1],
            ['code' => 'PE101', 'name' => 'Physical Education and Health', 'description' => 'Physical Education for Grade 11', 'year_level' => '11', 'semester' => 1],
            ['code' => 'STEM101', 'name' => 'Pre-Calculus', 'description' => 'Advanced Mathematics for STEM', 'year_level' => '11', 'semester' => 1],
            // Second semester subjects
            ['code' => 'MATH102', 'name' => 'Statistics and Probability', 'description' => 'Statistics for Grade 11', 'year_level' => '11', 'semester' => 2],
            ['code' => 'ENG102', 'name' => 'Reading and Writing Skills', 'description' => 'Advanced English Skills', 'year_level' => '11', 'semester' => 2],
            ['code' => 'SCI102', 'name' => 'Physical Science', 'description' => 'Physics and Chemistry for Grade 11', 'year_level' => '11', 'semester' => 2],
        ];

        foreach ($subjects as $subjectData) {
            Subject::firstOrCreate(
                ['code' => $subjectData['code'], 'school_year_id' => $schoolYear->id], 
                array_merge($subjectData, ['school_year_id' => $schoolYear->id])
            );
        }

        // Check if strands exist - if not, skip schedule creation
        $strandsCount = \App\Models\Strand::count();
        
        if ($strandsCount === 0) {
            $this->command->info('No strands found. Skipping schedule creation.');
            $this->command->info('Please create strands through the registrar interface or run StrandSeeder first.');
            return;
        }

        // Check if sections exist - if not, skip schedule creation
        $sectionsCount = Section::count();
        
        if ($sectionsCount === 0) {
            $this->command->info('No sections found. Skipping schedule creation.');
            $this->command->info('Please create sections through the registrar interface first.');
            return;
        }

        // Get existing sections (created by registrar)
        $sections = Section::with('strand')->get();
        
        if ($sections->isEmpty()) {
            $this->command->info('No sections available for schedule creation.');
            return;
        }

        // Get created subjects
        $mathSubject = Subject::where('code', 'MATH101')->first();
        $engSubject = Subject::where('code', 'ENG101')->first();
        $sciSubject = Subject::where('code', 'SCI101')->first();
        $filSubject = Subject::where('code', 'FIL101')->first();
        $peSubject = Subject::where('code', 'PE101')->first();
        $stemSubject = Subject::where('code', 'STEM101')->first();

        // Check if subjects exist
        if (!$mathSubject || !$engSubject || !$sciSubject || !$filSubject || !$peSubject || !$stemSubject) {
            $this->command->info('Some required subjects not found. Skipping schedule creation.');
            $this->command->info('Please ensure all subjects are created first.');
            return;
        }

        // Check if faculty exist - if not, skip schedule creation
        $facultyCount = User::whereIn('role', ['faculty', 'coordinator'])->count();
        
        if ($facultyCount === 0) {
            $this->command->info('No faculty members found. Skipping schedule creation.');
            $this->command->info('Please create faculty accounts through the registrar interface first.');
            return;
        }

        // Get existing faculty members (created by registrar)
        $faculties = User::whereIn('role', ['faculty', 'coordinator'])->get();
        
        if ($faculties->count() < 4) {
            $this->command->info('Not enough faculty members found (' . $faculties->count() . ' available).');
            $this->command->info('Please create at least 4 faculty accounts through the registrar interface for full schedule seeding.');
            return;
        }

        // Use existing faculty members for schedule creation
        $facultyArray = $faculties->toArray();
        
        // Create sample schedules for the first available section
        $firstSection = $sections->first();
        
        // Create class schedules using existing sections and faculty
        $schedules = [
            // Monday
            ['subject_id' => 'MATH101', 'faculty_id' => $facultyArray[0]['id'], 'day_of_week' => 'Monday', 'start_time' => '08:00:00', 'end_time' => '09:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 101'],
            ['subject_id' => 'ENG101', 'faculty_id' => $facultyArray[1]['id'], 'day_of_week' => 'Monday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 102'],
            ['subject_id' => 'SCI101', 'faculty_id' => $facultyArray[2]['id'], 'day_of_week' => 'Monday', 'start_time' => '13:00:00', 'end_time' => '14:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 103'],
            
            // Tuesday
            ['subject_id' => 'FIL101', 'faculty_id' => $facultyArray[3]['id'], 'day_of_week' => 'Tuesday', 'start_time' => '08:00:00', 'end_time' => '09:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 104'],
            ['subject_id' => 'STEM101', 'faculty_id' => $facultyArray[0]['id'], 'day_of_week' => 'Tuesday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 101'],
            ['subject_id' => 'PE101', 'faculty_id' => $facultyArray[1]['id'], 'day_of_week' => 'Tuesday', 'start_time' => '14:00:00', 'end_time' => '15:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Gym'],
            
            // Wednesday
            ['subject_id' => 'MATH101', 'faculty_id' => $facultyArray[0]['id'], 'day_of_week' => 'Wednesday', 'start_time' => '08:00:00', 'end_time' => '09:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 101'],
            ['subject_id' => 'SCI101', 'faculty_id' => $facultyArray[2]['id'], 'day_of_week' => 'Wednesday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 103'],
            ['subject_id' => 'ENG101', 'faculty_id' => $facultyArray[1]['id'], 'day_of_week' => 'Wednesday', 'start_time' => '13:00:00', 'end_time' => '14:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 102'],
            
            // Thursday
            ['subject_id' => 'FIL101', 'faculty_id' => $facultyArray[3]['id'], 'day_of_week' => 'Thursday', 'start_time' => '08:00:00', 'end_time' => '09:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 104'],
            ['subject_id' => 'STEM101', 'faculty_id' => $facultyArray[0]['id'], 'day_of_week' => 'Thursday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 101'],
            ['subject_id' => 'PE101', 'faculty_id' => $facultyArray[1]['id'], 'day_of_week' => 'Thursday', 'start_time' => '14:00:00', 'end_time' => '15:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Gym'],
            
            // Friday
            ['subject_id' => 'MATH101', 'faculty_id' => $facultyArray[0]['id'], 'day_of_week' => 'Friday', 'start_time' => '08:00:00', 'end_time' => '09:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 101'],
            ['subject_id' => 'SCI101', 'faculty_id' => $facultyArray[2]['id'], 'day_of_week' => 'Friday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'duration' => 90, 'semester' => '1st Semester', 'room' => 'Room 103'],
        ];

        foreach ($schedules as $scheduleData) {
            $schedule = \App\Models\ClassSchedule::firstOrCreate([
                'section_id' => $firstSection->id,
                'subject_id' => $scheduleData['subject_id'],
                'faculty_id' => $scheduleData['faculty_id'],
                'school_year_id' => $schoolYear->id,
                'day_of_week' => $scheduleData['day_of_week'],
                'start_time' => $scheduleData['start_time'],
            ], array_merge($scheduleData, [
                'section_id' => $firstSection->id,
                'school_year_id' => $schoolYear->id
            ]));

            // Create class record in the class table
            DB::table('class')->updateOrInsert([
                'subject_id' => $scheduleData['subject_id'],
                'faculty_id' => $scheduleData['faculty_id'],
                'school_year_id' => $schoolYear->id,
                'day_of_week' => $scheduleData['day_of_week'],
                'start_time' => $scheduleData['start_time'],
            ], [
                'subject_id' => $scheduleData['subject_id'],
                'faculty_id' => $scheduleData['faculty_id'],
                'school_year_id' => $schoolYear->id,
                'day_of_week' => $scheduleData['day_of_week'],
                'start_time' => $scheduleData['start_time'],
                'end_time' => $scheduleData['end_time'],
                'duration' => $scheduleData['duration'],
                'semester' => $scheduleData['semester'],
                'room' => $scheduleData['room'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        $this->command->info('Class schedules created successfully for section: ' . $firstSection->section_name);
        $this->command->info('Using ' . $faculties->count() . ' existing faculty members and ' . $sections->count() . ' existing sections.');
        $this->command->info('Note: Run "php artisan db:seed" to create the registrar account and basic strands if needed.');
    }

    /**
     * Clean up duplicate school years and keep only the most recent ones
     */
    private function cleanupDuplicateSchoolYears()
    {
        // Find duplicate school years (same year_start, year_end, semester)
        $duplicates = DB::table('school_years')
            ->select('year_start', 'year_end', 'semester', DB::raw('COUNT(*) as count'), DB::raw('MIN(id) as keep_id'))
            ->groupBy('year_start', 'year_end', 'semester')
            ->having('count', '>', 1)
            ->get();

        foreach ($duplicates as $duplicate) {
            // Delete all duplicates except the first one (keep_id)
            DB::table('school_years')
                ->where('year_start', $duplicate->year_start)
                ->where('year_end', $duplicate->year_end)
                ->where('semester', $duplicate->semester)
                ->where('id', '!=', $duplicate->keep_id)
                ->delete();
        }

        // Deactivate old school years (before current year)
        $currentYear = date('Y');
        DB::table('school_years')
            ->where('year_end', '<', $currentYear)
            ->update(['is_active' => false]);
    }
}
