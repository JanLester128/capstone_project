<?php

/**
 * NORMALIZED DATABASE USAGE EXAMPLES
 * Demonstrating how to use the new single source of truth structure
 */

// ===== STUDENT ENROLLMENT PROCESS =====

// 1. Student submits enrollment form
$studentPersonalInfo = StudentPersonalInfo::create([
    'user_id' => $userId,
    'lrn' => $validated['lrn'],
    'grade_level' => $validated['gradeLevel'],
    'student_status' => $validated['studentStatus'],
    'previous_school' => $validated['previousSchool'],
    'birthdate' => $validated['birthdate'],
    'address' => $validated['address'],
    'guardian_name' => $validated['guardianName'],
    'guardian_contact' => $validated['guardianContact'],
    'documents' => json_encode([
        'report_card' => $validated['reportCard'],
        'psa_birth_certificate' => $validated['psaBirthCertificate']
    ])
]);

// 2. Store strand preferences
foreach ($validated['strandChoices'] as $index => $strandId) {
    StudentStrandPreference::create([
        'student_personal_info_id' => $studentPersonalInfo->id,
        'strand_id' => $strandId,
        'preference_order' => $index + 1
    ]);
}

// 3. Create enrollment record (pending status)
$enrollment = Enrollment::create([
    'student_personal_info_id' => $studentPersonalInfo->id,
    'school_year_id' => $activeSchoolYear->id,
    'status' => 'pending',
    'submitted_at' => now()
]);

// ===== FACULTY/COORDINATOR REVIEW =====

// Get all pending enrollments with student data
$pendingEnrollments = Enrollment::with([
    'studentPersonalInfo.user',
    'studentPersonalInfo.strandPreferences.strand',
    'schoolYear'
])
->where('status', 'pending')
->get();

// Display student information for review
foreach ($pendingEnrollments as $enrollment) {
    $student = $enrollment->studentPersonalInfo;
    $user = $student->user;
    
    echo "Student: {$user->firstname} {$user->lastname}\n";
    echo "LRN: {$student->lrn}\n";
    echo "Grade: {$student->grade_level}\n";
    echo "Status: {$student->student_status}\n";
    echo "Previous School: {$student->previous_school}\n";
    
    echo "Strand Preferences:\n";
    foreach ($student->strandPreferences as $preference) {
        echo "  {$preference->preference_order}. {$preference->strand->name}\n";
    }
}

// ===== ENROLLMENT APPROVAL =====

// Approve enrollment and assign strand/section
$enrollment->update([
    'status' => 'approved',
    'strand_id' => $approvedStrandId,
    'assigned_section_id' => $assignedSectionId,
    'coordinator_id' => auth()->id(),
    'coordinator_notes' => $coordinatorNotes,
    'reviewed_at' => now()
]);

// Create class assignments (class_details)
$classSchedules = ClassSchedule::where('section_id', $assignedSectionId)
    ->where('school_year_id', $enrollment->school_year_id)
    ->where('is_active', true)
    ->get();

foreach ($classSchedules as $classSchedule) {
    ClassDetail::create([
        'enrollment_id' => $enrollment->id,
        'class_id' => $classSchedule->id,
        'enrollment_status' => 'enrolled',
        'enrolled_at' => now()
    ]);
}

// ===== STUDENT SCHEDULE RETRIEVAL =====

// Get student's current schedule (NO REDUNDANT QUERIES!)
function getStudentSchedule($userId) {
    $studentPersonalInfo = StudentPersonalInfo::where('user_id', $userId)->first();
    
    if (!$studentPersonalInfo) {
        return collect();
    }
    
    $currentEnrollment = $studentPersonalInfo->currentEnrollment;
    
    if (!$currentEnrollment) {
        return collect();
    }
    
    return ClassDetail::with([
        'class.subject.strand',
        'class.section', 
        'class.faculty',
        'class.schoolYear'
    ])
    ->where('enrollment_id', $currentEnrollment->id)
    ->where('enrollment_status', 'enrolled')
    ->get()
    ->map(function($classDetail) {
        $class = $classDetail->class;
        return [
            'subject_name' => $class->subject->name,
            'subject_code' => $class->subject->code,
            'strand' => $class->subject->strand->name,
            'section' => $class->section->section_name,
            'faculty' => $class->faculty->firstname . ' ' . $class->faculty->lastname,
            'day_of_week' => $class->day_of_week,
            'start_time' => $class->start_time,
            'end_time' => $class->end_time,
            'room' => $class->room,
            'semester' => $class->semester
        ];
    });
}

// ===== FACULTY VIEWING STUDENTS =====

// Get all students assigned to a faculty member's classes
function getFacultyStudents($facultyId) {
    return ClassDetail::with([
        'enrollment.studentPersonalInfo.user',
        'enrollment.assignedStrand',
        'enrollment.assignedSection',
        'class.subject'
    ])
    ->whereHas('class', function($q) use ($facultyId) {
        $q->where('faculty_id', $facultyId);
    })
    ->where('enrollment_status', 'enrolled')
    ->get()
    ->map(function($classDetail) {
        $student = $classDetail->enrollment->studentPersonalInfo;
        $user = $student->user;
        
        return [
            'student_id' => $user->id,
            'student_name' => $user->firstname . ' ' . $user->lastname,
            'lrn' => $student->lrn,
            'grade_level' => $student->grade_level,
            'strand' => $classDetail->enrollment->assignedStrand->name,
            'section' => $classDetail->enrollment->assignedSection->section_name,
            'subject' => $classDetail->class->subject->name,
            'student_status' => $student->student_status
        ];
    });
}

// ===== BENEFITS ACHIEVED =====

/*
1. SINGLE SOURCE OF TRUTH:
   - LRN stored only in student_personal_info
   - Grade level stored only in student_personal_info  
   - Strand preferences in dedicated table
   - No data duplication

2. CLEAN RELATIONSHIPS:
   - student_personal_info → enrollments → class_details → class
   - All data flows through proper relationships
   - Easy to query and maintain

3. NORMALIZED STRUCTURE:
   - Each table has a single responsibility
   - No redundant columns
   - Proper foreign key relationships
   - Follows database best practices

4. EFFICIENT QUERIES:
   - Use relationships instead of complex JOINs
   - Eager loading prevents N+1 queries
   - Single queries instead of multiple table lookups

5. MAINTAINABLE CODE:
   - Clear data flow
   - Easy to understand relationships
   - Consistent patterns across controllers
   - Reduced complexity
*/
