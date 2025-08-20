<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Strand extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'hs_grade', 'strand_id', 'section_id'];

    public function registrar() {
        return $this->belongsTo(Registrar::class);
    }

    public function sections() {
        return $this->hasMany(Section::class);
    }

    public function subjects() {
        return $this->hasMany(Subject::class);
    }

    public function students() {
        return $this->hasMany(Student::class);
    }
}
