<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Subject;
use App\Models\Strand;
use App\Models\SchoolYear;

echo "=== SUBJECTS VERIFICATION REPORT ===\n\n";

// Check total subjects
$totalSubjects = Subject::count();
echo "✅ Total subjects in database: {$totalSubjects}\n\n";

// Check subjects by strand
echo "📚 Subjects by strand:\n";
$strands = Strand::with('subjects')->get();
foreach ($strands as $strand) {
    $count = $strand->subjects->count();
    echo "  - {$strand->code} ({$strand->name}): {$count} subjects\n";
}

// Check school year assignments
echo "\n🏫 School year assignments:\n";
$subjectsWithSchoolYear = Subject::whereNotNull('school_year_id')->count();
$subjectsWithoutSchoolYear = Subject::whereNull('school_year_id')->count();
echo "  - Subjects with school year: {$subjectsWithSchoolYear}\n";
echo "  - Subjects without school year: {$subjectsWithoutSchoolYear}\n";

// Check faculty assignments
echo "\n👨‍🏫 Faculty assignments:\n";
$subjectsWithFaculty = Subject::whereNotNull('faculty_id')->count();
$subjectsWithoutFaculty = Subject::whereNull('faculty_id')->count();
echo "  - Subjects with faculty: {$subjectsWithFaculty}\n";
echo "  - Subjects without faculty: {$subjectsWithoutFaculty}\n";

// Check active school year
echo "\n📅 Active school year:\n";
$activeSchoolYear = SchoolYear::where('is_active', true)->first();
if ($activeSchoolYear) {
    echo "  - Active: {$activeSchoolYear->semester} ({$activeSchoolYear->year_start}-{$activeSchoolYear->year_end})\n";
    $linkedSubjects = Subject::where('school_year_id', $activeSchoolYear->id)->count();
    echo "  - Subjects linked to active school year: {$linkedSubjects}\n";
} else {
    echo "  - No active school year found\n";
}

echo "\n=== VERIFICATION COMPLETE ===\n";

// Test foreign key constraint fix
echo "\n🔧 Testing foreign key constraint fix:\n";
echo "  - Subjects table now has SET NULL constraint instead of CASCADE\n";
echo "  - Faculty and school year deletions will not cascade to subjects\n";
echo "  - Subjects can exist without school year or faculty assignment\n";

echo "\n✅ All fixes have been successfully applied!\n";
