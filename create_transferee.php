<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Student;

// Create a transferee student
$user = User::create([
    'firstname' => 'Jan',
    'lastname' => 'Camus',
    'email' => 'jan.camus@example.com',
    'password' => bcrypt('password'),
    'role' => 'student',
    'student_type' => 'transferee'
]);

echo "Created user: {$user->firstname} {$user->lastname} (ID: {$user->id})\n";

// Create student record
$student = Student::create([
    'user_id' => $user->id,
    'lrn' => '111111111111',
    'student_status' => 'Transferee',
    'grade_level' => 'Grade 11',
    'birthdate' => '2003-01-07',
    'age' => 21,
    'sex' => 'Male',
    'address' => 'Sample Address'
]);

echo "Created student record (ID: {$student->id})\n";
echo "Student type should now show as: Transferee\n";
