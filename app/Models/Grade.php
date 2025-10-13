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
        'first_quarter',      // Q1 grade (1st semester only)
        'second_quarter',     // Q2 grade (1st semester only)
        'third_quarter',      // Q3 grade (2nd semester only)
        'fourth_quarter',     // Q4 grade (2nd semester only)
        'semester_grade',     // Average of semester quarters
        'status',
        'remarks',
        'approval_status',
        'approved_by',
        'approved_at',
        'submitted_for_approval_at'
    ];

    protected $casts = [
        'first_quarter' => 'decimal:2',
        'second_quarter' => 'decimal:2',
        'third_quarter' => 'decimal:2',      // FIXED: Added missing cast
        'fourth_quarter' => 'decimal:2',     // FIXED: Added missing cast
        'semester_grade' => 'decimal:2',
        'approved_at' => 'datetime',
        'submitted_for_approval_at' => 'datetime',
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
     * Calculate semester grade based on semester-specific quarters
     * 1st Semester: Average of Q1 and Q2
     * 2nd Semester: Average of Q3 and Q4
     */
    public function calculateSemesterGrade()
    {
        $quarters = [];
        
        if ($this->semester === '1st') {
            // 1st Semester: Only Q1 and Q2
            if ($this->first_quarter !== null && $this->first_quarter > 0) {
                $quarters[] = $this->first_quarter;
            }
            if ($this->second_quarter !== null && $this->second_quarter > 0) {
                $quarters[] = $this->second_quarter;
            }
        } elseif ($this->semester === '2nd') {
            // 2nd Semester: Only Q3 and Q4
            if ($this->third_quarter !== null && $this->third_quarter > 0) {
                $quarters[] = $this->third_quarter;
            }
            if ($this->fourth_quarter !== null && $this->fourth_quarter > 0) {
                $quarters[] = $this->fourth_quarter;
            }
        }

        if (empty($quarters)) {
            return null;
        }

        return round(array_sum($quarters) / count($quarters), 2);
    }

    /**
     * Get semester-specific quarter details for display
     * Returns only the quarters valid for the current semester
     */
    public function getQuarterDetails()
    {
        if ($this->semester === '1st') {
            return [
                'q1' => ['number' => 1, 'value' => $this->first_quarter, 'enabled' => true],
                'q2' => ['number' => 2, 'value' => $this->second_quarter, 'enabled' => true],
                'q3' => ['number' => 3, 'value' => null, 'enabled' => false],
                'q4' => ['number' => 4, 'value' => null, 'enabled' => false]
            ];
        } elseif ($this->semester === '2nd') {
            return [
                'q1' => ['number' => 1, 'value' => null, 'enabled' => false],
                'q2' => ['number' => 2, 'value' => null, 'enabled' => false],
                'q3' => ['number' => 3, 'value' => $this->third_quarter, 'enabled' => true],
                'q4' => ['number' => 4, 'value' => $this->fourth_quarter, 'enabled' => true]
            ];
        }
        
        // Default: all quarters disabled
        return [
            'q1' => ['number' => 1, 'value' => $this->first_quarter, 'enabled' => false],
            'q2' => ['number' => 2, 'value' => $this->second_quarter, 'enabled' => false],
            'q3' => ['number' => 3, 'value' => $this->third_quarter, 'enabled' => false],
            'q4' => ['number' => 4, 'value' => $this->fourth_quarter, 'enabled' => false]
        ];
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
     * Scope for pending approval grades
     */
    public function scopePendingApproval($query)
    {
        return $query->where('approval_status', 'pending_approval')
                    ->whereNotNull('submitted_for_approval_at');
    }

    /**
     * Scope for approved grades
     */
    public function scopeApproved($query)
    {
        return $query->where('approval_status', 'approved');
    }

    /**
     * Scope for rejected grades
     */
    public function scopeRejected($query)
    {
        return $query->where('approval_status', 'rejected');
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

    // ✅ MISSING METHODS - Added for grade approval system

    /**
     * Submit grade for approval
     */
    public function submitForApproval()
    {
        $this->update([
            'approval_status' => 'pending_approval',
            'submitted_for_approval_at' => now(),
            'status' => 'pending_approval'
        ]);
        
        return $this;
    }

    /**
     * Approve grade
     */
    public function approve($approverId)
    {
        $this->update([
            'approval_status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
            'status' => 'approved'
        ]);
        
        return $this;
    }

    /**
     * Reject grade
     */
    public function reject($rejectedById)
    {
        $this->update([
            'approval_status' => 'rejected',
            'approved_by' => $rejectedById,
            'approved_at' => now(),
            'status' => 'rejected'
        ]);
        
        return $this;
    }

    /**
     * Check if grade is pending approval
     */
    public function isPendingApproval()
    {
        return $this->approval_status === 'pending_approval';
    }

    /**
     * Check if grade is approved
     */
    public function isApproved()
    {
        return $this->approval_status === 'approved';
    }

    /**
     * Check if grade is rejected
     */
    public function isRejected()
    {
        return $this->approval_status === 'rejected';
    }

    /**
     * Get approval status display text
     */
    public function getApprovalStatusText()
    {
        return match($this->approval_status) {
            'pending_approval' => 'Pending Approval',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            default => 'Draft'
        };
    }

    /**
     * Get all grades for a student that need approval
     */
    public static function getStudentGradesForApproval($studentId, $schoolYearId)
    {
        return self::with(['subject', 'faculty', 'class.section'])
            ->where('student_id', $studentId)
            ->where('school_year_id', $schoolYearId)
            ->where('approval_status', 'pending_approval')
            ->orderBy('semester')
            ->orderBy('subject_id')
            ->get();
    }
}
