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
        'lrn',
        'grade_level',
        'birthdate',
        'contact_number',
        'guardian_name',
        'guardian_contact',
        'guardian_relationship',
        'emergency_contact_name',
        'emergency_contact_number',
        'emergency_contact_relationship',
        'section_id',
        'strand_id',
        'school_year_id',
        'student_status',
        'psa_birth_certificate',
        'report_card'
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
     * Get the section for this student
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Get the strand for this student
     */
    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    /**
     * Get the school year for this student
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the enrollments for this student
     */
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'student_id');
    }
}
