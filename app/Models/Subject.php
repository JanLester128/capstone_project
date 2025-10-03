<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code', 
        'semester',
        'year_level',
        'school_year_id',
        'strand_id',
        'faculty_id',
        'prerequisites',
        'corequisites',
        'description'
    ];

    protected $casts = [
        'prerequisites' => 'array',
        'corequisites' => 'array'
    ];

    public function strand() {
        return $this->belongsTo(Strand::class);
    }

    public function strands() {
        return $this->belongsToMany(Strand::class, 'strand_subjects');
    }

    public function schoolYear() {
        return $this->belongsTo(SchoolYear::class);
    }

    public function classes() {
        return $this->hasMany(ClassSchedule::class);
    }

    public function grades() {
        return $this->hasMany(Grade::class);
    }

    public function faculty()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    // Get prerequisite subjects
    public function prerequisiteSubjects()
    {
        if (!$this->prerequisites) {
            return collect();
        }
        
        return Subject::whereIn('code', $this->prerequisites)->get();
    }

    // Get corequisite subjects
    public function corequisiteSubjects()
    {
        if (!$this->corequisites) {
            return collect();
        }
        
        return Subject::whereIn('code', $this->corequisites)->get();
    }

    // Transferee relationship
    public function transfereeCreditedSubjects()
    {
        return $this->hasMany(TransfereeCreditedSubject::class);
    }

    // Helper methods for transferee functionality
    public function getTransfereeCreditsCount()
    {
        return $this->transfereeCreditedSubjects()->count();
    }

    public function getAverageCreditedGrade()
    {
        return $this->transfereeCreditedSubjects()->avg('grade');
    }

    public function hasTransfereeCredits()
    {
        return $this->transfereeCreditedSubjects()->exists();
    }
}
