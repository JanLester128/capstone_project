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
        'enrollment_id',
        'section_id',
        'enrollment_status',
        'is_enrolled',
        'enrolled_at',
    ];

    protected $casts = [
        'is_enrolled' => 'boolean',
        'enrolled_at' => 'datetime',
    ];

    /**
     * Get the class that owns the class detail.
     */
    public function class()
    {
        return $this->belongsTo(ClassSchedule::class, 'class_id');
    }

    /**
     * Get the student (user) that owns the class detail.
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the user (alias for student relationship).
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the enrollment that owns the class detail.
     */
    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * Get the section that owns the class detail.
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Scope to get enrolled class details.
     */
    public function scopeEnrolled($query)
    {
        return $query->where('is_enrolled', true);
    }
}
