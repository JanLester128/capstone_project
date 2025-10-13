<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'lastname',
        'firstname',
        'middlename',
        'email',
        'role',
        'student_type',
        'status',
        'password',
        'assigned_strand_id',
        'is_coordinator',
        'is_disabled',
        'last_login_at',
        'password_changed',
        // Manual enrollment fields (removed redundant columns - now in student_personal_info)
        'is_manual_enrollment',
        'enrolled_by_coordinator',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_coordinator' => 'boolean',
        'is_disabled' => 'boolean',
        'last_login_at' => 'datetime',
        'password_changed' => 'boolean',
    ];

    // Relationships for role-based authentication system
    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function studentPersonalInfo()
    {
        return $this->hasOne(Student::class);
    }

    public function assignedStrand()
    {
        return $this->belongsTo(Strand::class, 'assigned_strand_id');
    }

    public function getFullNameAttribute()
    {
        return trim($this->firstname . ' ' . ($this->middlename ? $this->middlename . ' ' : '') . $this->lastname);
    }

    // Transferee relationships
    public function transfereeCreditedSubjects()
    {
        return $this->hasMany(TransfereeCreditedSubject::class, 'student_id');
    }

    public function transfereePreviousSchools()
    {
        return $this->hasMany(TransfereePreviousSchool::class, 'student_id');
    }

    // Helper methods for transferee functionality
    public function isTransferee()
    {
        return $this->transfereePreviousSchools()->exists();
    }

    public function getCreditedSubjectsCount()
    {
        return $this->transfereeCreditedSubjects()->count();
    }

    public function getTotalCreditedUnits()
    {
        return $this->transfereeCreditedSubjects()
            ->join('subjects', 'transferee_credited_subjects.subject_id', '=', 'subjects.id')
            ->sum('subjects.units') ?? 0;
    }
}
