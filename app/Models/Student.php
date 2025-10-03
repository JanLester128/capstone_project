<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Strand;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\StudentStrandPreference;

class Student extends Model
{
    use HasFactory;

    protected $table = 'student_personal_info';

    protected $fillable = [
        'user_id',
        'school_year',
        'lrn',
        'student_status',
        'grade_level',
        'extension_name',
        'birthdate',
        'age',
        'sex',
        'birth_place',
        'address',
        'religion',
        'ip_community',
        'four_ps',
        'pwd_id',
        'last_grade',
        'last_sy',
        'guardian_name',
        'guardian_contact',
        'last_school',
        'report_card',
        'image',
        'psa_birth_certificate',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'student_id', 'user_id');
    }

    public function classDetails()
    {
        return $this->hasMany(ClassDetail::class, 'student_id', 'user_id');
    }

    public function grades()
    {
        return $this->hasMany(Grade::class, 'student_id', 'id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // Added relationships to satisfy eager loads in CoordinatorController
    public function strand()
    {
        // Note: if 'strand_id' column is absent, Eloquent will resolve as null (safe for eager load)
        return $this->belongsTo(Strand::class, 'strand_id');
    }

    public function section()
    {
        // Note: if 'section_id' column is absent, Eloquent will resolve as null
        return $this->belongsTo(Section::class, 'section_id');
    }

    public function schoolYear()
    {
        // Note: if 'school_year_id' column is absent, Eloquent will resolve as null
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    public function strandPreferences()
    {
        // Preferences table stores users.id in student_id; this model stores user_id
        return $this->hasMany(StudentStrandPreference::class, 'student_id', 'id');
    }

    protected $casts = [
        'reviewed_at' => 'datetime',
        'birthdate' => 'date',
        'age' => 'integer',
    ];

    // Accessor to determine student type from multiple sources
    public function getStudentTypeAttribute()
    {
        // First check if user has student_type set
        if ($this->user && $this->user->student_type) {
            return $this->user->student_type;
        }
        
        // Fallback to student_status field
        if ($this->student_status) {
            return strtolower($this->student_status);
        }
        
        // Default to 'new' if nothing is set
        return 'new';
    }

    public function scopeByEnrollmentStatus($query, $status)
    {
        return $query->where('enrollment_status', $status);
    }

    // Get current enrollment for this student
    public function getCurrentEnrollment()
    {
        return $this->enrollments()->where('status', 'approved')->latest()->first();
    }

    // Get current class details (enrolled classes)
    public function getCurrentClassDetails()
    {
        return $this->classDetails()->where('is_enrolled', true)->get();
    }
}
