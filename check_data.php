<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== DATABASE CHECK ===\n\n";

// Check class table
$classCount = DB::table('class')->count();
echo "Class table records: {$classCount}\n";

if ($classCount > 0) {
    $sampleClass = DB::table('class')->first();
    echo "Sample class record:\n";
    print_r($sampleClass);
}

echo "\n";

// Check class_details table
$classDetailsCount = DB::table('class_details')->count();
echo "Class_details table records: {$classDetailsCount}\n";

if ($classDetailsCount > 0) {
    $sampleClassDetail = DB::table('class_details')->first();
    echo "Sample class_detail record:\n";
    print_r($sampleClassDetail);
}

echo "\n";

// Check certificates_of_registration table
$corCount = DB::table('certificates_of_registration')->count();
echo "Certificates_of_registration table records: {$corCount}\n";

if ($corCount > 0) {
    $sampleCOR = DB::table('certificates_of_registration')->first();
    echo "Sample COR record:\n";
    print_r($sampleCOR);
}

echo "\n";

// Check enrollments
$enrolledCount = DB::table('enrollments')->where('status', 'enrolled')->count();
echo "Enrolled students: {$enrolledCount}\n";

if ($enrolledCount > 0) {
    $enrolledStudents = DB::table('enrollments')
        ->where('status', 'enrolled')
        ->get(['id', 'student_personal_info_id', 'assigned_section_id', 'status']);
    echo "Enrolled students details:\n";
    foreach ($enrolledStudents as $student) {
        print_r($student);
    }
}

echo "\n";

// Check sections
$sectionsCount = DB::table('sections')->count();
echo "Sections: {$sectionsCount}\n";

// Check school years
$schoolYears = DB::table('school_years')->get(['id', 'year', 'semester', 'is_active']);
echo "School years:\n";
foreach ($schoolYears as $sy) {
    print_r($sy);
}
