<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'user_id',
        'school_year_id',
        'grade_level',
        'lrn',
        'strand_id',
        'section_id',
        'student_status',
        'enrollment_date',
        'student_type',
        'previous_school',
        'first_strand_choice_id',
        'second_strand_choice_id',
        'third_strand_choice_id',
        'report_card',
        'documents',
        'status',
        'coordinator_id',
        'submitted_at',
        // Manual enrollment fields
        'enrolled_by',
        'notes',
    ];

    protected $casts = [
        'documents' => 'array',
        'submitted_at' => 'datetime',
        'status' => 'string'
    ];

    // Relationships
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

    // Helper method to get the assigned/approved strand
    public function getAssignedStrand()
    {
        // Return the first strand choice as the assigned strand for enrolled students
        return $this->firstStrandChoice;
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
}
