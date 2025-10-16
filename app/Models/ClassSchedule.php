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
        'day_of_week',
        'start_time',
        'end_time',
        'duration',
        'semester',
        'school_year_id',
        'is_active',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'duration' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get the section that owns the class.
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Get the subject that owns the class.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the faculty that teaches the class.
     */
    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    /**
     * Get the school year that owns the class.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the class details for this class.
     */
    public function classDetails()
    {
        return $this->hasMany(ClassDetail::class, 'class_id');
    }

    /**
     * Get the grades for this class.
     */
    public function grades()
    {
        return $this->hasMany(Grade::class, 'class_id');
    }
}
