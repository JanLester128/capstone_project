<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Registrar;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Registrar account
        $user = User::updateOrCreate(
            ['email' => 'registrar@example.com'], // Email for the registrar
            [
                'name' => 'Default Registrar',
                'password' => Hash::make('password123'), // Change to a strong password
                'role' => 'registrar',
            ]
        );

        // Ensure the registrar profile exists
        Registrar::updateOrCreate(
            ['user_id' => $user->id],
            []
        );
    }
}
