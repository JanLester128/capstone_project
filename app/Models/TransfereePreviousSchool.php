<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class TransfereePreviousSchool extends Model
{
    use HasFactory;

    protected $table = 'transferee_previous_schools';

    protected $fillable = [
        'student_id',
        'last_school'
    ];

    // No additional casts needed for simplified model

    /**
     * Get the student who transferred from this school
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the credited subjects from this school
     */
    public function creditedSubjects()
    {
        return $this->hasMany(TransfereeCreditedSubject::class, 'student_id', 'student_id');
    }
}
