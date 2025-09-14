<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Strand extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'name', 'description'];

    public function registrar() {
        return $this->belongsTo(Registrar::class);
    }

    public function sections() {
        return $this->hasMany(Section::class);
    }

    public function subjects() {
        return $this->belongsToMany(Subject::class, 'strand_subjects');
    }

    public function students() {
        return $this->hasMany(Student::class);
    }
}
