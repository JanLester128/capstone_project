<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    protected $fillable = ['year_start', 'year_end'];

    public function semesters() {
        return $this->hasMany(Semester::class);
    }

    public function enrollments() {
        return $this->hasMany(Enrollment::class);
    }

    public function grades() {
        return $this->hasMany(Grade::class);
    }
}
