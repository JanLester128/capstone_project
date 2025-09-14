<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_id',
        'enrollment_id',
        'section_id',
        'is_enrolled',
        'enrolled_at'
    ];

    protected $casts = [
        'is_enrolled' => 'boolean',
        'enrolled_at' => 'datetime'
    ];

    // Relationships
    public function classSchedule()
    {
        return $this->belongsTo(ClassSchedule::class, 'class_id');
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
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

    // Helper methods
    public function getStudentNameAttribute()
    {
        return $this->enrollment ? $this->enrollment->full_name : 'Unknown Student';
    }

    public function getSubjectNameAttribute()
    {
        return $this->classSchedule && $this->classSchedule->subject ? $this->classSchedule->subject->name : 'Unknown Subject';
    }
}
