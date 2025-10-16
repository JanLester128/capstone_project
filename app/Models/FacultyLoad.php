<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FacultyLoad extends Model
{
    use HasFactory;

    protected $fillable = [
        'faculty_id',
        'school_year_id',
        'total_loads',
        'max_loads',
        'is_overloaded',
        'load_notes',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'is_overloaded' => 'boolean',
        'assigned_at' => 'datetime',
    ];

    /**
     * Get the faculty member for this load.
     */
    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    /**
     * Get the school year for this load.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the user who assigned this load.
     */
    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Get the classes for this faculty load.
     */
    public function classes()
    {
        return $this->hasMany(ClassSchedule::class, 'faculty_id', 'faculty_id')
                    ->where('school_year_id', $this->school_year_id);
    }

    /**
     * Check if faculty is overloaded.
     */
    public function checkOverload()
    {
        $this->is_overloaded = $this->total_loads > $this->max_loads;
        $this->save();
        
        return $this->is_overloaded;
    }

    /**
     * Update total loads count.
     */
    public function updateLoadCount()
    {
        $count = ClassSchedule::where('faculty_id', $this->faculty_id)
                          ->where('school_year_id', $this->school_year_id)
                          ->where('is_active', true)
                          ->count();
        
        $this->total_loads = $count;
        $this->checkOverload();
        
        return $this;
    }

    /**
     * Get remaining load capacity.
     */
    public function getRemainingLoadsAttribute()
    {
        return max(0, $this->max_loads - $this->total_loads);
    }

    /**
     * Get load utilization percentage.
     */
    public function getUtilizationPercentageAttribute()
    {
        return $this->max_loads > 0 ? round(($this->total_loads / $this->max_loads) * 100, 2) : 0;
    }
}
