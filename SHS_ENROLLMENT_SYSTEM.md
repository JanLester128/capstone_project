# SHS Grade 11-12 Enrollment System

## Overview
This system implements Senior High School (SHS) enrollment logic with Grade 11 self-enrollment and Grade 12 auto/self-enrollment, plus Certificate of Registration (COR) generation.

## Features Implemented

### 1. Grade 11 Enrollment (Self-Enrollment)
- **Route**: `/enroll/grade-11`
- **Method**: Students must self-enroll (entry point to SHS)
- **Validation**: Prevents duplicate enrollments for same school year
- **Process**: Submit → Coordinator Review → Approval → Enrolled

### 2. Grade 12 Enrollment (Auto/Manual)
- **Route**: `/enroll/grade-12`
- **Auto-Enrollment**: If Grade 11 enrollment exists, faculty/coordinator approves
- **Self-Enrollment**: If no Grade 11 enrollment exists, student can self-enroll
- **Validation**: System checks for Grade 11 enrollment before allowing Grade 12

### 3. Faculty Dashboard for Auto-Enrollments
- **Route**: `/faculty/auto-enrollments`
- **Features**: 
  - View students eligible for Grade 12 auto-enrollment
  - Approve individual or bulk enrollments
  - Maintain strand and section assignments from Grade 11

### 4. Certificate of Registration (COR)
- **View Route**: `/cor/{enrollment}`
- **PDF Route**: `/cor/{enrollment}/pdf`
- **Features**:
  - Printable layout grouped by semester
  - PDF generation via laravel-dompdf
  - Student info, subjects, signatures
  - Auto-generated issue date

## Database Schema Changes

### New Fields in `enrollments` table:
```sql
- grade_level: enum('Grade 11', 'Grade 12')
- has_grade_11_enrollment: boolean
- previous_enrollment_id: foreign key to enrollments
- enrollment_method: enum('self', 'auto', 'manual')
- cor_generated: boolean
- cor_generated_at: timestamp
- cor_subjects: text (JSON)
```

## Controllers

### SHSEnrollmentController
- `showGrade11Form()` - Display Grade 11 enrollment form
- `enrollGrade11()` - Process Grade 11 enrollment
- `showGrade12Form()` - Display Grade 12 enrollment form with validation
- `enrollGrade12()` - Process Grade 12 self-enrollment
- `facultyAutoEnrollments()` - Faculty dashboard for auto-enrollments
- `approveAutoEnrollment()` - Approve Grade 12 auto-enrollment
- `viewCOR()` - Display COR
- `generateCORPDF()` - Generate COR PDF

## Routes

### Student Routes (Protected)
```php
Route::middleware(['auth:sanctum'])->group(function () {
    // Grade 11 Enrollment
    Route::get('/enroll/grade-11', [SHSEnrollmentController::class, 'showGrade11Form']);
    Route::post('/enroll/grade-11', [SHSEnrollmentController::class, 'enrollGrade11']);
    
    // Grade 12 Enrollment
    Route::get('/enroll/grade-12', [SHSEnrollmentController::class, 'showGrade12Form']);
    Route::post('/enroll/grade-12', [SHSEnrollmentController::class, 'enrollGrade12']);
    
    // COR
    Route::get('/cor/{enrollment}', [SHSEnrollmentController::class, 'viewCOR']);
    Route::get('/cor/{enrollment}/pdf', [SHSEnrollmentController::class, 'generateCORPDF']);
});
```

### Faculty Routes (Protected)
```php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/faculty/auto-enrollments', [SHSEnrollmentController::class, 'facultyAutoEnrollments']);
    Route::post('/faculty/approve-enrollment', [SHSEnrollmentController::class, 'approveAutoEnrollment']);
});
```

## React Components

### Student Components
1. **Grade11Enrollment.jsx** - Grade 11 enrollment form
2. **Grade12Enrollment.jsx** - Grade 12 enrollment form with conditional logic
3. **CORView.jsx** - Certificate of Registration display with print/download

### Faculty Components
1. **AutoEnrollments.jsx** - Faculty dashboard for Grade 12 auto-enrollment approval

## Enrollment Logic Flow

### Grade 11 Student Flow
1. Student logs in
2. Navigates to `/enroll/grade-11`
3. Selects strand and uploads documents
4. Submits enrollment (status: pending)
5. Coordinator reviews and approves
6. Student becomes eligible for Grade 12 auto-enrollment

### Grade 12 Auto-Enrollment Flow
1. Faculty accesses `/faculty/auto-enrollments`
2. Views students with completed Grade 11
3. Approves auto-enrollment
4. Student automatically enrolled in Grade 12
5. COR generated and available

### Grade 12 Manual Enrollment Flow
1. Student (without Grade 11 in system) navigates to `/enroll/grade-12`
2. System checks for Grade 11 enrollment
3. If none found, allows self-enrollment
4. Student provides previous school info
5. Submits enrollment for coordinator review

## Validation Rules

### Grade 11 Validation
- Must not already be enrolled for current school year
- Strand selection required
- Document uploads optional

### Grade 12 Validation
- Check if Grade 11 exists for student
- If Grade 11 exists → deny self-enrollment, show auto-enrollment notice
- If no Grade 11 → allow self-enrollment with previous school info
- Prevent duplicate Grade 12 enrollments

## UI/UX Features

### Conditional Logic
- **Grade 12 Notice**: "If you were not enrolled in this system during Grade 11, you must submit your own Grade 12 enrollment."
- **Auto-Enrollment Notice**: "You will be automatically enrolled in Grade 12 by your coordinator."
- **Enrollment Button**: Disabled if already enrolled or not eligible

### Faculty Dashboard Features
- **Adviser Notice**: Shows students eligible for auto-enrollment
- **Bulk Actions**: Select all/individual approval
- **Status Tracking**: Visual indicators for enrollment status

## COR Generation

### Content Includes
- Student information (name, LRN, grade, strand, section)
- School year information
- Subjects grouped by semester
- Signature placeholders
- Issue date and document ID

### Output Options
- **Web View**: Responsive layout with print/download buttons
- **PDF Download**: Generated via laravel-dompdf
- **Print**: Browser print with optimized styles

## Installation Requirements

### Dependencies
```bash
composer require barryvdh/laravel-dompdf
```

### Migration
```bash
php artisan migrate
```

## Usage Examples

### Access Grade 11 Enrollment
```
GET /enroll/grade-11
```

### Access Grade 12 Enrollment
```
GET /enroll/grade-12
```

### Faculty Auto-Enrollment Dashboard
```
GET /faculty/auto-enrollments
```

### View Student COR
```
GET /cor/{enrollment_id}
```

### Download COR PDF
```
GET /cor/{enrollment_id}/pdf
```

## Security Features

- Authentication required for all enrollment routes
- Authorization checks for COR access
- Student can only access their own COR
- Faculty can approve enrollments for their assigned students
- CSRF protection on all forms

## Error Handling

- Duplicate enrollment prevention
- Grade 11 prerequisite validation
- File upload validation
- Database transaction rollback on errors
- User-friendly error messages

## Testing Checklist

### Grade 11 Enrollment
- [ ] Form displays correctly
- [ ] Strand selection works
- [ ] Document upload functions
- [ ] Duplicate prevention works
- [ ] Enrollment submission succeeds

### Grade 12 Enrollment
- [ ] Auto-enrollment notice shows for Grade 11 students
- [ ] Self-enrollment form shows for non-Grade 11 students
- [ ] Validation prevents Grade 11 students from self-enrolling
- [ ] Previous school info required for self-enrollment

### Faculty Dashboard
- [ ] Eligible students display correctly
- [ ] Individual approval works
- [ ] Bulk approval functions
- [ ] Status updates properly

### COR Generation
- [ ] COR displays student information correctly
- [ ] Subjects grouped by semester
- [ ] Print functionality works
- [ ] PDF download generates correctly
- [ ] Authorization prevents unauthorized access

## Future Enhancements

1. **Email Notifications**: Notify students of enrollment status changes
2. **SMS Integration**: Send COR download links via SMS
3. **Digital Signatures**: Electronic signature capture
4. **Advanced Reporting**: Enrollment statistics and analytics
5. **Mobile App**: React Native app for mobile access
6. **QR Code Integration**: QR codes on COR for verification

## Support

For technical support or questions about the SHS enrollment system, contact the development team or refer to the Laravel and React documentation for framework-specific issues.
