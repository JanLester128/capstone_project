<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'subject_id',
        'faculty_id',
        'school_year_id',
        'class_id',
        'semester',
        'first_quarter',
        'second_quarter',
        'third_quarter',
        'fourth_quarter',
        'semester_grade',
        'remarks',
        'status',
        'approved_by',
        'approved_at',
        'submitted_for_approval_at',
    ];

    protected $casts = [
        'first_quarter' => 'decimal:2',
        'second_quarter' => 'decimal:2',
        'third_quarter' => 'decimal:2',
        'fourth_quarter' => 'decimal:2',
        'semester_grade' => 'decimal:2',
        'approved_at' => 'datetime',
        'submitted_for_approval_at' => 'datetime',
    ];

    /**
     * Get the student that owns the grade.
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the subject that owns the grade.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the faculty that owns the grade.
     */
    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    /**
     * Get the school year that owns the grade.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the class that owns the grade.
     */
    public function class()
    {
        return $this->belongsTo(ClassSchedule::class, 'class_id');
    }

    /**
     * Calculate semester grade from quarters.
     * In Philippine SHS: Each semester record has 2 quarters (first_quarter, second_quarter)
     * Finals/Average should only be calculated when BOTH quarters are complete
     */
    public function calculateSemesterGrade()
    {
        // Determine which quarters to check based on semester
        if ($this->semester === '1st') {
            // 1st Semester: Check first_quarter and second_quarter
            $quarter1 = $this->first_quarter;
            $quarter2 = $this->second_quarter;
        } else {
            // 2nd Semester: Check third_quarter and fourth_quarter
            $quarter1 = $this->third_quarter;
            $quarter2 = $this->fourth_quarter;
        }
        
        if (!is_null($quarter1) && $quarter1 > 0 && 
            !is_null($quarter2) && $quarter2 > 0) {
            // Both quarters are complete, calculate average
            return round(($quarter1 + $quarter2) / 2, 2);
        }

        // If either quarter is missing, return null (ongoing)
        return null;
    }

    /**
     * Check if both quarters are complete for this semester
     */
    public function areBothQuartersComplete()
    {
        if ($this->semester === '1st') {
            // 1st Semester: Check first_quarter and second_quarter
            return !is_null($this->first_quarter) && $this->first_quarter > 0 &&
                   !is_null($this->second_quarter) && $this->second_quarter > 0;
        } else {
            // 2nd Semester: Check third_quarter and fourth_quarter
            return !is_null($this->third_quarter) && $this->third_quarter > 0 &&
                   !is_null($this->fourth_quarter) && $this->fourth_quarter > 0;
        }
    }

    /**
     * Get semester status based on quarter completion
     */
    public function getSemesterStatus()
    {
        if ($this->areBothQuartersComplete()) {
            return 'completed';
        } else {
            // Check if any quarter has a grade based on semester
            $hasAnyGrade = false;
            if ($this->semester === '1st') {
                $hasAnyGrade = (!is_null($this->first_quarter) && $this->first_quarter > 0) ||
                              (!is_null($this->second_quarter) && $this->second_quarter > 0);
            } else {
                $hasAnyGrade = (!is_null($this->third_quarter) && $this->third_quarter > 0) ||
                              (!is_null($this->fourth_quarter) && $this->fourth_quarter > 0);
            }
            
            return $hasAnyGrade ? 'ongoing' : 'not_started';
        }
    }

    /**
     * Check if grade is passing (75 or above in Philippine system).
     */
    public function isPassing()
    {
        return $this->semester_grade && $this->semester_grade >= 75;
    }

    /**
     * Get the grade status color for UI.
     */
    public function getStatusColor()
    {
        switch ($this->status) {
            case 'completed':
                return $this->isPassing() ? 'green' : 'red';
            case 'ongoing':
                return 'blue';
            case 'incomplete':
                return 'orange';
            case 'dropped':
                return 'gray';
            default:
                return 'gray';
        }
    }
}
