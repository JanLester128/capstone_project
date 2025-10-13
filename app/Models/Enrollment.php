<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_personal_info_id',  // Main reference to student data
        'student_id',                // Backward compatibility
        'school_year_id',
        'strand_id',                 // Assigned strand (set when approved)
        'assigned_section_id',       // Assigned section (set when approved)
        'status',                    // pending, approved, rejected, enrolled
        'coordinator_id',            // Who reviewed the enrollment
        'coordinator_notes',         // Coordinator's review notes
        'enrollment_date',
        'submitted_at',
        'reviewed_at',
        // Manual enrollment fields
        'enrolled_by',
        'notes',
        // Summer enrollment fields
        'enrollment_type',
        'summer_subjects',
        'schedule_preference',
        'academic_year_status',
        // SHS Grade 11-12 fields
        'intended_grade_level',      // MISSING FIELD - CRITICAL FIX
        'grade_level',
        'has_grade_11_enrollment',
        'previous_enrollment_id',
        'enrollment_method',
        'cor_generated',
        'cor_generated_at',
        'cor_subjects',
        'last_school_attended',
    ];

    protected $casts = [
        'documents' => 'array',
        'summer_subjects' => 'array',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'enrollment_date' => 'datetime',
        'status' => 'string',
        'enrollment_type' => 'string',
        'academic_year_status' => 'string',
        'cor_generated' => 'boolean',
        'cor_generated_at' => 'datetime',
        'cor_subjects' => 'array',
        'has_grade_11_enrollment' => 'boolean',
    ];

    // Relationships
    public function studentPersonalInfo()
    {
        return $this->belongsTo(StudentPersonalInfo::class, 'student_personal_info_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function coordinator()
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function enrolledBy()
    {
        return $this->belongsTo(User::class, 'enrolled_by');
    }

    public function classDetails()
    {
        return $this->hasMany(ClassDetail::class, 'enrollment_id');
    }

    // Strand choice relationships
    public function firstStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'first_strand_choice_id');
    }

    public function secondStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'second_strand_choice_id');
    }

    public function thirdStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'third_strand_choice_id');
    }

    public function assignedStrand()
    {
        return $this->belongsTo(Strand::class, 'strand_id');
    }

    public function assignedSection()
    {
        return $this->belongsTo(Section::class, 'assigned_section_id');
    }

    public function strandPreferences()
    {
        return $this->hasMany(StudentStrandPreference::class, 'enrollment_id')
                    ->orderBy('preference_order');
    }

    // Helper method to get the assigned/approved strand
    public function getAssignedStrand()
    {
        // Return the assigned strand for approved enrollments, or first choice for pending
        return $this->assignedStrand ?: $this->strandPreferences()->first()?->strand;
    }

    // Helper methods for strand preferences
    public function getFirstStrandChoice()
    {
        return $this->strandPreferences()->where('preference_order', 1)->first()?->strand;
    }

    public function getSecondStrandChoice()
    {
        return $this->strandPreferences()->where('preference_order', 2)->first()?->strand;
    }

    public function getThirdStrandChoice()
    {
        return $this->strandPreferences()->where('preference_order', 3)->first()?->strand;
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeForSchoolYear($query, $schoolYearId)
    {
        return $query->where('school_year_id', $schoolYearId);
    }

    // SHS Grade 11-12 relationships
    public function previousEnrollment()
    {
        return $this->belongsTo(Enrollment::class, 'previous_enrollment_id');
    }

    public function grade12Enrollment()
    {
        return $this->hasOne(Enrollment::class, 'previous_enrollment_id');
    }

    // Scopes for Grade 11-12
    public function scopeGrade11($query)
    {
        return $query->where('grade_level', 'Grade 11');
    }

    public function scopeGrade12($query)
    {
        return $query->where('grade_level', 'Grade 12');
    }

    public function scopeEligibleForGrade12($query)
    {
        return $query->where('grade_level', 'Grade 11')
                    ->where('status', 'enrolled')
                    ->whereDoesntHave('grade12Enrollment');
    }
}
