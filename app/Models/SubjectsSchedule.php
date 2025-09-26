<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubjectsSchedule extends Model
{
    use HasFactory;

    protected $table = 'subjects_schedule';

    protected $fillable = [
        'subject_id',
        'section_id',
        'school_year_id',
        'semester',
        'quarter',
        'day_of_week',
        'start_time',
        'end_time',
        'room',
        'faculty_id',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
    ];

    // Relationships
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

    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForSemester($query, $semester)
    {
        return $query->where(function($q) use ($semester) {
            $q->where('semester', $semester)
              ->orWhere('semester', 'both');
        });
    }

    public function scopeForQuarter($query, $quarter)
    {
        return $query->where(function($q) use ($quarter) {
            $q->where('quarter', $quarter)
              ->orWhere('quarter', 'all');
        });
    }

    public function scopeForDay($query, $day)
    {
        return $query->where('day_of_week', $day);
    }

    // Helper methods
    public function getTimeRangeAttribute()
    {
        return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
    }

    public function getFullScheduleAttribute()
    {
        return $this->day_of_week . ' ' . $this->time_range . ' (' . $this->room . ')';
    }

    // Check if schedule conflicts with another schedule
    public function conflictsWith($otherSchedule)
    {
        return $this->section_id === $otherSchedule->section_id &&
               $this->day_of_week === $otherSchedule->day_of_week &&
               $this->start_time < $otherSchedule->end_time &&
               $this->end_time > $otherSchedule->start_time;
    }

    // Get all schedules for a section in current academic year
    public static function getForSection($sectionId, $semester = null)
    {
        $currentAcademicYear = SchoolYear::getCurrentAcademicYear();
        
        if (!$currentAcademicYear) {
            return collect();
        }

        $query = static::where('section_id', $sectionId)
                      ->where('school_year_id', $currentAcademicYear->id)
                      ->active()
                      ->with(['subject', 'faculty']);

        if ($semester) {
            $query->forSemester($semester);
        }

        return $query->orderBy('day_of_week')
                    ->orderBy('start_time')
                    ->get();
    }
}
