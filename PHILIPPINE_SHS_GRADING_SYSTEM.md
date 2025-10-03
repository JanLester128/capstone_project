# Philippine SHS Grading System - Database Design

## Overview

This document explains the optimal grades table structure for the Philippine Senior High School (SHS) grading system where **subjects change between semesters**.

## Key Requirements

1. **1st Semester (Aug-Dec)**: Q1 + Q2 grades for 1st semester subjects
2. **2nd Semester (Jan-May)**: Q3 + Q4 grades for 2nd semester subjects (DIFFERENT subjects)
3. **Semester Grade**: Average of the 2 quarters within each semester
4. **Final Grade**: Calculated from both semester grades (if same subject exists in both)

## Database Design Solution

### Grades Table Structure

```sql
CREATE TABLE grades (
    id BIGINT UNSIGNED PRIMARY KEY,
    student_id BIGINT UNSIGNED,           -- Links to users table
    subject_id BIGINT UNSIGNED,           -- Different subjects per semester
    faculty_id BIGINT UNSIGNED,           -- Faculty teaching this subject
    school_year_id BIGINT UNSIGNED,       -- Academic year
    class_id BIGINT UNSIGNED,             -- Class section
    
    -- CRITICAL: Semester identification
    semester ENUM('1st', '2nd'),          -- Which semester
    
    -- Quarter grades for THIS SEMESTER ONLY
    first_quarter DECIMAL(5,2) NULL,      -- Q1 (1st sem) OR Q3 (2nd sem)
    second_quarter DECIMAL(5,2) NULL,     -- Q2 (1st sem) OR Q4 (2nd sem)
    
    -- Calculated semester grade
    semester_grade DECIMAL(5,2) NULL,     -- Average of 2 quarters above
    
    -- Status and metadata
    status ENUM('ongoing', 'completed', 'incomplete', 'dropped'),
    remarks TEXT NULL,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Unique constraint: One record per student-subject-semester
    UNIQUE KEY unique_student_subject_semester (student_id, subject_id, semester, school_year_id)
);
```

## Data Flow Examples

### Example 1: Student with Different Subjects Per Semester

**Student**: Jan Lester (ID: 3)
**School Year**: 2024-2025 (ID: 1)

#### 1st Semester Record (Math Subject)
```sql
INSERT INTO grades VALUES (
    1,                    -- id
    3,                    -- student_id (Jan Lester)
    5,                    -- subject_id (Mathematics)
    2,                    -- faculty_id (Math Teacher)
    1,                    -- school_year_id (2024-2025)
    1,                    -- class_id
    '1st',                -- semester
    85.0,                 -- first_quarter (Q1 grade)
    88.0,                 -- second_quarter (Q2 grade)
    86.5,                 -- semester_grade (average of Q1+Q2)
    'completed',          -- status
    'Good performance'    -- remarks
);
```

#### 2nd Semester Record (Science Subject - DIFFERENT!)
```sql
INSERT INTO grades VALUES (
    2,                    -- id
    3,                    -- student_id (Jan Lester)
    8,                    -- subject_id (Physical Science) - DIFFERENT SUBJECT!
    4,                    -- faculty_id (Science Teacher)
    1,                    -- school_year_id (2024-2025)
    1,                    -- class_id
    '2nd',                -- semester
    90.0,                 -- first_quarter (Q3 grade, stored as "first" of 2nd sem)
    87.0,                 -- second_quarter (Q4 grade, stored as "second" of 2nd sem)
    88.5,                 -- semester_grade (average of Q3+Q4)
    'completed',          -- status
    'Excellent work'      -- remarks
);
```

## Quarter Naming Logic

The key insight is that `first_quarter` and `second_quarter` represent **the two quarters of the current semester**, not absolute quarter numbers:

| Semester | first_quarter | second_quarter | semester_grade |
|----------|---------------|----------------|----------------|
| 1st      | Q1 grade      | Q2 grade       | (Q1+Q2)/2     |
| 2nd      | Q3 grade      | Q4 grade       | (Q3+Q4)/2     |

## Model Implementation

### Grade Model Methods

```php
class Grade extends Model 
{
    /**
     * Calculate semester grade (average of 2 quarters)
     */
    public function calculateSemesterGrade()
    {
        $quarters = collect([
            $this->first_quarter,
            $this->second_quarter
        ])->filter()->values();

        return $quarters->count() > 0 ? round($quarters->avg(), 2) : null;
    }

    /**
     * Get actual quarter numbers for display
     */
    public function getQuarterDetails()
    {
        if ($this->semester === '1st') {
            return [
                'q1' => ['number' => 1, 'value' => $this->first_quarter],
                'q2' => ['number' => 2, 'value' => $this->second_quarter]
            ];
        } else {
            return [
                'q3' => ['number' => 3, 'value' => $this->first_quarter],
                'q4' => ['number' => 4, 'value' => $this->second_quarter]
            ];
        }
    }
}
```

## Benefits of This Design

### ✅ Advantages

1. **Handles Different Subjects Per Semester**: Each record is for one subject in one semester
2. **Flexible Subject Assignment**: No assumption that subjects are the same across semesters
3. **Clean Data Structure**: One record = one subject + one semester
4. **Proper Relationships**: Clear foreign keys to subjects, students, faculty
5. **Scalable**: Easy to add more semesters or modify grading periods
6. **Query Friendly**: Simple to get grades by semester, student, or subject

### ❌ Previous Problems Solved

1. **No More 4-Quarter Confusion**: Eliminates the problem of storing Q1-Q4 in one record when subjects change
2. **No More Null Quarters**: Each record only stores the quarters that actually exist for that semester
3. **No More Subject Mismatch**: Each semester can have completely different subjects
4. **No More Complex Calculations**: Semester grade is simply the average of 2 quarters

## Usage Examples

### Get Student's 1st Semester Grades
```php
$firstSemGrades = Grade::where('student_id', 3)
    ->where('semester', '1st')
    ->where('school_year_id', 1)
    ->with(['subject', 'faculty'])
    ->get();
```

### Get Student's Complete Academic Record
```php
$allGrades = Grade::where('student_id', 3)
    ->where('school_year_id', 1)
    ->orderBy('semester')
    ->orderBy('subject_id')
    ->with(['subject', 'faculty'])
    ->get();

// Group by semester
$gradesBySemester = $allGrades->groupBy('semester');
```

### Calculate Overall GPA
```php
$semesterAverages = Grade::where('student_id', 3)
    ->where('school_year_id', 1)
    ->whereNotNull('semester_grade')
    ->get()
    ->groupBy('semester')
    ->map(function($semesterGrades) {
        return $semesterGrades->avg('semester_grade');
    });

$overallGPA = $semesterAverages->avg();
```

## Migration Instructions

1. **Backup existing data** if any grades exist
2. **Run the new migration**: `php artisan migrate`
3. **Update controllers** to work with new structure
4. **Update frontend components** to handle semester-based grading
5. **Test with sample data** to ensure everything works correctly

## Frontend Implications

### Grade Input Interface
- **Semester Selection**: Faculty must select which semester they're entering grades for
- **Quarter Labels**: Display "Q1 & Q2" for 1st semester, "Q3 & Q4" for 2nd semester
- **Subject Context**: Show which subjects are available for the selected semester

### Grade Display
- **Separate Semester Views**: Show 1st and 2nd semester grades separately
- **Subject Lists**: Different subjects per semester
- **Progress Tracking**: Track completion by semester, not by absolute quarters

This design perfectly matches the Philippine SHS system where students take different subjects in each semester, and grades are calculated semester by semester.
