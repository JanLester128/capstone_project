<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentStrandPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_personal_info_id',  // Reference to student personal info
        'strand_id',
        'preference_order'
    ];

    protected $casts = [
        'preference_order' => 'integer',
    ];

    // Relationships
    public function studentPersonalInfo()
    {
        return $this->belongsTo(StudentPersonalInfo::class, 'student_personal_info_id');
    }

    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    // Get student via studentPersonalInfo relationship
    public function student()
    {
        return $this->hasOneThrough(User::class, StudentPersonalInfo::class, 'id', 'id', 'student_personal_info_id', 'user_id');
    }

    // Scopes
    public function scopeForStudentPersonalInfo($query, $studentPersonalInfoId)
    {
        return $query->where('student_personal_info_id', $studentPersonalInfoId);
    }

    public function scopeForStudent($query, $studentId)
    {
        return $query->whereHas('studentPersonalInfo', function($q) use ($studentId) {
            $q->where('user_id', $studentId);
        });
    }

    public function scopeOrderedByPreference($query)
    {
        return $query->orderBy('preference_order');
    }
}
