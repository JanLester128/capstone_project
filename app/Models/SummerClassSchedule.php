<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SummerClassSchedule extends Model
{
    use HasFactory;

    protected $table = 'summer_class_schedules';

    protected $fillable = [
        'enrollment_id',
        'subject_id',
        'faculty_id',
        'school_year_id',
        'schedule_type',
        'class_days',
        'start_time',
        'end_time',
        'room',
        'start_date',
        'end_date',
        'total_hours',
        'is_active'
    ];

    protected $casts = [
        'class_days' => 'array',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'start_date' => 'date',
        'end_date' => 'date',
        'total_hours' => 'integer',
        'is_active' => 'boolean'
    ];

    /**
     * Get the enrollment that owns the summer schedule.
     */
    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * Get the subject for this schedule.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the faculty member assigned to this schedule.
     */
    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    /**
     * Get the school year for this schedule.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the student through enrollment.
     */
    public function student()
    {
        return $this->hasOneThrough(User::class, Enrollment::class, 'id', 'id', 'enrollment_id', 'student_id');
    }

    /**
     * Scope for active schedules.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for schedules by faculty.
     */
    public function scopeByFaculty($query, $facultyId)
    {
        return $query->where('faculty_id', $facultyId);
    }

    /**
     * Scope for schedules by school year.
     */
    public function scopeBySchoolYear($query, $schoolYearId)
    {
        return $query->where('school_year_id', $schoolYearId);
    }

    /**
     * Scope for schedules within date range.
     */
    public function scopeWithinDateRange($query, $startDate, $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('start_date', [$startDate, $endDate])
              ->orWhereBetween('end_date', [$startDate, $endDate])
              ->orWhere(function ($q2) use ($startDate, $endDate) {
                  $q2->where('start_date', '<=', $startDate)
                     ->where('end_date', '>=', $endDate);
              });
        });
    }

    /**
     * Get formatted time range.
     */
    public function getTimeRangeAttribute()
    {
        return $this->start_time->format('g:i A') . ' - ' . $this->end_time->format('g:i A');
    }

    /**
     * Get formatted date range.
     */
    public function getDateRangeAttribute()
    {
        return $this->start_date->format('M j, Y') . ' - ' . $this->end_date->format('M j, Y');
    }

    /**
     * Get formatted class days.
     */
    public function getFormattedClassDaysAttribute()
    {
        if (!$this->class_days || !is_array($this->class_days)) {
            return 'TBA';
        }
        
        return implode(', ', $this->class_days);
    }

    /**
     * Check if schedule conflicts with another schedule for the same faculty.
     */
    public function hasConflictWith($otherSchedule)
    {
        // Check date range overlap
        $thisStart = $this->start_date;
        $thisEnd = $this->end_date;
        $otherStart = $otherSchedule->start_date;
        $otherEnd = $otherSchedule->end_date;

        $dateOverlap = ($thisStart <= $otherEnd) && ($thisEnd >= $otherStart);

        if (!$dateOverlap) {
            return false;
        }

        // Check if they share any common days
        $thisDays = $this->class_days ?? [];
        $otherDays = $otherSchedule->class_days ?? [];
        $commonDays = array_intersect($thisDays, $otherDays);

        if (empty($commonDays)) {
            return false;
        }

        // Check time overlap
        $thisStartTime = strtotime($this->start_time);
        $thisEndTime = strtotime($this->end_time);
        $otherStartTime = strtotime($otherSchedule->start_time);
        $otherEndTime = strtotime($otherSchedule->end_time);

        return ($thisStartTime < $otherEndTime) && ($thisEndTime > $otherStartTime);
    }
}
