<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'school_year_id',
        'first_strand_choice_id',
        'second_strand_choice_id',
        'third_strand_choice_id',
        'report_card',
        'documents',
        'status',
        'coordinator_id',
        'submitted_at',
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
