<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\StudentPersonalInfo;
use App\Models\TransfereePreviousSchool;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all transferee students who have previous school information
        $transfereeStudents = StudentPersonalInfo::where('student_status', 'transferee')
            ->whereNotNull('last_school')
            ->where('last_school', '!=', '')
            ->get();

        Log::info('Populating transferee previous schools', [
            'total_transferee_students' => $transfereeStudents->count()
        ]);

        foreach ($transfereeStudents as $studentInfo) {
            // Check if record already exists
            $existingRecord = TransfereePreviousSchool::where('student_personal_info_id', $studentInfo->id)->first();
            
            if (!$existingRecord) {
                try {
                    TransfereePreviousSchool::create([
                        'student_personal_info_id' => $studentInfo->id,
                        'last_school' => $studentInfo->last_school
                    ]);
                    
                    Log::info('Created transferee previous school record', [
                        'student_personal_info_id' => $studentInfo->id,
                        'student_name' => $studentInfo->user ? ($studentInfo->user->firstname . ' ' . $studentInfo->user->lastname) : 'Unknown',
                        'last_school' => $studentInfo->last_school
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create transferee previous school record', [
                        'student_personal_info_id' => $studentInfo->id,
                        'error' => $e->getMessage()
                    ]);
                }
            } else {
                // Update existing record if last_school is different
                if ($existingRecord->last_school !== $studentInfo->last_school) {
                    $existingRecord->update(['last_school' => $studentInfo->last_school]);
                    
                    Log::info('Updated transferee previous school record', [
                        'student_personal_info_id' => $studentInfo->id,
                        'old_school' => $existingRecord->last_school,
                        'new_school' => $studentInfo->last_school
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't remove the records as they might be manually created
        Log::info('Transferee previous schools population rollback - no action taken');
    }
};
