<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Student;

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
        'semester',
        'status',
        'remarks',
        'approval_status',
        'approved_by',
        'approved_at',
        'approval_notes',
        'submitted_for_approval_at'
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

    // Relationships
    public function student() {
        return $this->belongsTo(Student::class, 'student_id');
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

    // Approval System Methods
    
    /**
     * Submit grade for approval
     */
    public function submitForApproval()
    {
        $this->update([
            'approval_status' => 'pending_approval',
            'submitted_for_approval_at' => now()
        ]);
        return $this;
    }

    /**
     * Approve the grade
     */
    public function approve($approverId, $notes = null)
    {
        $this->update([
            'approval_status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
            'approval_notes' => $notes
        ]);
        return $this;
    }

    /**
     * Reject the grade
     */
    public function reject($approverId, $notes = null)
    {
        $this->update([
            'approval_status' => 'rejected',
            'approved_by' => $approverId,
            'approved_at' => now(),
            'approval_notes' => $notes
        ]);
        return $this;
    }

    /**
     * Check if grade is approved
     */
    public function isApproved()
    {
        return $this->approval_status === 'approved';
    }

    /**
     * Check if grade is pending approval
     */
    public function isPendingApproval()
    {
        return $this->approval_status === 'pending_approval';
    }

    /**
     * Check if grade is rejected
     */
    public function isRejected()
    {
        return $this->approval_status === 'rejected';
    }

    /**
     * Scope for approved grades only
     */
    public function scopeApproved($query)
    {
        return $query->where('approval_status', 'approved');
    }

    /**
     * Scope for pending approval grades
     */
    public function scopePendingApproval($query)
    {
        return $query->where('approval_status', 'pending_approval');
    }

    /**
     * Scope for rejected grades
     */
    public function scopeRejected($query)
    {
        return $query->where('approval_status', 'rejected');
    }
}
