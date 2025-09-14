<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $table = 'student_personal_info';

    protected $fillable = [
        'user_id',
        'school_year',
        'lrn',
        'grade_level',
        'nongraded',
        'psa',
        'extension_name',
        'birthdate',
        'age',
        'sex',
        'birth_place',
        'address',
        'religion',
        'mother_tongue',
        'ip_community',
        'four_ps',
        'special_needs',
        'pwd_id',
        'last_grade',
        'last_sy',
        'psa_birth_certificate',
        'report_card',
        'image',
        'hs_grade',
        'strand_id',
        'section_id',
        'school_year_id',
        'strand_preferences',
        'learning_modalities',
        'enrollment_status',
        'coordinator_notes',
        'reviewed_at',
        'reviewed_by',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the strand that the student is enrolled in.
     */
    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    /**
     * Get the student's strand preferences as collection of Strand models.
     */
    public function getStrandPreferencesAttribute()
    {
        if (!$this->attributes['strand_preferences']) {
            return collect();
        }
        
        $strandIds = json_decode($this->attributes['strand_preferences'], true) ?? [];
        return Strand::whereIn('id', $strandIds)->get();
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function strandPreferences()
    {
        return $this->hasMany(StudentStrandPreference::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    // Removed personalInfo relationship - data is now in this model


    protected $casts = [
        'learning_modalities' => 'array',
        'strand_preferences' => 'array',
        'reviewed_at' => 'datetime',
        'birthdate' => 'date',
        'age' => 'integer',
    ];

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }


    public function scopeByEnrollmentStatus($query, $status)
    {
        return $query->where('enrollment_status', $status);
    }
}
