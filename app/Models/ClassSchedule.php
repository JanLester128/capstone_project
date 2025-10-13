<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassSchedule extends Model
{
    use HasFactory;

    protected $table = 'class';

    protected $fillable = [
        'section_id',
        'subject_id',
        'faculty_id',
        'school_year_id',
        'day_of_week',
        'start_time',
        'end_time',
        'duration',
        'semester',
        'is_active'
    ];

    protected $casts = [
        'duration' => 'integer',
        'is_active' => 'boolean'
    ];

    // Relationships

    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    // Relationship to enrolled students through class_details
    public function classDetails()
    {
        return $this->hasMany(ClassDetail::class, 'class_id');
    }

    public function enrolledStudents()
    {
        return $this->hasManyThrough(Enrollment::class, ClassDetail::class, 'class_id', 'id', 'id', 'enrollment_id');
    }

    // Scopes
    public function scopeForSchoolYear($query, $schoolYearId)
    {
        return $query->where('school_year_id', $schoolYearId);
    }

    public function scopeForSemester($query, $semester)
    {
        return $query->where('semester', $semester);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForDay($query, $day)
    {
        return $query->where('day_of_week', $day);
    }

    // Helper methods
    public function getTimeRangeAttribute()
    {
        return $this->getFormattedStartTimeAttribute() . ' - ' . $this->getFormattedEndTimeAttribute();
    }

    public function getFormattedStartTimeAttribute()
    {
        return date('H:i', strtotime($this->start_time));
    }

    public function getFormattedEndTimeAttribute()
    {
        return date('H:i', strtotime($this->end_time));
    }

    public function getFacultyNameAttribute()
    {
        return $this->faculty ? ($this->faculty->firstname . ' ' . $this->faculty->lastname) : 'No Faculty Assigned';
    }

    public function getEnrolledStudentsCountAttribute()
    {
        return $this->classDetails()->count();
    }

    public function getDurationInHoursAttribute()
    {
        return round($this->duration / 60, 1) . ' hrs';
    }
}
