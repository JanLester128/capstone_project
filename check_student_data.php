<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Checking student data structure...\n";

// Check enrollment
$enrollment = App\Models\Enrollment::first();
if ($enrollment) {
    echo "Enrollment student_id: {$enrollment->student_id}\n";
    
    // Check if this points to users table
    $user = App\Models\User::find($enrollment->student_id);
    if ($user) {
        echo "Enrollment points to USER: {$user->firstname} {$user->lastname} (role: {$user->role})\n";
    } else {
        echo "Enrollment points to non-existent user\n";
    }
    
    // Check if this points to student_personal_info table
    $personalInfo = DB::table('student_personal_info')->where('id', $enrollment->student_id)->first();
    if ($personalInfo) {
        echo "Enrollment points to PERSONAL_INFO: ID {$personalInfo->id}\n";
    } else {
        echo "Enrollment does NOT point to student_personal_info\n";
    }
} else {
    echo "No enrollment found\n";
}

// Check if student (user_id: 3) has personal info
$personalInfo = DB::table('student_personal_info')->where('user_id', 3)->first();
if ($personalInfo) {
    echo "Student (user_id: 3) HAS personal info: ID {$personalInfo->id}\n";
} else {
    echo "Student (user_id: 3) has NO personal info record\n";
}

// Check school year
$schoolYear = App\Models\SchoolYear::where('is_active', true)->first();
if ($schoolYear) {
    echo "Active school year: {$schoolYear->year_start}-{$schoolYear->year_end}\n";
} else {
    echo "No active school year found\n";
}
