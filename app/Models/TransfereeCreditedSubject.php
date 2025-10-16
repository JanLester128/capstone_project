<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransfereeCreditedSubject extends Model
{
    use HasFactory;

    protected $table = 'transferee_credited_subjects';

    protected $fillable = [
        'student_id',
        'subject_id',
        'grade',
        'semester',
        'school_year',
        'remarks'
    ];

    protected $casts = [
        'grade' => 'decimal:2',
    ];

    protected $attributes = [
        'school_year' => '2025-2026',
        'semester' => '1st'
    ];

    /**
     * Get the student that owns the credited subject.
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the subject that was credited.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the student's personal info.
     */
    public function studentPersonalInfo()
    {
        return $this->hasOneThrough(
            StudentPersonalInfo::class,
            User::class,
            'id', // Foreign key on users table
            'user_id', // Foreign key on student_personal_info table
            'student_id', // Local key on transferee_credited_subjects table
            'id' // Local key on users table
        );
    }
}
