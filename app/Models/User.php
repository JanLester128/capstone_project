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
        'password',
        'plain_password',
        'assigned_strand_id',
        'is_coordinator',
        'password_changed',
        'password_change_required',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'plain_password',
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
    ];

    // Optional relationships if needed
    public function registrar()
    {
        return $this->hasOne(Registrar::class);
    }

    // Removed faculty relationship - using unified authentication

    public function coordinator()
    {
        return $this->hasOne(Coordinator::class);
    }

    public function student()
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
}
