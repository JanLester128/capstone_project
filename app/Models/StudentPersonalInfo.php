<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentPersonalInfo extends Model
{
    use HasFactory;

    protected $table = 'student_personal_info';

    protected $fillable = [
        'user_id',
        // Personal information only (no academic/enrollment data)
        'birthdate',
        'age',
        'sex',
        'birth_place',
        'address',
        'religion',
        'contact_number',
        'guardian_name',
        'guardian_contact',
        'guardian_relationship',
        'emergency_contact_name',
        'emergency_contact_number',
        'emergency_contact_relationship',
        'ip_community',
        'four_ps',
        'special_needs',
        'pwd_id',
        'extension_name',
        'last_grade',
        'last_sy',
        'psa_birth_certificate',
        'image'
    ];

    protected $casts = [
        'birthdate' => 'date',
    ];

    /**
     * Get the user that owns the student personal info
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the strand preferences for this student
     */
    public function strandPreferences()
    {
        return $this->hasMany(StudentStrandPreference::class, 'student_personal_info_id')
                    ->orderBy('preference_order');
    }

    /**
     * Get the enrollments for this student
     */
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'student_personal_info_id');
    }

    /**
     * Get the current enrollment (most recent active enrollment)
     */
    public function currentEnrollment()
    {
        return $this->hasOne(Enrollment::class, 'student_personal_info_id')
                    ->where('status', 'enrolled')
                    ->latest();
    }

    /**
     * Get section via current enrollment
     */
    public function getSection()
    {
        return $this->currentEnrollment?->assignedSection;
    }

    /**
     * Get strand via current enrollment
     */
    public function getStrand()
    {
        return $this->currentEnrollment?->assignedStrand;
    }

    /**
     * Get school year via current enrollment
     */
    public function getSchoolYear()
    {
        return $this->currentEnrollment?->schoolYear;
    }
}
