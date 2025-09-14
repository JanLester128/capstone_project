<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Semester extends Model
{
    use HasFactory;

    protected $table = 'school_years';

    protected $fillable = [
        'year_start',
        'year_end', 
        'semester',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function classes()
    {
        return $this->hasMany(ClassSchedule::class, 'school_year_id');
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class, 'school_year_id');
    }

    // Get the currently active semester
    public static function getActive()
    {
        return static::where('is_active', true)->first();
    }

    // Activate this semester (deactivates all others)
    public function activate()
    {
        // Deactivate all other semesters
        static::where('is_active', true)->update(['is_active' => false]);
        
        // Activate this semester
        $this->update(['is_active' => true]);
    }

    // Get formatted school year display
    public function getSchoolYearAttribute()
    {
        return $this->year_start . '-' . $this->year_end;
    }
}
