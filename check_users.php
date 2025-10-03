<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

// List all users
$users = User::all();

echo "Total users: " . $users->count() . "\n";

foreach ($users as $user) {
    echo "ID: {$user->id}, Name: {$user->firstname} {$user->lastname}, Email: {$user->email}, Type: " . ($user->student_type ?? 'null') . "\n";
}
