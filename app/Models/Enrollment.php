<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'firstname',
        'lastname',
        'middlename',
        'lrn',
        'email',
        'phone',
        'birthdate',
        'birthplace',
        'sex',
        'religion',
        'address',
        'age',
        'mother_tongue',
        'is_ip_community',
        'is_4ps',
        'pwd_id',
        'grade_level',
        'last_school_attended',
        'last_grade_completed',
        'last_school_year',
        'first_strand_choice',
        'second_strand_choice',
        'third_strand_choice',
        'assigned_strand_id',
        'assigned_section_id',
        'student_photo',
        'psa_birth_certificate',
        'report_card',
        'status',
        'coordinator_id',
        'coordinator_notes',
        'school_year_id',
        'submitted_at',
        'reviewed_at'
    ];

    protected $casts = [
        'birthdate' => 'date',
        'is_ip_community' => 'boolean',
        'is_4ps' => 'boolean',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'status' => 'string'
    ];

    // Relationships
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function firstStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'first_strand_choice');
    }

    public function secondStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'second_strand_choice');
    }

    public function thirdStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'third_strand_choice');
    }

    public function assignedStrand()
    {
        return $this->belongsTo(Strand::class, 'assigned_strand_id');
    }

    public function assignedSection()
    {
        return $this->belongsTo(Section::class, 'assigned_section_id');
    }

    public function coordinator()
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function classDetails()
    {
        return $this->hasMany(ClassDetail::class);
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

    // Helper methods
    public function getFullNameAttribute()
    {
        return trim($this->firstname . ' ' . ($this->middlename ? $this->middlename . ' ' : '') . $this->lastname);
    }

    public function getStrandPreferencesAttribute()
    {
        $preferences = [];
        if ($this->firstStrandChoice) $preferences[] = $this->firstStrandChoice;
        if ($this->secondStrandChoice) $preferences[] = $this->secondStrandChoice;
        if ($this->thirdStrandChoice) $preferences[] = $this->thirdStrandChoice;
        return $preferences;
    }

    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function isRejected()
    {
        return $this->status === 'rejected';
    }
}
