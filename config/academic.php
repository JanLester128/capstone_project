<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Academic Programs Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration defines the available academic strands for the school.
    | Schools can customize this list based on their specific programs and
    | offerings. Each strand should have a unique code, descriptive name,
    | and optional description.
    |
    */

    'strands' => [
        [
            'code' => 'STEM',
            'name' => 'Science, Technology, Engineering and Mathematics',
            'description' => 'Focuses on science, technology, engineering, and mathematics subjects to prepare students for STEM-related careers and higher education.'
        ],
        [
            'code' => 'ABM',
            'name' => 'Accountancy, Business and Management',
            'description' => 'Prepares students for business, entrepreneurship, and management careers with focus on accounting and business principles.'
        ],
        [
            'code' => 'HUMSS',
            'name' => 'Humanities and Social Sciences',
            'description' => 'Emphasizes humanities and social sciences to develop critical thinking and communication skills for liberal arts careers.'
        ],
        [
            'code' => 'GAS',
            'name' => 'General Academic Strand',
            'description' => 'Provides a broad academic foundation allowing students to explore various fields before specializing in college.'
        ],
        [
            'code' => 'TVL',
            'name' => 'Technical-Vocational-Livelihood',
            'description' => 'Offers technical and vocational skills training to prepare students for immediate employment or entrepreneurship.'
        ],
        // Add more strands as needed by uncommenting and customizing:
        /*
        [
            'code' => 'ARTS',
            'name' => 'Arts and Design',
            'description' => 'Develops creative and artistic skills for careers in visual arts, performing arts, and design.'
        ],
        [
            'code' => 'SPORTS',
            'name' => 'Sports Track',
            'description' => 'Combines academic learning with sports training for student-athletes.'
        ],
        */
    ]
];
