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
        'class_id',
        'school_year_id',
        'first_quarter',
        'second_quarter',
        'third_quarter', 
        'fourth_quarter',
        'semester_grade',
        'final_grade',
        'semester',
        'status',
        'remarks'
    ];

    protected $casts = [
        'first_quarter' => 'decimal:2',
        'second_quarter' => 'decimal:2',
        'third_quarter' => 'decimal:2',
        'fourth_quarter' => 'decimal:2',
        'semester_grade' => 'decimal:2',
        'final_grade' => 'decimal:2',
    ];

    // Relationships
    public function student() {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject() {
        return $this->belongsTo(Subject::class);
    }

    public function faculty() {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    public function class() {
        return $this->belongsTo(ClassSchedule::class, 'class_id');
    }

    public function schoolYear() {
        return $this->belongsTo(SchoolYear::class);
    }

    // Helper methods for Philippine SHS grading system
    
    /**
     * Calculate semester grade (average of 4 quarters)
     */
    public function calculateSemesterGrade()
    {
        $quarters = collect([
            $this->first_quarter,
            $this->second_quarter,
            $this->third_quarter,
            $this->fourth_quarter
        ])->filter()->values();

        if ($quarters->count() === 0) {
            return null;
        }

        return round($quarters->avg(), 2);
    }

    /**
     * Auto-calculate and save semester grade
     */
    public function updateSemesterGrade()
    {
        $this->semester_grade = $this->calculateSemesterGrade();
        $this->save();
        return $this->semester_grade;
    }

    /**
     * Get letter grade based on numerical grade (Philippine system)
     */
    public function getLetterGrade($grade = null)
    {
        $grade = $grade ?? $this->semester_grade ?? $this->final_grade;
        
        if ($grade === null) return 'NG'; // No Grade
        
        if ($grade >= 90) return 'A';
        if ($grade >= 85) return 'B+';
        if ($grade >= 80) return 'B';
        if ($grade >= 75) return 'C+';
        if ($grade >= 70) return 'C';
        if ($grade >= 65) return 'D';
        return 'F';
    }

    /**
     * Check if student passed (75 and above in Philippine SHS)
     */
    public function isPassed($grade = null)
    {
        $grade = $grade ?? $this->semester_grade ?? $this->final_grade;
        return $grade !== null && $grade >= 75;
    }

    /**
     * Get grade status description
     */
    public function getStatusDescription()
    {
        return match($this->status) {
            'ongoing' => 'Ongoing',
            'completed' => 'Completed',
            'incomplete' => 'Incomplete',
            'dropped' => 'Dropped',
            default => 'Unknown'
        };
    }

    /**
     * Scope for filtering by semester
     */
    public function scopeBySemester($query, $semester)
    {
        return $query->where('semester', $semester);
    }

    /**
     * Scope for filtering by school year
     */
    public function scopeBySchoolYear($query, $schoolYearId)
    {
        return $query->where('school_year_id', $schoolYearId);
    }

    /**
     * Scope for filtering by student
     */
    public function scopeByStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }
}
