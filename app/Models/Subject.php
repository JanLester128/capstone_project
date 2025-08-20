<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = ['subject_name', 'year_level', 'strand_id', 'registrar_id'];

    public function strand() {
        return $this->belongsTo(Strand::class);
    }

    public function registrar() {
        return $this->belongsTo(Registrar::class);
    }

    public function schedules() {
        return $this->hasMany(Schedule::class);
    }

    public function grades() {
        return $this->hasMany(Grade::class);
    }
}
