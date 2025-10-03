<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Student;

// Find Jan Camus and update their student type
$user = User::where('email', 'occ.camus.jan@gmail.com')->first();

if ($user) {
    echo "Found user: " . $user->firstname . " " . $user->lastname . "\n";
    
    // Update user student_type
    $user->update(['student_type' => 'transferee']);
    echo "Updated user student_type to: transferee\n";
    
    // Update student status
    $student = Student::where('user_id', $user->id)->first();
    if ($student) {
        $student->update(['student_status' => 'Transferee']);
        echo "Updated student_status to: Transferee\n";
    }
    
    echo "Student type fix completed!\n";
} else {
    echo "User not found\n";
}
