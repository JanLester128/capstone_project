<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Strand;
use App\Models\Subject;
use App\Models\Section;
use App\Models\Enrollment;

echo "=== STRAND DELETION ANALYSIS ===\n\n";

// Get all strands
$strands = Strand::all();

echo "📊 Current strands in database:\n";
foreach ($strands as $strand) {
    echo "  - {$strand->code}: {$strand->name}\n";
}

echo "\n🔍 Checking deletion constraints for each strand:\n\n";

foreach ($strands as $strand) {
    echo "Strand: {$strand->code} ({$strand->name})\n";
    
    // Check subjects
    $subjectCount = Subject::where('strand_id', $strand->id)->count();
    echo "  📚 Subjects: {$subjectCount}\n";
    
    // Check sections
    $sectionCount = Section::where('strand_id', $strand->id)->count();
    echo "  🏫 Sections: {$sectionCount}\n";
    
    // Check enrollments
    $enrollmentCount = Enrollment::where('strand_id', $strand->id)->count();
    echo "  👥 Enrollments: {$enrollmentCount}\n";
    
    // Check if deletable
    $canDelete = ($subjectCount == 0 && $sectionCount == 0 && $enrollmentCount == 0);
    echo "  🗑️ Can delete: " . ($canDelete ? "✅ YES" : "❌ NO") . "\n";
    
    if (!$canDelete) {
        $reasons = [];
        if ($subjectCount > 0) $reasons[] = "{$subjectCount} subjects";
        if ($sectionCount > 0) $reasons[] = "{$sectionCount} sections";
        if ($enrollmentCount > 0) $reasons[] = "{$enrollmentCount} enrollments";
        echo "     Reason: Has " . implode(', ', $reasons) . "\n";
    }
    
    echo "\n";
}

echo "=== DELETION CONSTRAINT SUMMARY ===\n";
echo "A strand can only be deleted if it has:\n";
echo "  - 0 subjects (subjects.strand_id)\n";
echo "  - 0 sections (sections.strand_id)\n";
echo "  - 0 enrollments (enrollments.strand_id)\n";
echo "\nThis is enforced by the deleteStrand() method in RegistrarController.\n";
