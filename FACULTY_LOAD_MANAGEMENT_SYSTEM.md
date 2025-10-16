# Faculty Load Management & Academic Calendar System

## Overview

This system implements comprehensive faculty load management and academic calendar functionality for the Laravel + React (Inertia.js) capstone project. It ensures that each faculty member has a maximum of 5 teaching loads per school year or semester, following Nielsen's 10 HCI principles for optimal user experience.

## System Architecture

### Database Structure

#### 1. Faculty Loads Table (`faculty_loads`)
```sql
- id (Primary Key)
- faculty_id (Foreign Key to users)
- school_year_id (Foreign Key to school_years)
- total_loads (Integer, default: 0)
- max_loads (Integer, default: 5)
- is_overloaded (Boolean, default: false)
- load_notes (Text, nullable)
- assigned_by (Foreign Key to users, nullable)
- assigned_at (Timestamp, nullable)
- created_at, updated_at
- UNIQUE constraint on (faculty_id, school_year_id)
```

#### 2. Enhanced School Years Table
```sql
Added fields for Academic Calendar:
- enrollment_start (Date, nullable)
- enrollment_end (Date, nullable)
- quarter_1_start through quarter_4_end (Date, nullable)
- grading_deadline (Date, nullable)
- is_enrollment_open (Boolean, default: false)
```

### Models

#### 1. FacultyLoad Model
- **Relationships**: faculty(), schoolYear(), assignedBy(), classes()
- **Methods**: 
  - `checkOverload()`: Validates if faculty exceeds load limit
  - `updateLoadCount()`: Recalculates total loads from active classes
  - `getRemainingLoadsAttribute()`: Computed remaining capacity
  - `getUtilizationPercentageAttribute()`: Load utilization percentage

#### 2. Enhanced SchoolYear Model
- **New Methods**:
  - `isEnrollmentOpen()`: Checks if enrollment period is active
  - `getCurrentQuarter()`: Returns current quarter (1-4) based on date
  - `isGradingOpen()`: Validates if grading is still allowed
  - `getSemesterInfo()`: Returns complete semester structure information

#### 3. Enhanced User Model
- **New Relationships**: 
  - `facultyLoads()`: All faculty load records
  - `currentFacultyLoad()`: Current active school year load
  - `assignedLoads()`: Loads assigned by this user (registrar)

## Features Implementation

### 1. Load Assignment by Registrar

**Interface**: `FacultyLoadManagement.jsx`
- Visual faculty load overview with utilization percentages
- Real-time load validation and conflict detection
- Drag-and-drop or modal-based assignment interface
- Color-coded load status indicators

**Controller**: `FacultyLoadController.php`
- `assignLoad()`: Creates new class assignments with validation
- `removeLoad()`: Removes class assignments and updates counts
- `updateLoadLimit()`: Adjusts maximum load limits per faculty
- `checkScheduleConflicts()`: Validates time conflicts

**Validation Rules**:
- Maximum 5 loads per faculty (configurable)
- No schedule conflicts (same day/time)
- No duplicate subject-section assignments
- Faculty must exist and have valid role

### 2. Faculty Load Dashboard

**Interface**: `Faculty_LoadDashboard.jsx`
- Personal load utilization display
- Weekly schedule visualization
- Class details with student counts
- Real-time notifications and alerts

**Features**:
- Load utilization percentage with color coding
- Weekly timetable grid view
- Quick access to class management
- Academic calendar integration

### 3. Academic Calendar Management

**Interface**: `AcademicCalendar.jsx`
- Semester and quarter date management
- Enrollment period configuration
- Grading deadline settings
- Visual calendar overview

**Controller**: `AcademicCalendarController.php`
- `updateCalendar()`: Updates semester structure
- `toggleEnrollment()`: Opens/closes enrollment periods
- `getCalendarInfo()`: API for calendar data
- `getEnrollmentPeriods()`: Enrollment status for all years
- `getGradingPeriods()`: Quarter information for faculty

### 4. Notification System

**Controller**: `NotificationController.php`
- Faculty load notifications (overload, near limit, new assignments)
- Registrar notifications (overloaded faculty, unassigned faculty)
- Academic calendar notifications (enrollment periods, grading deadlines)

**Types of Notifications**:
- **Error**: Overloaded faculty, missed deadlines
- **Warning**: Near capacity, approaching deadlines
- **Info**: New assignments, enrollment periods
- **Success**: Successful operations

## HCI Principles Implementation

### 1. Visibility of System Status
- Real-time load utilization displays
- Color-coded status indicators
- Progress bars and percentage displays
- System health indicators

### 2. Match Between System and Real World
- Familiar academic terminology
- Traditional timetable layouts
- Natural workflow progression
- Intuitive navigation patterns

### 3. User Control and Freedom
- Easy assignment removal
- Undo capabilities for load changes
- Clear navigation paths
- Emergency override options

### 4. Consistency and Standards
- Unified design language across interfaces
- Consistent interaction patterns
- Standard academic conventions
- Predictable system behavior

### 5. Error Prevention
- Real-time validation
- Conflict detection
- Load limit enforcement
- Confirmation dialogs for critical actions

### 6. Recognition Rather Than Recall
- Visual load indicators
- Contextual information display
- Helpful tooltips and descriptions
- Clear labeling and iconography

### 7. Flexibility and Efficiency of Use
- Bulk assignment capabilities
- Keyboard shortcuts
- Quick action buttons
- Customizable load limits

### 8. Aesthetic and Minimalist Design
- Clean, focused interfaces
- Minimal cognitive load
- Essential information prioritization
- Uncluttered layouts

### 9. Help Users Recognize, Diagnose, and Recover from Errors
- Clear error messages
- Specific problem identification
- Solution suggestions
- Recovery action guidance

### 10. Help and Documentation
- Contextual help text
- System usage guidelines
- Policy explanations
- Quick reference guides

## API Endpoints

### Faculty Load Management
```
GET    /registrar/faculty-loads              - Load management interface
POST   /registrar/faculty-loads/assign       - Assign new load
DELETE /registrar/faculty-loads/{classId}    - Remove load
PUT    /registrar/faculty-loads/{facultyId}/limit - Update load limit
POST   /registrar/faculty-loads/check-conflicts - Check schedule conflicts
```

### Academic Calendar
```
GET    /registrar/academic-calendar          - Calendar management interface
PUT    /registrar/school-years/{id}/calendar - Update calendar
PUT    /registrar/school-years/{id}/toggle-enrollment - Toggle enrollment
GET    /registrar/enrollment-periods         - Get enrollment periods
GET    /registrar/grading-periods/{id?}      - Get grading periods
```

### Faculty Dashboard
```
GET    /faculty/loads                        - Faculty load dashboard
```

### Notifications
```
GET    /notifications/faculty-loads          - Faculty load notifications
GET    /notifications/registrar-loads        - Registrar load notifications
GET    /notifications/academic-calendar      - Calendar notifications
```

## Security Features

### Access Control
- Role-based permissions (registrar, faculty, coordinator)
- Faculty can only view their own loads
- Registrar has full assignment privileges
- Coordinators have teaching + coordination access

### Data Validation
- Server-side validation for all inputs
- CSRF protection on all forms
- SQL injection prevention
- XSS protection in displays

### Audit Trail
- All load assignments logged
- Change tracking with user attribution
- Academic calendar modifications logged
- Notification delivery tracking

## Load Policy Configuration

### Default Settings
- Maximum loads per faculty: 5
- Load types allowed:
  - Single subject with multiple sections (up to 5)
  - Multiple subjects across different sections (total ≤ 5)

### Customizable Parameters
- Maximum load limits per faculty
- Overload approval workflows
- Schedule conflict tolerance
- Academic calendar templates

## Integration Points

### Existing System Integration
- Uses existing `class` table for assignments
- Integrates with `users` table for faculty data
- Connects to `school_years` for academic periods
- Links with `subjects` and `sections` for scheduling

### Grade Management Integration
- Academic calendar drives grading periods
- Load assignments determine grade input access
- Quarter dates control grade submission deadlines
- Faculty loads affect grade approval workflows

### Enrollment System Integration
- Enrollment periods from academic calendar
- Faculty loads determine class availability
- Student assignments respect faculty capacity
- Load balancing affects section creation

## Deployment Requirements

### Database Migrations
```bash
php artisan migrate
```

### Required Migrations
- `2025_10_13_214200_create_faculty_loads_table.php`
- `2025_10_13_214300_add_academic_calendar_fields_to_school_years.php`

### Seeder Updates
- No default data seeding (registrar creates all data)
- Faculty load records created automatically on assignment
- Academic calendar setup through interface

## Testing Scenarios

### Load Assignment Testing
1. Assign loads within limit (should succeed)
2. Attempt to exceed 5-load limit (should fail with validation)
3. Create schedule conflicts (should fail with conflict detection)
4. Remove loads and verify count updates
5. Test bulk assignment operations

### Academic Calendar Testing
1. Set up complete semester structure
2. Test enrollment period toggles
3. Validate quarter date sequences
4. Test grading deadline enforcement
5. Verify notification triggers

### Permission Testing
1. Faculty accessing other faculty loads (should fail)
2. Registrar managing all loads (should succeed)
3. Coordinator viewing own loads (should succeed)
4. Student accessing load management (should fail)

## Performance Considerations

### Database Optimization
- Indexed foreign keys for fast lookups
- Unique constraints prevent duplicate assignments
- Efficient queries with proper relationships
- Cached load calculations where appropriate

### Frontend Optimization
- Lazy loading for large faculty lists
- Debounced search and filtering
- Optimistic UI updates
- Efficient re-rendering strategies

## Maintenance and Monitoring

### System Health Checks
- Faculty load distribution monitoring
- Academic calendar compliance tracking
- Notification delivery verification
- Performance metric collection

### Regular Maintenance Tasks
- Load count verification and correction
- Expired notification cleanup
- Academic calendar template updates
- System usage analytics review

## Future Enhancements

### Planned Features
- Advanced load balancing algorithms
- Automated schedule optimization
- Mobile-responsive interfaces
- Integration with external calendar systems

### Scalability Considerations
- Multi-campus support
- Department-level load management
- Advanced reporting and analytics
- API for third-party integrations

---

This Faculty Load Management and Academic Calendar system provides a comprehensive solution for managing teaching assignments while maintaining academic calendar structure, following best practices in user experience design and system architecture.
