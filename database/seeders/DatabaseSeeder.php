<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        echo "Creating registrar account...\n";
        
        // Create registrar account
        User::updateOrCreate(
            ['email' => 'registrar@gmail.com'],
            [
                'firstname' => 'System',
                'lastname' => 'Registrar',
                'password' => Hash::make('admin123'),
                'role' => 'registrar',
                'status' => 'active',
            ]
        );

        echo "Registrar account created: registrar@gmail.com\n";
        
        echo "Seeding default strands and subjects...\n";
        
        // Seed strands and subjects
        $this->call([
            StrandSeeder::class,
            SubjectSeeder::class,
        ]);
        
        echo "Database seeding completed successfully!\n";
        echo "Registrar login: registrar@gmail.com / admin123\n";
        echo "Note: School years are managed dynamically through the UI.\n";
        echo "Default strands (STEM, HUMSS, ABM, TVL) and subjects have been created.\n";
    }
}
