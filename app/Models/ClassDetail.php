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

    // Access student through enrollment relationship
    public function student()
    {
        return $this->hasOneThrough(
            User::class,
            Enrollment::class,
            'id', // Foreign key on enrollments table
            'id', // Foreign key on users table
            'enrollment_id', // Local key on class_details table
            'student_id' // Local key on enrollments table
        );
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

    public function scopeForEnrollment($query, $enrollmentId)
    {
        return $query->where('enrollment_id', $enrollmentId);
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

    public function getStrandNameAttribute()
    {
        return $this->enrollment && $this->enrollment->strand ? $this->enrollment->strand->name : 'Unknown Strand';
    }
}
