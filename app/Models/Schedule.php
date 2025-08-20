<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = ['day', 'start_time', 'end_time', 'section_id', 'subject_id', 'student_id', 'registrar_id'];

    public function section() {
        return $this->belongsTo(Section::class);
    }

    public function subject() {
        return $this->belongsTo(Subject::class);
    }

    public function student() {
        return $this->belongsTo(Student::class);
    }

    public function registrar() {
        return $this->belongsTo(Registrar::class);
    }
}
