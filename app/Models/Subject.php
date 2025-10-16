<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'semester',
        'year_level',
        'is_summer_subject',
        'strand_id',
        'school_year_id',
        'faculty_id',
    ];

    protected $casts = [
        'is_summer_subject' => 'boolean',
        'semester' => 'integer',
    ];

    /**
     * Get the strand that owns the subject.
     */
    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    /**
     * Get the school year that owns the subject.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the faculty that teaches the subject.
     */
    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    /**
     * Get the classes for this subject.
     */
    public function classes()
    {
        return $this->hasMany(ClassSchedule::class, 'subject_id');
    }

    /**
     * Get the grades for this subject.
     */
    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get the transferee subject credits for this subject.
     */
    public function transfereeCredits()
    {
        return $this->hasMany(TransfereeSubjectCredit::class);
    }
}
