<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = ['student_id', 'subject_id', 'faculty_id', 'school_year_id', 'grade_value'];

    public function student() {
        return $this->belongsTo(Student::class);
    }

    public function subject() {
        return $this->belongsTo(Subject::class);
    }

    public function faculty() {
        return $this->belongsTo(Faculty::class);
    }

    public function schoolYear() {
        return $this->belongsTo(SchoolYear::class);
    }
}
