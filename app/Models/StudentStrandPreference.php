<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentStrandPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'enrollment_id',
        'strand_id',
        'preference_order',
        'school_year_id'
    ];

    protected $casts = [
        'preference_order' => 'integer',
    ];

    // Relationships
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    // Scopes
    public function scopeForStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeForEnrollment($query, $enrollmentId)
    {
        return $query->where('enrollment_id', $enrollmentId);
    }

    public function scopeForSchoolYear($query, $schoolYearId)
    {
        return $query->where('school_year_id', $schoolYearId);
    }

    public function scopeOrderedByPreference($query)
    {
        return $query->orderBy('preference_order');
    }
}
