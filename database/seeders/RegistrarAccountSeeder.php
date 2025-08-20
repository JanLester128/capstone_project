<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Registrar;

class RegistrarAccountSeeder extends Seeder
{
    public function run(): void
    {
        // Create or update the registrar's user account
        $user = User::updateOrCreate(
            ['email' => 'registrar@example.com'], // Match by email
            [
                'name' => 'Default Registrar',
                'password' => Hash::make('password123'), // Change to a secure password
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
