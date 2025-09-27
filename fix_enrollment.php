<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Fixing enrollment data...\n";

// Find the student and registrar
$student = App\Models\User::where('role', 'student')->first();
$registrar = App\Models\User::where('role', 'registrar')->first();

if (!$student) {
    echo "No student found!\n";
    exit;
}

if (!$registrar) {
    echo "No registrar found!\n";
    exit;
}

echo "Student found: {$student->firstname} {$student->lastname} (ID: {$student->id})\n";
echo "Registrar found: {$registrar->firstname} (ID: {$registrar->id})\n";

// Find the enrollment record
$enrollment = App\Models\Enrollment::first();

if (!$enrollment) {
    echo "No enrollment found!\n";
    exit;
}

echo "Current enrollment student_id: {$enrollment->student_id}\n";

// Fix the enrollment
$enrollment->student_id = $student->id;
$enrollment->save();

echo "✅ FIXED! Enrollment now points to student: {$student->firstname} {$student->lastname}\n";
echo "Faculty Classes should now show the correct student!\n";
