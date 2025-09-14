<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'year_start',
        'year_end',
        'semester',
        'start_date',
        'end_date',
        'is_active',
        'current_semester'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
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
        
        return now()->isAfter($this->end_date);
    }

    // Get all expired school years
    public static function getExpired()
    {
        return static::whereNotNull('end_date')
                    ->whereDate('end_date', '<', now())
                    ->get();
    }

    // Get all active but expired school years
    public static function getActiveExpired()
    {
        return static::where('is_active', true)
                    ->whereNotNull('end_date')
                    ->whereDate('end_date', '<', now())
                    ->get();
    }
}
