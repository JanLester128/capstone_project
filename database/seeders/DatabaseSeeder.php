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
        
        // Create Registrar account only
        $user = User::updateOrCreate(
            ['email' => 'registrar@gmail.com'], // Email for the registrar
            [
                'name' => 'Opol National Secondary Technical School', // Add the required name field
                'firstname' => 'ONSTS',
                'lastname' => 'Registrar',
                'middlename' => null,
                'password' => Hash::make('admin123'), // Change to a strong password
                'role' => 'registrar',
            ]
        );
        
        echo "Registrar account created: {$user->email}\n";
        
        echo "Seeding default strands and subjects...\n";
        
        // Seed default K-12 strands and subjects
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
