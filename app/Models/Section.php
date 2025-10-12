<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = ['section_name', 'strand_id', 'year_level', 'school_year_id', 'adviser_id'];

    public function strand() {
        return $this->belongsTo(Strand::class);
    }

    public function schoolYear() {
        return $this->belongsTo(SchoolYear::class);
    }

    public function schedules() {
        return $this->hasMany(ClassSchedule::class);
    }

    public function students() {
        return $this->hasMany(Student::class);
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Faculty adviser assigned to this section
     * Each section has exactly one adviser
     */
    public function adviser()
    {
        return $this->belongsTo(User::class, 'adviser_id');
    }
}
