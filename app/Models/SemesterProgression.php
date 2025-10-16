<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SemesterProgression extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'from_enrollment_id',
        'to_enrollment_id',
        'school_year_id',
        'from_semester',
        'to_semester',
        'from_grade_level',
        'to_grade_level',
        'progression_type',
        'status',
        'completion_requirements',
        'coordinator_notes',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'completion_requirements' => 'array',
        'processed_at' => 'datetime',
    ];

    /**
     * Get the student that owns the progression.
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the enrollment this progression is from.
     */
    public function fromEnrollment()
    {
        return $this->belongsTo(Enrollment::class, 'from_enrollment_id');
    }

    /**
     * Get the enrollment this progression is to.
     */
    public function toEnrollment()
    {
        return $this->belongsTo(Enrollment::class, 'to_enrollment_id');
    }

    /**
     * Get the school year.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the coordinator who processed this progression.
     */
    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /**
     * Check if progression is for semester advancement.
     */
    public function isSemesterAdvancement()
    {
        return $this->progression_type === 'semester_advance';
    }

    /**
     * Check if progression is for grade advancement.
     */
    public function isGradeAdvancement()
    {
        return $this->progression_type === 'grade_advance';
    }

    /**
     * Check if progression is for summer remedial.
     */
    public function isSummerRemedial()
    {
        return $this->progression_type === 'summer_remedial';
    }

    /**
     * Check if progression is approved.
     */
    public function isApproved()
    {
        return $this->status === 'approved';
    }

    /**
     * Check if progression is completed.
     */
    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    /**
     * Scope for filtering by progression type.
     */
    public function scopeByType($query, $type)
    {
        return $query->where('progression_type', $type);
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
}
