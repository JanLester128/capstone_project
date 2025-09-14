<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class RegistrarAccountSeeder extends Seeder
{
    public function run(): void
    {
        // Create or update the registrar's user account
        $user = User::updateOrCreate(
            ['email' => 'registrar@gmail.com'], // Match by email
            [
                'name' => 'Registrar',
                'password' => Hash::make('admin123'), // Change to a secure password
                'role' => 'registrar',
            ]
        );

        // Registrar user created with unified authentication system
    }
}
