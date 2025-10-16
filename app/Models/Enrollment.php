<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'student_personal_info_id',
        'strand_id',
        'first_strand_choice_id',
        'second_strand_choice_id',
        'third_strand_choice_id',
        'assigned_section_id',
        'school_year_id',
        'intended_grade_level',
        'semester',
        'status',
        'enrollment_type',
        'enrollment_category',
        'enrollment_method',
        'previous_enrollment_id',
        'failed_subjects',
        'is_summer_class',
        'coordinator_id',
        'enrollment_date',
        'evaluation_notes',
        'revision_notes',
        'rejection_reason',
        'documents',
    ];

    protected $casts = [
        'intended_grade_level' => 'integer',
        'semester' => 'integer',
        'failed_subjects' => 'array',
        'is_summer_class' => 'boolean',
        'enrollment_date' => 'datetime',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        // Send notifications when status changes
        static::updating(function ($enrollment) {
            if ($enrollment->isDirty('status')) {
                $previousStatus = $enrollment->getOriginal('status');
                $newStatus = $enrollment->status;
                
                // Send notification to student
                $student = $enrollment->studentPersonalInfo->user;
                $student->notify(new \App\Notifications\EnrollmentStatusChanged(
                    $enrollment, 
                    $previousStatus, 
                    $newStatus
                ));

                // If transferee needs evaluation, notify coordinators
                if ($newStatus === 'pending_evaluation') {
                    $coordinators = \App\Models\User::where('role', 'coordinator')
                        ->orWhere('is_coordinator', true)
                        ->get();
                    
                    foreach ($coordinators as $coordinator) {
                        $coordinator->notify(new \App\Notifications\TransfereeEvaluationNeeded($enrollment));
                    }
                }
            }
        });

        // Enforce business rules before creating
        static::creating(function ($enrollment) {
            // Rule: No multiple enrollments in same semester
            $existingEnrollment = static::where('student_personal_info_id', $enrollment->student_personal_info_id)
                ->where('school_year_id', $enrollment->school_year_id)
                ->whereNotIn('status', ['rejected'])
                ->first();

            if ($existingEnrollment) {
                throw new \Exception('Student already has an enrollment for this school year.');
            }

            // Rule: Check if enrollment is open for student type
            $schoolYear = \App\Models\SchoolYear::find($enrollment->school_year_id);
            $studentType = $enrollment->studentPersonalInfo->user->student_type;
            
            if (!$schoolYear->canEnrollStudentType($studentType)) {
                throw new \Exception('Enrollment is not open for ' . $studentType . ' students at this time.');
            }
        });
    }

    /**
     * Get the student personal info that owns the enrollment.
     */
    public function studentPersonalInfo()
    {
        return $this->belongsTo(StudentPersonalInfo::class);
    }

    /**
     * Get the student user through student personal info.
     */
    public function student()
    {
        return $this->hasOneThrough(
            User::class,
            StudentPersonalInfo::class,
            'id',
            'id',
            'student_personal_info_id',
            'user_id'
        );
    }

    /**
     * Get the strand that owns the enrollment.
     */
    public function strand()
    {
        return $this->belongsTo(Strand::class);
    }

    /**
     * Get the first strand choice.
     */
    public function firstStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'first_strand_choice_id');
    }

    /**
     * Get the second strand choice.
     */
    public function secondStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'second_strand_choice_id');
    }

    /**
     * Get the third strand choice.
     */
    public function thirdStrandChoice()
    {
        return $this->belongsTo(Strand::class, 'third_strand_choice_id');
    }

    /**
     * Get the assigned section for the enrollment.
     */
    public function assignedSection()
    {
        return $this->belongsTo(Section::class, 'assigned_section_id');
    }

    /**
     * Get the school year that owns the enrollment.
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Get the coordinator that evaluated the enrollment.
     */
    public function coordinator()
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    /**
     * Get the previous enrollment (for semester/grade progression).
     */
    public function previousEnrollment()
    {
        return $this->belongsTo(Enrollment::class, 'previous_enrollment_id');
    }

    /**
     * Get the next enrollment (for semester/grade progression).
     */
    public function nextEnrollment()
    {
        return $this->hasOne(Enrollment::class, 'previous_enrollment_id');
    }

    /**
     * Get the semester progressions from this enrollment.
     */
    public function semesterProgressionsFrom()
    {
        return $this->hasMany(SemesterProgression::class, 'from_enrollment_id');
    }

    /**
     * Get the semester progressions to this enrollment.
     */
    public function semesterProgressionsTo()
    {
        return $this->hasMany(SemesterProgression::class, 'to_enrollment_id');
    }

    /**
     * Get the summer class for this enrollment.
     */
    public function summerClass()
    {
        return $this->hasOne(SummerClass::class);
    }

    /**
     * Get the transferee previous school information through student personal info.
     */
    public function transfereePreviousSchool()
    {
        return $this->hasOneThrough(
            TransfereePreviousSchool::class,
            StudentPersonalInfo::class,
            'id', // Foreign key on student_personal_info table
            'student_personal_info_id', // Foreign key on transferee_previous_schools table
            'student_personal_info_id', // Local key on enrollments table
            'id' // Local key on student_personal_info table
        );
    }

    /**
     * Get the certificate of registration for this enrollment.
     */
    public function certificateOfRegistration()
    {
        return $this->hasOne(CertificateOfRegistration::class);
    }

    /**
     * Get the class details for this enrollment.
     */
    public function classDetails()
    {
        return $this->hasMany(\App\Models\ClassDetail::class);
    }

    /**
     * Get the transferee subject credits through the previous school.
     */
    public function transfereeSubjectCredits()
    {
        return $this->hasManyThrough(
            TransfereeSubjectCredit::class,
            TransfereePreviousSchool::class,
            'student_personal_info_id', // Foreign key on transferee_previous_schools table
            'previous_school_id', // Foreign key on transferee_subject_credits table
            'student_personal_info_id', // Local key on enrollments table
            'id' // Local key on transferee_previous_schools table
        );
    }

    /**
     * Check if enrollment can be modified
     */
    public function canBeModified()
    {
        return in_array($this->status, ['pending', 'pending_evaluation']);
    }

    /**
     * Check if enrollment is approved
     */
    public function isApproved()
    {
        return $this->status === 'approved';
    }

    /**
     * Check if enrollment is rejected
     */
    public function isRejected()
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if enrollment needs evaluation (for transferees)
     */
    public function needsEvaluation()
    {
        return $this->enrollment_type === 'transferee' && $this->status === 'pending_evaluation';
    }

    /**
     * Get enrollment status with color coding
     */
    public function getStatusWithColor()
    {
        $statusColors = [
            'pending' => ['color' => 'yellow', 'text' => 'Pending Review'],
            'pending_evaluation' => ['color' => 'blue', 'text' => 'Pending Evaluation'],
            'evaluated' => ['color' => 'purple', 'text' => 'Evaluated'],
            'approved' => ['color' => 'green', 'text' => 'Approved'],
            'rejected' => ['color' => 'red', 'text' => 'Rejected'],
        ];

        return $statusColors[$this->status] ?? ['color' => 'gray', 'text' => ucfirst($this->status)];
    }

    /**
     * Scope for filtering by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for filtering by enrollment type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('enrollment_type', $type);
    }

    /**
     * Scope for current school year
     */
    public function scopeCurrentSchoolYear($query)
    {
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        return $query->where('school_year_id', $currentSchoolYear->id ?? 0);
    }

    /**
     * Check if enrollment is pending.
     */
    public function isPending()
    {
        return $this->status === 'pending';
    }

    /**
     * Scope to get approved enrollments.
     */
    public function scopeApproved($query)
    {
        return $query->whereIn('status', ['enrolled', 'approved']);
    }

    /**
     * Scope to get pending enrollments.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Check if enrollment is for semester progression.
     */
    public function isSemesterProgression()
    {
        return $this->enrollment_category === 'semester_progression';
    }

    /**
     * Check if enrollment is for grade progression.
     */
    public function isGradeProgression()
    {
        return $this->enrollment_category === 'grade_progression';
    }

    /**
     * Check if enrollment is for summer class.
     */
    public function isSummerClass()
    {
        return $this->is_summer_class || $this->enrollment_category === 'summer_class';
    }

    /**
     * Check if enrollment is initial enrollment.
     */
    public function isInitialEnrollment()
    {
        return $this->enrollment_category === 'initial';
    }

    /**
     * Check if student can progress to next semester.
     */
    public function canProgressToNextSemester()
    {
        return $this->status === 'enrolled' && 
               $this->semester === 1 && 
               !$this->isSummerClass();
    }

    /**
     * Check if student can progress to next grade.
     */
    public function canProgressToNextGrade()
    {
        return $this->status === 'enrolled' && 
               $this->semester === 2 && 
               !$this->isSummerClass();
    }

    /**
     * Get the next semester number.
     */
    public function getNextSemester()
    {
        return $this->semester === 1 ? 2 : 1;
    }

    /**
     * Get the next grade level.
     */
    public function getNextGradeLevel()
    {
        return $this->intended_grade_level + 1;
    }

    /**
     * Scope for semester enrollments.
     */
    public function scopeBySemester($query, $semester)
    {
        return $query->where('semester', $semester);
    }

    /**
     * Scope for enrollment category.
     */
    public function scopeByCategory($query, $category)
    {
        return $query->where('enrollment_category', $category);
    }
}
