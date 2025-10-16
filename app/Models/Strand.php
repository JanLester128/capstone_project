<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Strand extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the sections for this strand.
     */
    public function sections()
    {
        return $this->hasMany(Section::class);
    }

    /**
     * Get the subjects for this strand.
     */
    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    /**
     * Get the student strand preferences for this strand.
     */
    public function studentPreferences()
    {
        return $this->hasMany(StudentStrandPreference::class);
    }

    /**
     * Get the enrollments for this strand.
     */
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }
}
