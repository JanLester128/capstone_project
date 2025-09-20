<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_id',
        'student_id',
        'strand_id',
        'section_id',
        'school_year_id',
        'coordinator_notes',
        'enrollment_status',
        'approved_by',
        'approved_at',
        'is_enrolled',
        'enrolled_at'
    ];

    protected $casts = [
        'is_enrolled' => 'boolean',
        'enrolled_at' => 'datetime',
        'approved_at' => 'datetime'
    ];

    // Relationships
    public function classSchedule()
    {
        return $this->belongsTo(ClassSchedule::class, 'class_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Scopes
    public function scopeEnrolled($query)
    {
        return $query->where('is_enrolled', true);
    }

    public function scopeForSection($query, $sectionId)
    {
        return $query->where('section_id', $sectionId);
    }

    public function scopeForClass($query, $classId)
    {
        return $query->where('class_id', $classId);
    }

    public function scopeForStrand($query, $strandId)
    {
        return $query->where('strand_id', $strandId);
    }

    public function scopeForSchoolYear($query, $schoolYearId)
    {
        return $query->where('school_year_id', $schoolYearId);
    }

    public function scopeByEnrollmentStatus($query, $status)
    {
        return $query->where('enrollment_status', $status);
    }

    // Helper methods
    public function getStudentNameAttribute()
    {
        return $this->student ? $this->student->name : 'Unknown Student';
    }

    public function getSubjectNameAttribute()
    {
        return $this->classSchedule && $this->classSchedule->subject ? $this->classSchedule->subject->name : 'Unknown Subject';
    }

    public function isPending()
    {
        return $this->enrollment_status === 'pending';
    }

    public function isApproved()
    {
        return $this->enrollment_status === 'approved';
    }

    public function isRejected()
    {
        return $this->enrollment_status === 'rejected';
    }
}
