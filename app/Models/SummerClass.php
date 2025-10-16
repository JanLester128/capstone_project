<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SummerClass extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrollment_id',
        'student_id',
        'school_year_id',
        'section_id',
        'subjects_to_retake',
        'start_date',
        'end_date',
        'status',
        'final_grades',
        'passed_all_subjects',
        'coordinator_notes',
        'enrolled_by',
    ];

    protected $casts = [
        'subjects_to_retake' => 'array',
        'final_grades' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'passed_all_subjects' => 'boolean',
    ];

    /**
     * Get the enrollment that owns the summer class.
     */
    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * Get the student that owns the summer class.
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the school year.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the section assigned for summer class.
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Get the coordinator who enrolled the student.
     */
    public function enrolledBy()
    {
        return $this->belongsTo(User::class, 'enrolled_by');
    }

    /**
     * Check if summer class is ongoing.
     */
    public function isOngoing()
    {
        return $this->status === 'ongoing';
    }

    /**
     * Check if summer class is completed.
     */
    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    /**
     * Check if student passed all subjects.
     */
    public function hasPassedAllSubjects()
    {
        return $this->passed_all_subjects;
    }

    /**
     * Get the number of subjects to retake.
     */
    public function getSubjectCount()
    {
        return count($this->subjects_to_retake ?? []);
    }

    /**
     * Scope for filtering by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for current school year.
     */
    public function scopeCurrentSchoolYear($query)
    {
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        return $query->where('school_year_id', $currentSchoolYear->id ?? 0);
    }

    /**
     * Scope for active summer classes.
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['enrolled', 'ongoing']);
    }
}
