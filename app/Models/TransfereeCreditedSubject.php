<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransfereeCreditedSubject extends Model
{
    use HasFactory;

    protected $table = 'transferee_credited_subjects';

    protected $fillable = [
        'student_id',
        'subject_id',
        'grade',
        'semester',
        'school_year',
        'remarks'
    ];

    protected $casts = [
        'grade' => 'decimal:2',
    ];

    /**
     * Get the student who received credit for this subject
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the subject that was credited
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Scope to filter by semester
     */
    public function scopeBySemester($query, $semester)
    {
        return $query->where('semester', $semester);
    }

    /**
     * Scope to filter by school year
     */
    public function scopeBySchoolYear($query, $schoolYear)
    {
        return $query->where('school_year', $schoolYear);
    }

    /**
     * Scope to filter by student
     */
    public function scopeByStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /**
     * Get the letter grade equivalent
     */
    public function getLetterGradeAttribute()
    {
        $grade = $this->grade;
        
        if ($grade >= 90) return 'A';
        if ($grade >= 85) return 'B';
        if ($grade >= 80) return 'C';
        if ($grade >= 75) return 'D';
        return 'F';
    }

    /**
     * Check if the grade is passing
     */
    public function getIsPassingAttribute()
    {
        return $this->grade >= 75;
    }

    /**
     * Get formatted grade with letter equivalent
     */
    public function getFormattedGradeAttribute()
    {
        return number_format($this->grade, 2) . ' (' . $this->letter_grade . ')';
    }
}
