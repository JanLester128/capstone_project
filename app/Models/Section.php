<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = ['section_name', 'strand_id', 'year_level'];

    public function strand() {
        return $this->belongsTo(Strand::class);
    }

    public function schedules() {
        return $this->hasMany(Schedule::class);
    }

    public function students() {
        return $this->hasMany(Student::class);
    }
}
