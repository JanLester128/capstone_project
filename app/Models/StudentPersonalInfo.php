<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\TransfereePreviousSchool;

class StudentPersonalInfo extends Model
{
    use HasFactory;

    protected $table = 'student_personal_info';

    protected $fillable = [
        'user_id',
        'lrn',
        'grade_level',
        'student_status',
        'birthdate',
        'sex',
        'address',
        'guardian_name',
        'guardian_contact',
        'guardian_relationship',
        'psa_birth_certificate',
        'report_card',
        // Additional personal information fields
        'previous_school',
        'extension_name',
        'birth_place',
        'religion',
        'ip_community',
        'four_ps',
        'pwd_id',
        'last_grade',
        'last_sy',
        'last_school',
        'emergency_contact_name',
        'emergency_contact_number',
        'emergency_contact_relationship',
    ];

    protected $casts = [
        'birthdate' => 'date',
    ];

    /**
     * Boot the model and add event listeners
     */
    protected static function boot()
    {
        parent::boot();

        // When student personal info is updated, sync transferee previous school
        static::updated(function ($studentInfo) {
            if ($studentInfo->student_status === 'transferee' && !empty($studentInfo->last_school)) {
                $studentInfo->syncTransfereePreviousSchool();
            }
        });

        // When student personal info is created, create transferee previous school if needed
        static::created(function ($studentInfo) {
            if ($studentInfo->student_status === 'transferee' && !empty($studentInfo->last_school)) {
                $studentInfo->syncTransfereePreviousSchool();
            }
        });
    }

    /**
     * Get the user that owns the student personal info.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the transferee previous schools for this student.
     */
    public function transfereePreviousSchools()
    {
        return $this->hasMany(TransfereePreviousSchool::class);
    }

    /**
     * Get the student strand preferences for this student.
     */
    public function strandPreferences()
    {
        return $this->hasMany(StudentStrandPreference::class);
    }

    /**
     * Get the enrollments for this student.
     */
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Get the full name of the student.
     */
    public function getFullNameAttribute()
    {
        return $this->user->username ?? 'Unknown Student';
    }

    /**
     * Check if student is a transferee.
     */
    public function isTransferee()
    {
        return $this->student_status === 'transferee';
    }

    /**
     * Get the age of the student.
     */
    public function getAgeAttribute()
    {
        return $this->birthdate ? $this->birthdate->age : null;
    }

    /**
     * Sync transferee previous school data
     */
    public function syncTransfereePreviousSchool()
    {
        if ($this->student_status !== 'transferee' || empty($this->last_school)) {
            return;
        }

        try {
            // Find or create transferee previous school record
            $previousSchool = TransfereePreviousSchool::firstOrNew([
                'student_personal_info_id' => $this->id
            ]);

            $previousSchool->last_school = $this->last_school;
            $previousSchool->save();

            \Log::info('Synced transferee previous school', [
                'student_personal_info_id' => $this->id,
                'student_name' => $this->full_name,
                'last_school' => $this->last_school
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to sync transferee previous school', [
                'student_personal_info_id' => $this->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
