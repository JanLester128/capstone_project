<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentStrandPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'strand_id',
        'preference_order'
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }
}
