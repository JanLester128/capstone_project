<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Strand;
use App\Models\Subject;
use App\Models\Faculty;
use App\Models\Coordinator;
use App\Models\Semester;
use App\Models\Schedule;

class Registrar extends Model
{
    use HasFactory;

    // Only 'user_id' is saved in the 'registrars' table
    protected $fillable = ['user_id'];

    /**
     * The user account associated with the registrar.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationships with other models (if registrar manages them)
     */
    public function strands()
    {
        return $this->hasMany(Strand::class);
    }

    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    public function faculties()
    {
        return $this->hasMany(Faculty::class);
    }

    public function coordinators()
    {
        return $this->hasMany(Coordinator::class);
    }

    public function semesters()
    {
        return $this->hasMany(Semester::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}
