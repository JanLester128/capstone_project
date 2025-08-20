<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = ['student_id', 'school_year_id', 'date_enrolled'];

    public function student() {
        return $this->belongsTo(Student::class);
    }

    public function schoolYear() {
        return $this->belongsTo(SchoolYear::class);
    }
}
