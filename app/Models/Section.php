<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_name',
        'year_level',
        'strand_id',
        'adviser_id',
        'school_year_id',
        'max_capacity',
        'is_full',
        'capacity_reached_at',
    ];

    protected $casts = [
        'year_level' => 'integer',
        'max_capacity' => 'integer',
        'is_full' => 'boolean',
        'capacity_reached_at' => 'datetime',
    ];

    /**
     * Get the strand that owns the section.
     */
    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    /**
     * Get the adviser that owns the section.
     */
    public function adviser()
    {
        return $this->belongsTo(User::class, 'adviser_id');
    }

    /**
     * Get the school year that owns the section.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the classes for this section.
     */
    public function classes()
    {
        return $this->hasMany(ClassSchedule::class, 'section_id');
    }

    /**
     * Get the class details for this section.
     */
    public function classDetails()
    {
        return $this->hasMany(ClassDetail::class);
    }

    /**
     * Get the enrollments assigned to this section.
     */
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'assigned_section_id');
    }

    /**
     * Get the display name for the section.
     */
    public function getDisplayNameAttribute()
    {
        return 'Grade ' . $this->year_level . ' - ' . $this->section_name;
    }

    /**
     * Get the current enrollment count for this section.
     */
    public function getCurrentEnrollmentCount()
    {
        return $this->enrollments()
            ->whereIn('status', ['enrolled', 'approved'])
            ->count();
    }

    /**
     * Get the available slots in this section.
     */
    public function getAvailableSlots()
    {
        return max(0, $this->max_capacity - $this->getCurrentEnrollmentCount());
    }

    /**
     * Check if the section has available slots.
     */
    public function hasAvailableSlots()
    {
        return $this->getAvailableSlots() > 0;
    }

    /**
     * Check if the section is at capacity.
     */
    public function isAtCapacity()
    {
        return $this->getCurrentEnrollmentCount() >= $this->max_capacity;
    }

    /**
     * Update the section's full status based on current enrollment.
     */
    public function updateCapacityStatus()
    {
        $isAtCapacity = $this->isAtCapacity();
        
        if ($isAtCapacity && !$this->is_full) {
            $this->update([
                'is_full' => true,
                'capacity_reached_at' => now()
            ]);
        } elseif (!$isAtCapacity && $this->is_full) {
            $this->update([
                'is_full' => false,
                'capacity_reached_at' => null
            ]);
        }
    }

    /**
     * Get capacity status information.
     */
    public function getCapacityStatusAttribute()
    {
        $current = $this->getCurrentEnrollmentCount();
        $max = $this->max_capacity;
        $available = $this->getAvailableSlots();
        
        return [
            'current' => $current,
            'max' => $max,
            'available' => $available,
            'percentage' => $max > 0 ? round(($current / $max) * 100, 1) : 0,
            'is_full' => $this->is_full,
            'is_near_full' => $available <= 5 && $available > 0,
        ];
    }
}
