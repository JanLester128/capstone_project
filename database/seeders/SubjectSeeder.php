<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Subject;
use App\Models\Strand;
use App\Models\SchoolYear;

class SubjectSeeder extends Seeder
{
    public function run(): void
    {
        // Get the active school year - subjects should be linked to it
        $activeSchoolYear = SchoolYear::where('is_active', true)->first();
        
        if (!$activeSchoolYear) {
            echo "No active school year found. Please create and activate a school year first.\n";
            echo "Subjects will be created without school year assignment.\n";
        }

        // Get strands
        $abm = Strand::where('code', 'ABM')->first();
        $humss = Strand::where('code', 'HUMSS')->first();
        $stem = Strand::where('code', 'STEM')->first();
        $tvl = Strand::where('code', 'TVL')->first();

        // Create subjects and link them to the active school year
        if ($abm) {
            $this->createABMSubjects($abm->id, $activeSchoolYear ? $activeSchoolYear->id : null);
        }

        if ($humss) {
            $this->createHUMSSSubjects($humss->id, $activeSchoolYear ? $activeSchoolYear->id : null);
        }

        if ($stem) {
            $this->createSTEMSubjects($stem->id, $activeSchoolYear ? $activeSchoolYear->id : null);
        }

        if ($tvl) {
            $this->createTVLSubjects($tvl->id, $activeSchoolYear ? $activeSchoolYear->id : null);
        }

        if ($activeSchoolYear) {
            echo "Default K-12 subjects created successfully and linked to active school year: {$activeSchoolYear->semester} ({$activeSchoolYear->year_start}-{$activeSchoolYear->year_end}).\n";
        } else {
            echo "Default K-12 subjects created successfully.\n";
            echo "Note: Subjects will be linked to school years when school years are created dynamically.\n";
        }
    }

    private function createABMSubjects($strandId, $schoolYearId = null)
    {
        $subjects = [
            // Grade 11 - 1st Semester (1st and 2nd qrtr)
            ['name' => 'Oral Communication', 'code' => 'ABM-OC-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'code' => 'ABM-KPWKP-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'General Mathematics', 'code' => 'ABM-GM-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Earth and Life Science', 'code' => 'ABM-ELS-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => '21st Century Literature from the Philippines and the World', 'code' => 'ABM-21CL-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'ABM-PEH-11-1', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Empowerment Technologies', 'code' => 'ABM-ET-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Organization and Management', 'code' => 'ABM-OM-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Business Math', 'code' => 'ABM-BM-11', 'semester' => 1, 'year_level' => '11'],

            // Grade 11 - 2nd Semester (3rd and 4th qrtr)
            ['name' => 'Reading and Writing', 'code' => 'ABM-RW-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Pagbasa at Pagsusuri ng Iba\'t ibang Teksto Tungo sa Pananaliksik', 'code' => 'ABM-PPITSP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Statistics and Probability', 'code' => 'ABM-SP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Physical Science', 'code' => 'ABM-PS-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Introduction to the Philosophy of the Human Person', 'code' => 'ABM-IPHP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'ABM-PEH-11-2', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Practical Research 1', 'code' => 'ABM-PR1-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Principles of Marketing', 'code' => 'ABM-PM-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Fundamentals of Accountancy, Business and Management 1', 'code' => 'ABM-FABM1-11', 'semester' => 2, 'year_level' => '11'],

            // Grade 12 - 1st Semester
            ['name' => 'Personal Development', 'code' => 'ABM-PD-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Understanding Culture, Society and Politics', 'code' => 'ABM-UCSP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'ABM-PEH-12-1', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Practical Research 2', 'code' => 'ABM-PR2-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'English for Academic and Professional Purposes', 'code' => 'ABM-EAPP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Fundamentals of Accountancy, Business and Management 2', 'code' => 'ABM-FABM2-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Business Finance', 'code' => 'ABM-BF-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Applied Economics', 'code' => 'ABM-AE-12', 'semester' => 1, 'year_level' => '12'],

            // Grade 12 - 2nd Semester
            ['name' => 'Media and Information Literacy', 'code' => 'ABM-MIL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Contemporary Philippine Arts from the regions', 'code' => 'ABM-CPA-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'ABM-PEH-12-2', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Inquiries, Investigations and Immersion', 'code' => 'ABM-III-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Entrepreneurship', 'code' => 'ABM-ENT-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Filipino sa Piling Larang', 'code' => 'ABM-FPL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Business Ethics and Social Responsibility', 'code' => 'ABM-BESR-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Business Enterprise Simulation', 'code' => 'ABM-BES-12', 'semester' => 2, 'year_level' => '12'],
        ];

        foreach ($subjects as $subject) {
            Subject::updateOrCreate(
                ['code' => $subject['code']],
                array_merge($subject, [
                    'strand_id' => $strandId,
                    'school_year_id' => $schoolYearId
                ])
            );
        }
    }

    private function createHUMSSSubjects($strandId, $schoolYearId = null)
    {
        $subjects = [
            // Grade 11 - 1st Semester
            ['name' => 'Oral Communication', 'code' => 'HUMSS-OC-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'code' => 'HUMSS-KPWKP-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'General Mathematics', 'code' => 'HUMSS-GM-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Earth and Life Science', 'code' => 'HUMSS-ELS-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => '21st Century Literature from the Philippines and the World', 'code' => 'HUMSS-21CL-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'HUMSS-PEH-11-1', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Empowerment Technologies', 'code' => 'HUMSS-ET-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Introduction to the World Religions and Belief Systems', 'code' => 'HUMSS-IWRBS-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Disciplines and Ideas in the Social Sciences', 'code' => 'HUMSS-DISS-11', 'semester' => 1, 'year_level' => '11'],

            // Grade 11 - 2nd Semester
            ['name' => 'Reading and Writing', 'code' => 'HUMSS-RW-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Pagbasa at Pagsusuri ng Iba\'t ibang Teksto Tungo sa Pananaliksik', 'code' => 'HUMSS-PPITSP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Statistics and Probability', 'code' => 'HUMSS-SP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Physical Science', 'code' => 'HUMSS-PS-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Introduction to the Philosophy of the Human Person', 'code' => 'HUMSS-IPHP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'HUMSS-PEH-11-2', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Practical Research 1', 'code' => 'HUMSS-PR1-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Creative Writing', 'code' => 'HUMSS-CW-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Disciplines and Ideas in the Social Sciences', 'code' => 'HUMSS-DISS2-11', 'semester' => 2, 'year_level' => '11'],

            // Grade 12 - 1st Semester
            ['name' => 'Personal Development', 'code' => 'HUMSS-PD-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Understanding Culture, Society and Politics', 'code' => 'HUMSS-UCSP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'HUMSS-PEH-12-1', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Practical Research 2', 'code' => 'HUMSS-PR2-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'English for Academic and Professional Purposes', 'code' => 'HUMSS-EAPP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Philippine Politics & Governance', 'code' => 'HUMSS-PPG-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Trends, Networks and Critical Thinking in the 21st Century', 'code' => 'HUMSS-TNCT-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Creative Non-Fiction', 'code' => 'HUMSS-CNF-12', 'semester' => 1, 'year_level' => '12'],

            // Grade 12 - 2nd Semester
            ['name' => 'Media and Information Literacy', 'code' => 'HUMSS-MIL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Contemporary Philippine Arts from the regions', 'code' => 'HUMSS-CPA-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'HUMSS-PEH-12-2', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Inquiries, Investigations and Immersion', 'code' => 'HUMSS-III-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Entrepreneurship', 'code' => 'HUMSS-ENT-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Filipino sa Piling Larang', 'code' => 'HUMSS-FPL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Community Engagement, Solidarity and Citizenship', 'code' => 'HUMSS-CESC-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Work Immersion', 'code' => 'HUMSS-WI-12', 'semester' => 2, 'year_level' => '12'],
        ];

        foreach ($subjects as $subject) {
            Subject::updateOrCreate(
                ['code' => $subject['code']],
                array_merge($subject, [
                    'strand_id' => $strandId,
                    'school_year_id' => $schoolYearId
                ])
            );
        }
    }

    private function createSTEMSubjects($strandId, $schoolYearId = null)
    {
        $subjects = [
            // Grade 11 - 1st Semester
            ['name' => 'Oral Communication', 'code' => 'STEM-OC-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'code' => 'STEM-KPWKP-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'General Mathematics', 'code' => 'STEM-GM-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Earth Science', 'code' => 'STEM-ES-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => '21st Century Literature from the Philippines and the World', 'code' => 'STEM-21CL-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'STEM-PEH-11-1', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Pre-calculus', 'code' => 'STEM-PC-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'General Chemistry 1', 'code' => 'STEM-GC1-11', 'semester' => 1, 'year_level' => '11'],

            // Grade 11 - 2nd Semester
            ['name' => 'Reading and Writing', 'code' => 'STEM-RW-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Pagbasa at Pagsusuri ng Iba\'t ibang Teksto Tungo sa Pananaliksik', 'code' => 'STEM-PPITSP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Statistics and Probability', 'code' => 'STEM-SP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Disaster Readiness and Risk Reduction', 'code' => 'STEM-DRRR-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Introduction to the Philosophy of the Human Person', 'code' => 'STEM-IPHP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'STEM-PEH-11-2', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Practical Research 1', 'code' => 'STEM-PR1-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Basic Calculus', 'code' => 'STEM-BC-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'General Chemistry 2', 'code' => 'STEM-GC2-11', 'semester' => 2, 'year_level' => '11'],

            // Grade 12 - 1st Semester
            ['name' => 'Personal Development', 'code' => 'STEM-PD-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Understanding Culture, Society and Politics', 'code' => 'STEM-UCSP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'STEM-PEH-12-1', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Practical Research 2', 'code' => 'STEM-PR2-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'English for Academic and Professional Purposes', 'code' => 'STEM-EAPP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'General Biology 1', 'code' => 'STEM-GB1-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'General Physics 1', 'code' => 'STEM-GP1-12', 'semester' => 1, 'year_level' => '12'],

            // Grade 12 - 2nd Semester
            ['name' => 'Media and Information Literacy', 'code' => 'STEM-MIL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Contemporary Philippine Arts from the regions', 'code' => 'STEM-CPA-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'STEM-PEH-12-2', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Inquiries, Investigations and Immersion', 'code' => 'STEM-III-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Entrepreneurship', 'code' => 'STEM-ENT-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Filipino sa Piling Larang', 'code' => 'STEM-FPL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'General Biology 2', 'code' => 'STEM-GB2-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'General Physics 2', 'code' => 'STEM-GP2-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Research/Capstone Project', 'code' => 'STEM-RCP-12', 'semester' => 2, 'year_level' => '12'],
        ];

        foreach ($subjects as $subject) {
            Subject::updateOrCreate(
                ['code' => $subject['code']],
                array_merge($subject, [
                    'strand_id' => $strandId,
                    'school_year_id' => $schoolYearId
                ])
            );
        }
    }

    private function createTVLSubjects($strandId, $schoolYearId = null)
    {
        $subjects = [
            // Grade 11 - 1st Semester
            ['name' => 'Oral Communication', 'code' => 'TVL-OC-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'code' => 'TVL-KPWKP-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'General Mathematics', 'code' => 'TVL-GM-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Earth and Life Science', 'code' => 'TVL-ELS-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => '21st Century Literature from the Philippines and the World', 'code' => 'TVL-21CL-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'TVL-PEH-11-1', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'Empowerment Technologies', 'code' => 'TVL-ET-11', 'semester' => 1, 'year_level' => '11'],
            ['name' => 'TVL Course 1', 'code' => 'TVL-TC1-11', 'semester' => 1, 'year_level' => '11'],

            // Grade 11 - 2nd Semester
            ['name' => 'Reading and Writing', 'code' => 'TVL-RW-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Pagbasa at Pagsusuri ng Iba\'t ibang Teksto Tungo sa Pananaliksik', 'code' => 'TVL-PPITSP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Statistics and Probability', 'code' => 'TVL-SP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Physical Science', 'code' => 'TVL-PS-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Introduction to the Philosophy of the Human Person', 'code' => 'TVL-IPHP-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Physical Education and Health', 'code' => 'TVL-PEH-11-2', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'Practical Research 1', 'code' => 'TVL-PR1-11', 'semester' => 2, 'year_level' => '11'],
            ['name' => 'TVL Course 2', 'code' => 'TVL-TC2-11', 'semester' => 2, 'year_level' => '11'],

            // Grade 12 - 1st Semester
            ['name' => 'Personal Development', 'code' => 'TVL-PD-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Understanding Culture, Society and Politics', 'code' => 'TVL-UCSP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'TVL-PEH-12-1', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'Practical Research 2', 'code' => 'TVL-PR2-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'English for Academic and Professional Purposes', 'code' => 'TVL-EAPP-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'TVL Course 3', 'code' => 'TVL-TC3-12', 'semester' => 1, 'year_level' => '12'],
            ['name' => 'TVL Course 4', 'code' => 'TVL-TC4-12', 'semester' => 1, 'year_level' => '12'],

            // Grade 12 - 2nd Semester
            ['name' => 'Media and Information Literacy', 'code' => 'TVL-MIL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Contemporary Philippine Arts from the regions', 'code' => 'TVL-CPA-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Physical Education and Health', 'code' => 'TVL-PEH-12-2', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Inquiries, Investigations and Immersion', 'code' => 'TVL-III-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Entrepreneurship', 'code' => 'TVL-ENT-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Filipino sa Piling Larang', 'code' => 'TVL-FPL-12', 'semester' => 2, 'year_level' => '12'],
            ['name' => 'Work Immersion', 'code' => 'TVL-WI-12', 'semester' => 2, 'year_level' => '12'],
        ];

        foreach ($subjects as $subject) {
            Subject::updateOrCreate(
                ['code' => $subject['code']],
                array_merge($subject, [
                    'strand_id' => $strandId,
                    'school_year_id' => $schoolYearId
                ])
            );
        }
    }
}
