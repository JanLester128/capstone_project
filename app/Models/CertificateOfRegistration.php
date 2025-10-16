<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CertificateOfRegistration extends Model
{
    use HasFactory;

    protected $table = 'certificates_of_registration';

    protected $fillable = [
        'cor_number',
        'enrollment_id',
        'student_id',
        'school_year_id',
        'section_id',
        'strand_id',
        'semester',
        'year_level',
        'registration_date',
        'status',
        'generated_by',
        'generated_at',
        'printed_at',
        'print_count'
    ];

    protected $casts = [
        'registration_date' => 'date',
        'generated_at' => 'datetime',
        'printed_at' => 'datetime',
        'print_count' => 'integer'
    ];

    /**
     * Get the enrollment that owns the COR.
     */
    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * Get the student that owns the COR.
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the school year that owns the COR.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the section that owns the COR.
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Get the strand that owns the COR.
     */
    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    /**
     * Get the user who generated the COR.
     */
    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    /**
     * Get the class details (enrolled subjects) for this COR.
     */
    public function classDetails()
    {
        return $this->hasManyThrough(
            ClassDetail::class,
            Enrollment::class,
            'id', // Foreign key on enrollments table
            'enrollment_id', // Foreign key on class_details table
            'enrollment_id', // Local key on COR table
            'id' // Local key on enrollments table
        );
    }

    /**
     * Get the student's personal info through enrollment.
     */
    public function studentPersonalInfo()
    {
        return $this->hasOneThrough(
            StudentPersonalInfo::class,
            Enrollment::class,
            'id', // Foreign key on enrollments table
            'user_id', // Foreign key on student_personal_info table
            'enrollment_id', // Local key on COR table
            'student_personal_info_id' // Local key on enrollments table
        );
    }

    /**
     * Scope to get active CORs.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get CORs for a specific semester.
     */
    public function scopeForSemester($query, $semester)
    {
        return $query->where('semester', $semester);
    }

    /**
     * Get the COR number (formatted ID).
     */
    public function getCORNumberAttribute()
    {
        return 'COR-' . str_pad($this->id, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate total units from subjects.
     */
    public function calculateTotalUnits()
    {
        return $this->corSubjects()->sum('units');
    }

    /**
     * Mark COR as printed.
     */
    public function markAsPrinted()
    {
        $this->update([
            'printed_at' => now(),
            'print_count' => $this->print_count + 1
        ]);
    }
}
