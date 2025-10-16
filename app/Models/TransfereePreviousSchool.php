<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransfereePreviousSchool extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_personal_info_id',
        'last_school',
    ];

    /**
     * Get the student personal info that owns the previous school record.
     */
    public function studentPersonalInfo()
    {
        return $this->belongsTo(StudentPersonalInfo::class, 'student_personal_info_id');
    }

    /**
     * Get the student through the personal info relationship.
     */
    public function student()
    {
        return $this->hasOneThrough(
            User::class,
            StudentPersonalInfo::class,
            'id', // Foreign key on student_personal_info table
            'id', // Foreign key on users table
            'student_personal_info_id', // Local key on transferee_previous_schools table
            'user_id' // Local key on student_personal_info table
        );
    }
}
