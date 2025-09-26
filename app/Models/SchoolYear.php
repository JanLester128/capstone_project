<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class SchoolYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'year',
        'year_start',
        'year_end',
        'semester',
        'start_date',
        'end_date',
        'is_active',
        'current_semester',
        'enrollment_open',
        'enrollment_start',
        'enrollment_end',
        'is_current_academic_year',
        'allow_grade_progression'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'enrollment_open' => 'boolean',
        'is_current_academic_year' => 'boolean',
        'allow_grade_progression' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
        'enrollment_start' => 'datetime',
        'enrollment_end' => 'datetime',
    ];

    public function students()
    {
        return $this->hasMany(Student::class);
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    // Get the currently active school year/semester
    public static function getActive()
    {
        return static::where('is_active', true)->first();
    }

    // Activate this school year/semester (deactivates all others)
    public function activate()
    {
        // Deactivate all other school years/semesters
        static::where('is_active', true)->update(['is_active' => false]);
        
        // Activate this school year/semester
        $this->update(['is_active' => true]);
    }

    // Format the school year as "2024-2025"
    public function getYearAttribute()
    {
        return $this->year_start . '-' . $this->year_end;
    }

    // Get full display name with semester
    public function getFullNameAttribute()
    {
        return $this->year . ' - ' . $this->semester;
    }

    // Check if this school year has expired
    public function isExpired()
    {
        if (!$this->end_date) {
            return false;
        }
        
        $currentDate = now()->toDateString();
        $endDateString = $this->end_date ? $this->end_date->toDateString() : null;
        
        // Compare dates only (not time) - semester expires at end of the end_date
        return $currentDate > $endDateString;
    }

    // Get all expired school years
    public static function getExpired()
    {
        return static::whereNotNull('end_date')
                    ->whereDate('end_date', '<', now()->toDateString())
                    ->get();
    }

    // Get all active but expired school years
    public static function getActiveExpired()
    {
        return static::where('is_active', true)
                    ->whereNotNull('end_date')
                    ->whereDate('end_date', '<', now()->toDateString())
                    ->get();
    }

    // Philippine SHS System Methods

    // Get current academic year (for schedule display - always visible)
    public static function getCurrentAcademicYear()
    {
        return static::where('is_current_academic_year', true)->first();
    }

    // Get school year with open enrollment (for student enrollment)
    public static function getEnrollmentOpen()
    {
        return static::where('enrollment_open', true)
                    ->where(function($query) {
                        $query->whereNull('enrollment_start')
                              ->orWhere('enrollment_start', '<=', now());
                    })
                    ->where(function($query) {
                        $query->whereNull('enrollment_end')
                              ->orWhere('enrollment_end', '>=', now());
                    })
                    ->first();
    }

    // Check if enrollment is currently open
    public function isEnrollmentOpen()
    {
        if (!$this->enrollment_open) {
            return false;
        }

        $now = now();
        
        // Check enrollment start date
        if ($this->enrollment_start && $now->isBefore($this->enrollment_start)) {
            return false;
        }

        // Check enrollment end date
        if ($this->enrollment_end && $now->isAfter($this->enrollment_end)) {
            return false;
        }

        return true;
    }

    // Get school year that allows grade progression
    public static function getProgressionAllowed()
    {
        return static::where('allow_grade_progression', true)->first();
    }

    // Set as current academic year (deactivates others)
    public function setAsCurrentAcademicYear()
    {
        // Deactivate all other academic years
        static::where('is_current_academic_year', true)->update(['is_current_academic_year' => false]);
        
        // Set this as current academic year
        $this->update(['is_current_academic_year' => true]);
    }

    // Open enrollment for this school year
    public function openEnrollment($startDate = null, $endDate = null)
    {
        // Close enrollment for all other school years
        static::where('enrollment_open', true)->update(['enrollment_open' => false]);
        
        // Open enrollment for this school year
        $this->update([
            'enrollment_open' => true,
            'enrollment_start' => $startDate,
            'enrollment_end' => $endDate
        ]);
    }

    // Enable grade progression for this school year
    public function enableGradeProgression()
    {
        // Disable progression for all other school years
        static::where('allow_grade_progression', true)->update(['allow_grade_progression' => false]);
        
        // Enable progression for this school year
        $this->update(['allow_grade_progression' => true]);
    }

    // Get full academic year display (e.g., "2024-2025 Academic Year")
    public function getAcademicYearDisplayAttribute()
    {
        return $this->year . ' Academic Year';
    }

    // Check if this is a complete academic year (both semesters)
    public function isCompleteAcademicYear()
    {
        return $this->semester === 'Full Year' || $this->semester === 'Both Semesters';
    }
}
