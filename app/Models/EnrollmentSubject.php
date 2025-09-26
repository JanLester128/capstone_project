<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnrollmentSubject extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrollment_id',
        'subject_id',
        'semester',
        'status',
        'first_quarter_grade',
        'second_quarter_grade',
        'third_quarter_grade',
        'fourth_quarter_grade',
        'final_grade'
    ];

    protected $casts = [
        'first_quarter_grade' => 'decimal:2',
        'second_quarter_grade' => 'decimal:2',
        'third_quarter_grade' => 'decimal:2',
        'fourth_quarter_grade' => 'decimal:2',
        'final_grade' => 'decimal:2',
    ];

    // Relationships
    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    // Scopes
    public function scopeForSemester($query, $semester)
    {
        return $query->where(function($q) use ($semester) {
            $q->where('semester', $semester)
              ->orWhere('semester', 'both');
        });
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopePassed($query)
    {
        return $query->where('final_grade', '>=', 75);
    }

    // Helper methods
    public function calculateFinalGrade()
    {
        $grades = [
            $this->first_quarter_grade,
            $this->second_quarter_grade,
            $this->third_quarter_grade,
            $this->fourth_quarter_grade
        ];

        $validGrades = array_filter($grades, function($grade) {
            return !is_null($grade) && $grade > 0;
        });

        if (count($validGrades) === 0) {
            return null;
        }

        $average = array_sum($validGrades) / count($validGrades);
        $this->final_grade = round($average, 2);
        $this->save();

        return $this->final_grade;
    }

    public function isPassed()
    {
        return $this->final_grade && $this->final_grade >= 75;
    }

    public function isFailed()
    {
        return $this->final_grade && $this->final_grade < 75;
    }

    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    public function getGradeStatusAttribute()
    {
        if (!$this->final_grade) {
            return 'No Grade';
        }

        if ($this->final_grade >= 90) {
            return 'Outstanding';
        } elseif ($this->final_grade >= 85) {
            return 'Very Satisfactory';
        } elseif ($this->final_grade >= 80) {
            return 'Satisfactory';
        } elseif ($this->final_grade >= 75) {
            return 'Fairly Satisfactory';
        } else {
            return 'Did Not Meet Expectations';
        }
    }

    // Auto-enroll student in both semester subjects when enrolling
    public static function autoEnrollFullYear($enrollmentId, $strandId, $gradeLevel)
    {
        // Get all subjects for the strand and grade level
        $subjects = Subject::where('strand_id', $strandId)
                          ->where('grade_level', $gradeLevel)
                          ->get();

        foreach ($subjects as $subject) {
            // Determine semester based on subject
            $semester = $subject->semester ?? 'both';
            
            static::updateOrCreate([
                'enrollment_id' => $enrollmentId,
                'subject_id' => $subject->id,
            ], [
                'semester' => $semester,
                'status' => 'enrolled'
            ]);
        }
    }
}
