<?php

namespace App\Observers;

use App\Models\Grade;

class GradeObserver
{
    /**
     * Handle the Grade "creating" event.
     */
    public function creating(Grade $grade): void
    {
        $this->calculateSemesterGrade($grade);
        $this->validateSemesterQuarters($grade);
    }

    /**
     * Handle the Grade "updating" event.
     */
    public function updating(Grade $grade): void
    {
        $this->calculateSemesterGrade($grade);
        $this->validateSemesterQuarters($grade);
    }

    /**
     * Auto-calculate semester grade based on semester-specific quarters
     */
    private function calculateSemesterGrade(Grade $grade): void
    {
        $quarters = [];
        
        if ($grade->semester === '1st') {
            // 1st Semester: Only Q1 and Q2
            if ($grade->first_quarter !== null && $grade->first_quarter > 0) {
                $quarters[] = $grade->first_quarter;
            }
            if ($grade->second_quarter !== null && $grade->second_quarter > 0) {
                $quarters[] = $grade->second_quarter;
            }
        } elseif ($grade->semester === '2nd') {
            // 2nd Semester: Only Q3 and Q4
            if ($grade->third_quarter !== null && $grade->third_quarter > 0) {
                $quarters[] = $grade->third_quarter;
            }
            if ($grade->fourth_quarter !== null && $grade->fourth_quarter > 0) {
                $quarters[] = $grade->fourth_quarter;
            }
        }

        if (!empty($quarters)) {
            $grade->semester_grade = round(array_sum($quarters) / count($quarters), 2);
        } else {
            $grade->semester_grade = null;
        }
    }

    /**
     * Validate and clear invalid quarters based on semester
     */
    private function validateSemesterQuarters(Grade $grade): void
    {
        if ($grade->semester === '1st') {
            // 1st Semester: Clear Q3 and Q4
            $grade->third_quarter = null;
            $grade->fourth_quarter = null;
        } elseif ($grade->semester === '2nd') {
            // 2nd Semester: Clear Q1 and Q2
            $grade->first_quarter = null;
            $grade->second_quarter = null;
        }
    }
}
