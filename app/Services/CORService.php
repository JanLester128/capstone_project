<?php

namespace App\Services;

use App\Models\CertificateOfRegistration;
use App\Models\Enrollment;
use App\Models\Subject;
use App\Models\ClassSchedule;
use App\Models\ClassDetail;
use App\Models\TransfereeSubjectCredit;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CORService
{
    /**
     * Generate COR for an enrolled student
     */
    public function generateCOR(Enrollment $enrollment, $generatedBy)
    {
        try {
            DB::beginTransaction();

            // Check if COR already exists for this enrollment
            $existingCOR = CertificateOfRegistration::where('enrollment_id', $enrollment->id)->first();
            if ($existingCOR) {
                return $existingCOR;
            }

            // Get student info through the proper relationship
            $studentPersonalInfo = $enrollment->studentPersonalInfo;
            
            if (!$studentPersonalInfo) {
                throw new \Exception("Student personal info not found for enrollment {$enrollment->id}");
            }
            
            $student = $studentPersonalInfo->user;
            
            if (!$student) {
                throw new \Exception("Student user not found for enrollment {$enrollment->id}");
            }
            
            $section = $enrollment->assignedSection;
            $strand = $enrollment->strand;
            $schoolYear = $enrollment->schoolYear;
            
            if (!$section) {
                throw new \Exception("No assigned section found for enrollment {$enrollment->id}");
            }
            
            if (!$strand) {
                throw new \Exception("No strand found for enrollment {$enrollment->id}");
            }
            
            if (!$schoolYear) {
                throw new \Exception("No school year found for enrollment {$enrollment->id}");
            }

            // Create class details for enrolled subjects (using existing class table)
            $this->createClassDetailsForStudent($enrollment);

            // Convert semester string to integer
            $semesterNumber = $this->convertSemesterToNumber($schoolYear->semester);

            // Generate unique COR number
            $corNumber = $this->generateCORNumber($schoolYear);

            // Create COR record
            $cor = CertificateOfRegistration::create([
                'cor_number' => $corNumber,
                'enrollment_id' => $enrollment->id,
                'student_id' => $student->id,
                'school_year_id' => $schoolYear->id,
                'section_id' => $section->id,
                'strand_id' => $strand->id,
                'semester' => $semesterNumber,
                'year_level' => $enrollment->intended_grade_level,
                'registration_date' => now()->toDateString(),
                'status' => 'active',
                'generated_by' => $generatedBy,
                'generated_at' => now()
            ]);

            DB::commit();

            Log::info('COR generated successfully', [
                'cor_id' => $cor->id,
                'enrollment_id' => $enrollment->id,
                'student_id' => $student->id
            ]);

            return $cor;

        } catch (\Exception $e) {
            DB::rollback();
            
            Log::error('Failed to generate COR', [
                'enrollment_id' => $enrollment->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    /**
     * Create class details for enrolled subjects using existing class table
     */
    private function createClassDetailsForStudent(Enrollment $enrollment)
    {
        $section = $enrollment->assignedSection;
        $strand = $enrollment->strand;
        $schoolYear = $enrollment->schoolYear;
        $gradeLevel = $enrollment->intended_grade_level;
        
        if (!$section) {
            throw new \Exception("No assigned section found for enrollment {$enrollment->id}");
        }
        
        if (!$schoolYear) {
            throw new \Exception("No school year found for enrollment {$enrollment->id}");
        }
        
        // Get student through proper relationship
        $studentPersonalInfo = $enrollment->studentPersonalInfo;
        
        if (!$studentPersonalInfo) {
            throw new \Exception("Student personal info not found for enrollment {$enrollment->id}");
        }
        
        $student = $studentPersonalInfo->user;
        
        if (!$student) {
            throw new \Exception("Student user not found for enrollment {$enrollment->id}");
        }

        Log::info('Creating class details for student', [
            'enrollment_id' => $enrollment->id,
            'student_id' => $student->id,
            'section_id' => $section->id,
            'school_year_id' => $schoolYear->id,
            'semester' => $schoolYear->semester
        ]);

        // Get all classes for the student's section from 'class' table
        $classes = DB::table('class')
            ->where('section_id', $section->id)
            ->where('school_year_id', $schoolYear->id)
            ->get();

        Log::info('Found classes for section', [
            'section_id' => $section->id,
            'classes_count' => $classes->count()
        ]);

        if ($classes->isEmpty()) {
            Log::warning('No classes found for section', [
                'section_id' => $section->id,
                'section_name' => $section->section_name,
                'school_year_id' => $schoolYear->id,
                'semester' => $schoolYear->semester
            ]);
        }

        foreach ($classes as $class) {
            // Create class detail entry for this student
            // IMPORTANT: student_id must be the user_id, not student_personal_info_id
            $classDetail = ClassDetail::updateOrCreate([
                'class_id' => $class->id,
                'student_id' => $student->id, // ✅ FIXED: Use user_id
                'enrollment_id' => $enrollment->id
            ], [
                'section_id' => $section->id,
                'enrollment_status' => 'enrolled',
                'is_enrolled' => true,
                'enrolled_at' => now()
            ]);

            Log::info('Created class detail', [
                'class_detail_id' => $classDetail->id,
                'class_id' => $class->id,
                'student_id' => $student->id,
                'subject_id' => $class->subject_id ?? 'N/A'
            ]);
        }

        Log::info('Class details creation completed', [
            'enrollment_id' => $enrollment->id,
            'total_class_details' => $classes->count()
        ]);

        // For transferee students, handle credited subjects
        if ($enrollment->enrollment_type === 'transferee') {
            $this->handleCreditedSubjects($enrollment);
        }
    }

    /**
     * Handle credited subjects for transferee students
     */
    private function handleCreditedSubjects(Enrollment $enrollment)
    {
        $studentPersonalInfo = $enrollment->studentPersonalInfo;
        
        if (!$studentPersonalInfo) {
            Log::warning('No student personal info found for transferee enrollment', [
                'enrollment_id' => $enrollment->id
            ]);
            return;
        }
        
        $credits = TransfereeSubjectCredit::where('student_id', $studentPersonalInfo->user_id)
            ->where('credit_status', 'credited')
            ->get();

        Log::info('Processed transferee credited subjects', [
            'enrollment_id' => $enrollment->id,
            'credited_subjects_count' => $credits->count()
        ]);
    }

    /**
     * Get COR for a student
     */
    public function getCORForStudent($studentId, $schoolYearId = null)
    {
        $query = CertificateOfRegistration::where('student_id', $studentId)
            ->with(['section', 'strand', 'schoolYear', 'enrollment.studentPersonalInfo']);

        if ($schoolYearId) {
            $query->where('school_year_id', $schoolYearId);
        } else {
            // Get the most recent COR
            $query->orderBy('created_at', 'desc');
        }

        return $query->first();
    }

    /**
     * Regenerate COR (useful for updates)
     */
    public function regenerateCOR(CertificateOfRegistration $cor, $generatedBy)
    {
        // Get the enrollment
        $enrollment = $cor->enrollment;

        // Delete existing class details for this enrollment
        ClassDetail::where('enrollment_id', $enrollment->id)->delete();

        // Recreate class details
        $this->createClassDetailsForStudent($enrollment);

        // Update COR
        $cor->update([
            'generated_by' => $generatedBy,
            'generated_at' => now()
        ]);

        return $cor;
    }

    /**
     * Get enrolled subjects for a COR (from class_details table)
     */
    public function getCORSubjects($corId)
    {
        $cor = CertificateOfRegistration::findOrFail($corId);
        
        return ClassDetail::where('enrollment_id', $cor->enrollment_id)
            ->with(['class.subject', 'class.faculty'])
            ->get()
            ->map(function ($classDetail) {
                $class = $classDetail->class;
                $subject = $class->subject;
                $faculty = $class->faculty;
                
                return [
                    'id' => $classDetail->id,
                    'subject_code' => $subject->code ?? 'N/A',
                    'subject_name' => $subject->name ?? 'N/A',
                    'units' => 1.0, // Default units
                    'schedule' => $class->day_of_week . ' ' . 
                        date('g:i A', strtotime($class->start_time)) . ' - ' . 
                        date('g:i A', strtotime($class->end_time)),
                    'faculty_name' => $faculty ? $faculty->firstname . ' ' . $faculty->lastname : 'TBA',
                    'room' => 'TBA', // Can be added to class table if needed
                    'is_credited' => false
                ];
            });
    }

    /**
     * Generate unique COR number
     * Format: COR-YYYY-NNNNN (e.g., COR-2025-00001)
     */
    private function generateCORNumber($schoolYear)
    {
        // Get the year from school year (e.g., "2025-2026" -> "2025")
        $year = substr($schoolYear->year, 0, 4);
        
        // Get the count of CORs for this school year
        $count = CertificateOfRegistration::where('school_year_id', $schoolYear->id)->count();
        
        // Generate sequential number (padded to 5 digits)
        $sequenceNumber = str_pad($count + 1, 5, '0', STR_PAD_LEFT);
        
        // Format: COR-YYYY-NNNNN
        $corNumber = "COR-{$year}-{$sequenceNumber}";
        
        // Ensure uniqueness (in case of race conditions)
        $attempts = 0;
        while (CertificateOfRegistration::where('cor_number', $corNumber)->exists() && $attempts < 10) {
            $count++;
            $sequenceNumber = str_pad($count + 1, 5, '0', STR_PAD_LEFT);
            $corNumber = "COR-{$year}-{$sequenceNumber}";
            $attempts++;
        }
        
        return $corNumber;
    }

    /**
     * Convert semester string to integer
     */
    private function convertSemesterToNumber($semesterString)
    {
        if (is_numeric($semesterString)) {
            return (int) $semesterString;
        }

        // Convert semester strings to numbers
        switch (strtolower(trim($semesterString))) {
            case '1st semester':
            case 'first semester':
            case 'semester 1':
                return 1;
            case '2nd semester':
            case 'second semester':
            case 'semester 2':
                return 2;
            default:
                // Default to 1 if we can't parse it
                return 1;
        }
    }
}
