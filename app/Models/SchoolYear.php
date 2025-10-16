<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class SchoolYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'year_start',
        'year_end',
        'semester',
        'start_date',
        'end_date',
        'is_active',
        'is_current_academic_year',
        'enrollment_start',
        'enrollment_end',
        'quarter_1_start',
        'quarter_1_end',
        'quarter_2_start',
        'quarter_2_end',
        'quarter_3_start',
        'quarter_3_end',
        'quarter_4_start',
        'quarter_4_end',
        'grading_deadline',
        'is_enrollment_open',
        'enrollment_start_date',
        'enrollment_end_date',
        'current_quarter',
        'is_quarter_open',
        'quarter_start_date',
        'quarter_end_date',
        'grade_submission_deadline',
        'allow_grade_encoding',
        'require_grade_approval',
        'quarter_notes',
    ];

    protected $casts = [
        'year_start' => 'integer',
        'year_end' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'enrollment_start' => 'date',
        'enrollment_end' => 'date',
        'quarter_1_start' => 'date',
        'quarter_1_end' => 'date',
        'quarter_2_start' => 'date',
        'quarter_2_end' => 'date',
        'quarter_3_start' => 'date',
        'quarter_3_end' => 'date',
        'quarter_4_start' => 'date',
        'quarter_4_end' => 'date',
        'grading_deadline' => 'date',
        'enrollment_start_date' => 'date',
        'enrollment_end_date' => 'date',
        'quarter_start_date' => 'date',
        'quarter_end_date' => 'date',
        'grade_submission_deadline' => 'date',
        'is_active' => 'boolean',
        'is_current_academic_year' => 'boolean',
        'is_enrollment_open' => 'boolean',
        'is_quarter_open' => 'boolean',
        'allow_grade_encoding' => 'boolean',
        'require_grade_approval' => 'boolean',
    ];

    /**
     * Get the sections for this school year.
     */
    public function sections()
    {
        return $this->hasMany(Section::class);
    }

    /**
     * Get the subjects for this school year.
     */
    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    /**
     * Get the classes for this school year.
     */
    public function classes()
    {
        return $this->hasMany(ClassSchedule::class, 'school_year_id');
    }

    /**
     * Get the enrollments for this school year.
     */
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Get the grades for this school year.
     */
    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get the display name for the school year.
     */
    public function getDisplayNameAttribute()
    {
        return $this->year_start . '-' . $this->year_end . ' (' . $this->semester . ')';
    }

    /**
     * Scope to get active school years.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get current academic year.
     */
    public function scopeCurrent($query)
    {
        return $query->where('is_current_academic_year', true);
    }

    /**
     * Get the faculty loads for this school year.
     */
    public function facultyLoads()
    {
        return $this->hasMany(FacultyLoad::class);
    }

    /**
     * Check if this school year is currently active
     */
    public function isActive()
    {
        return $this->is_active;
    }

    /**
     * Check if a specific quarter has ended
     */
    public function isQuarterEnded($quarter)
    {
        $currentDate = now();
        
        // Check if there are specific quarter end dates
        $quarterEndField = strtolower($quarter) . '_quarter_end_date';
        
        if (isset($this->$quarterEndField) && $this->$quarterEndField) {
            return $currentDate->isAfter(Carbon::parse($this->$quarterEndField));
        }
        
        // Fallback: Check if current quarter is past the requested quarter
        $quarterOrder = ['1st' => 1, '2nd' => 2, '3rd' => 3, '4th' => 4];
        $requestedQuarterNumber = $quarterOrder[$quarter] ?? 0;
        $currentQuarterNumber = $quarterOrder[$this->current_quarter ?? '1st'] ?? 1;
        
        // If current quarter is ahead of requested quarter, then requested quarter has ended
        if ($currentQuarterNumber > $requestedQuarterNumber) {
            return true;
        }
        
        // If it's the same quarter, check if quarter is marked as closed
        if ($currentQuarterNumber === $requestedQuarterNumber) {
            return !($this->is_quarter_open ?? true);
        }
        
        // If requested quarter is in the future, it hasn't ended
        return false;
    }

    /**
     * Check if enrollment is currently open.
     */
    public function isEnrollmentOpen()
    {
        if (!$this->is_enrollment_open) {
            return false;
        }

        // Always use new date fields first, sync old fields if needed
        $startDate = $this->enrollment_start_date ?: $this->enrollment_start;
        $endDate = $this->enrollment_end_date ?: $this->enrollment_end;
        
        if ($startDate && $endDate) {
            $now = now();
            return $now->between($startDate, $endDate);
        }

        return $this->is_enrollment_open; // Return the flag value if dates aren't set
    }

    /**
     * Get current quarter based on date.
     */
    public function getCurrentQuarter()
    {
        $now = now();

        // Check if quarter dates are set before using between()
        if ($this->quarter_1_start && $this->quarter_1_end && $now->between($this->quarter_1_start, $this->quarter_1_end)) {
            return 1;
        } elseif ($this->quarter_2_start && $this->quarter_2_end && $now->between($this->quarter_2_start, $this->quarter_2_end)) {
            return 2;
        } elseif ($this->quarter_3_start && $this->quarter_3_end && $now->between($this->quarter_3_start, $this->quarter_3_end)) {
            return 3;
        } elseif ($this->quarter_4_start && $this->quarter_4_end && $now->between($this->quarter_4_start, $this->quarter_4_end)) {
            return 4;
        }

        // Return default quarter if no dates are set or current date doesn't fall in any quarter
        return $this->current_quarter ?? 1;
    }

    /**
     * Check if grading is open for current quarter.
     */
    public function isGradingOpen()
    {
        $currentQuarter = $this->getCurrentQuarter();
        if (!$currentQuarter) {
            return false;
        }

        // If no grading deadline is set, assume grading is open
        if (!$this->grading_deadline) {
            return true;
        }

        $now = now();
        return $now->lte($this->grading_deadline);
    }

    /**
     * Get semester information.
     */
    public function getSemesterInfo()
    {
        return [
            'semester' => $this->semester,
            'duration_months' => 5,
            'quarters' => [
                1 => [
                    'name' => '1st Quarter',
                    'start' => $this->quarter_1_start,
                    'end' => $this->quarter_1_end,
                    'duration_months' => 2.5,
                ],
                2 => [
                    'name' => '2nd Quarter', 
                    'start' => $this->quarter_2_start,
                    'end' => $this->quarter_2_end,
                    'duration_months' => 2.5,
                ],
                3 => [
                    'name' => '3rd Quarter',
                    'start' => $this->quarter_3_start,
                    'end' => $this->quarter_3_end,
                    'duration_months' => 2.5,
                ],
                4 => [
                    'name' => '4th Quarter',
                    'start' => $this->quarter_4_start,
                    'end' => $this->quarter_4_end,
                    'duration_months' => 2.5,
                ],
            ],
        ];
    }

    /**
     * Open enrollment for this school year
     */
    public function openEnrollment($startDate = null, $endDate = null)
    {
        $this->update([
            'is_enrollment_open' => true,
            'enrollment_start' => $startDate ?? now(),
            'enrollment_end' => $endDate ?? now()->addMonths(1)
        ]);
    }

    /**
     * Close enrollment for this school year
     */
    public function closeEnrollment()
    {
        $this->update(['is_enrollment_open' => false]);
    }

    /**
     * Check if enrollment can be opened for specific student types
     */
    public function canEnrollStudentType($studentType)
    {
        if (!$this->isEnrollmentOpen()) {
            return false;
        }

        // Business rules for enrollment timing
        switch ($studentType) {
            case 'new':
                // New Grade 11 students can enroll at start of school year
                return $this->semester === '1st Semester';
            
            case 'continuing':
                // Continuing Grade 12 students can enroll for both semesters
                return true;
            
            case 'transferee':
                // Transferees can enroll anytime during enrollment period
                return true;
            
            default:
                return false;
        }
    }

    /**
     * Get enrollment statistics
     */
    public function getEnrollmentStats()
    {
        $enrollments = $this->enrollments()->with('studentPersonalInfo.user');
        
        return [
            'total' => $enrollments->count(),
            'pending' => $enrollments->where('status', 'pending')->count(),
            'pending_evaluation' => $enrollments->where('status', 'pending_evaluation')->count(),
            'evaluated' => $enrollments->where('status', 'evaluated')->count(),
            'approved' => $enrollments->where('status', 'approved')->count(),
            'rejected' => $enrollments->where('status', 'rejected')->count(),
            'by_type' => [
                'new' => $enrollments->whereHas('studentPersonalInfo.user', function($q) {
                    $q->where('student_type', 'new');
                })->count(),
                'continuing' => $enrollments->whereHas('studentPersonalInfo.user', function($q) {
                    $q->where('student_type', 'continuing');
                })->count(),
                'transferee' => $enrollments->where('enrollment_type', 'transferee')->count()
            ]
        ];
    }
}
