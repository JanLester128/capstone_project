<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Semester extends Model
{
    use HasFactory;

    protected $fillable = ['semester_start', 'semester_end', 'year_level', 'school_year_id', 'registrar_id'];

    public function schoolYear() {
        return $this->belongsTo(SchoolYear::class);
    }

    public function registrar() {
        return $this->belongsTo(Registrar::class);
    }
}
