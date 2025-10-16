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
        'username',
        'email',
        'password',
        'role',
        'is_coordinator',
        'firstname',
        'lastname',
        'assigned_strand_id',
        'password_change_required',
        'generated_password',
        'password_changed',
        'plain_password',
        'is_disabled',
        'last_login_at',
        'student_type',
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
        'password' => 'hashed',
        'is_coordinator' => 'boolean',
        'password_change_required' => 'boolean',
        'password_changed' => 'boolean',
        'is_disabled' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    /**
     * Get the student personal info for this user.
     */
    public function studentPersonalInfo()
    {
        return $this->hasOne(StudentPersonalInfo::class);
    }

    /**
     * Get the subjects taught by this user (faculty).
     */
    public function subjects()
    {
        return $this->hasMany(Subject::class, 'faculty_id');
    }

    /**
     * Get the classes taught by this user (faculty).
     */
    public function classes()
    {
        return $this->hasMany(ClassSchedule::class, 'faculty_id');
    }

    /**
     * Get the grades given by this user (faculty).
     */
    public function grades()
    {
        return $this->hasMany(Grade::class, 'faculty_id');
    }

    /**
     * Get the grades received by this user (student).
     */
    public function studentGrades()
    {
        return $this->hasMany(Grade::class, 'student_id');
    }

    /**
     * Get the sections advised by this user (faculty as adviser).
     */
    public function advisedSections()
    {
        return $this->hasMany(Section::class, 'adviser_id');
    }

    /**
     * Get the enrollments coordinated by this user (coordinator).
     */
    public function coordinatedEnrollments()
    {
        return $this->hasMany(Enrollment::class, 'coordinator_id');
    }

    /**
     * Get the class details for this user (student).
     */
    public function classDetails()
    {
        return $this->hasMany(ClassDetail::class, 'student_id');
    }

    /**
     * Get the grades approved by this user.
     */
    public function approvedGrades()
    {
        return $this->hasMany(Grade::class, 'approved_by');
    }

    /**
     * Get the faculty loads for this user.
     */
    public function facultyLoads()
    {
        return $this->hasMany(FacultyLoad::class, 'faculty_id');
    }

    /**
     * Get the current faculty load for active school year.
     */
    public function currentFacultyLoad()
    {
        return $this->hasOne(FacultyLoad::class, 'faculty_id')
                    ->whereHas('schoolYear', function ($query) {
                        $query->where('is_active', true);
                    });
    }

    /**
     * Get loads assigned by this user (registrar).
     */
    public function assignedLoads()
    {
        return $this->hasMany(FacultyLoad::class, 'assigned_by');
    }

    /**
     * Get the strand assigned to this user (faculty).
     */
    public function assignedStrand()
    {
        return $this->belongsTo(Strand::class, 'assigned_strand_id');
    }

    /**
     * Get all sessions for this user.
     */
    public function sessions()
    {
        return $this->hasMany(UserSession::class);
    }

    /**
     * Get the active session for this user.
     */
    public function activeSession()
    {
        return $this->hasOne(UserSession::class)
                    ->where('status', 'active')
                    ->where('expires_at', '>', now());
    }

    /**
     * Check if user has an active session.
     */
    public function hasActiveSession()
    {
        return $this->activeSession()->exists();
    }

    /**
     * Terminate all active sessions for this user.
     */
    public function terminateAllSessions()
    {
        return $this->sessions()
                    ->where('status', 'active')
                    ->update([
                        'status' => 'terminated',
                        'updated_at' => now()
                    ]);
    }
}
