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
        'semester',           // Critical: '1st' or '2nd'
        'first_quarter',      // Q1 (1st sem) or Q3 (2nd sem)
        'second_quarter',     // Q2 (1st sem) or Q4 (2nd sem)
        'semester_grade',     // Average of the 2 quarters above
        'status',
        'remarks'
    ];

    protected $casts = [
        'first_quarter' => 'decimal:2',
        'second_quarter' => 'decimal:2',
        'semester_grade' => 'decimal:2',
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

    public function approver() {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function class() {
        return $this->belongsTo(ClassSchedule::class, 'class_id');
    }

    public function schoolYear() {
        return $this->belongsTo(SchoolYear::class);
    }

    // Helper methods for Philippine SHS grading system
    
    /**
     * Calculate semester grade (average of 2 quarters for this semester)
     * 1st Semester: Q1 + Q2 average
     * 2nd Semester: Q3 + Q4 average (stored as first_quarter + second_quarter)
     */
    public function calculateSemesterGrade()
    {
        $quarters = collect([
            $this->first_quarter,
            $this->second_quarter
        ])->filter()->values();

        if ($quarters->count() === 0) {
            return null;
        }

        return round($quarters->avg(), 2);
    }

    /**
     * Get the actual quarter numbers for display
     * Returns array with quarter numbers and values
     */
    public function getQuarterDetails()
    {
        if ($this->semester === '1st') {
            return [
                'q1' => ['number' => 1, 'value' => $this->first_quarter],
                'q2' => ['number' => 2, 'value' => $this->second_quarter]
            ];
        } else {
            return [
                'q3' => ['number' => 3, 'value' => $this->first_quarter],
                'q4' => ['number' => 4, 'value' => $this->second_quarter]
            ];
        }
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
        $grade = $grade ?? $this->semester_grade;
        
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
        $grade = $grade ?? $this->semester_grade;
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

    /**
     * Static method to create or update grade record
     */
    public static function createOrUpdateGrade($data)
    {
        return self::updateOrCreate(
            [
                'student_id' => $data['student_id'],
                'subject_id' => $data['subject_id'],
                'semester' => $data['semester'],
                'school_year_id' => $data['school_year_id']
            ],
            $data
        );
    }

    /**
     * Get all grades for a student in a specific school year
     */
    public static function getStudentGrades($studentId, $schoolYearId)
    {
        return self::with(['subject', 'faculty'])
            ->where('student_id', $studentId)
            ->where('school_year_id', $schoolYearId)
            ->orderBy('semester')
            ->orderBy('subject_id')
            ->get();
    }

    /**
     * Get semester summary for a student
     */
    public static function getSemesterSummary($studentId, $semester, $schoolYearId)
    {
        $grades = self::with('subject')
            ->where('student_id', $studentId)
            ->where('semester', $semester)
            ->where('school_year_id', $schoolYearId)
            ->get();

        $totalGrades = $grades->where('semester_grade', '!=', null);
        $averageGrade = $totalGrades->avg('semester_grade');
        $passedSubjects = $totalGrades->where('semester_grade', '>=', 75)->count();
        $failedSubjects = $totalGrades->where('semester_grade', '<', 75)->count();

        return [
            'total_subjects' => $grades->count(),
            'completed_subjects' => $totalGrades->count(),
            'average_grade' => $averageGrade ? round($averageGrade, 2) : null,
            'passed_subjects' => $passedSubjects,
            'failed_subjects' => $failedSubjects,
            'grades' => $grades
        ];
    }
}
