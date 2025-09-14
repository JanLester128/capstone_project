<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Strand;

class StrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create only the four main K-12 strands
        $strands = [
            [
                'name' => 'Science, Technology, Engineering and Mathematics',
                'code' => 'STEM',
                'description' => 'Science, technology, engineering, and mathematics for STEM careers.'
            ],
            [
                'name' => 'Humanities and Social Sciences',
                'code' => 'HUMSS',
                'description' => 'Humanities and social sciences for critical thinking and communication skills.'
            ],
            [
                'name' => 'Accountancy, Business and Management',
                'code' => 'ABM',
                'description' => 'Business, entrepreneurship, and management with accounting and economics focus.'
            ],
            [
                'name' => 'Technical-Vocational-Livelihood',
                'code' => 'TVL',
                'description' => 'Technical and vocational skills for immediate employment or entrepreneurship.'
            ]
        ];

        foreach ($strands as $strandData) {
            Strand::updateOrCreate(
                ['code' => $strandData['code']], // Check by code to prevent duplicates
                $strandData // Create or update with this data
            );
        }

        echo "Default K-12 strands created successfully (STEM, HUMSS, ABM, TVL).\n";
    }
}
