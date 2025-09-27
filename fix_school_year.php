<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Fixing school year activation...\n";

// Find and activate school year
$schoolYear = App\Models\SchoolYear::first();

if ($schoolYear) {
    $schoolYear->is_active = true;
    $schoolYear->save();
    echo "✅ School year activated: {$schoolYear->year_start}-{$schoolYear->year_end}\n";
} else {
    echo "❌ No school year found\n";
}

// Verify the fix
$activeSchoolYear = App\Models\SchoolYear::where('is_active', true)->first();
if ($activeSchoolYear) {
    echo "✅ Verification: Active school year found: {$activeSchoolYear->year_start}-{$activeSchoolYear->year_end}\n";
} else {
    echo "❌ Verification failed: No active school year\n";
}
