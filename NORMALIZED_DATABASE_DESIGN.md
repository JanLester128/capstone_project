# Normalized Database Design - Single Source of Truth

## **🎯 NEW PROPOSED STRUCTURE**

### **Data Flow:**
1. **Student submits enrollment** → Data goes to `student_personal_info` + `student_strand_preferences` + minimal `enrollments` record
2. **Faculty/Coordinator reviews** → Gets data from `student_personal_info` + `student_strand_preferences` via `enrollments` relationship
3. **Student gets approved** → Creates `class_details` records with assigned classes
4. **Student schedules** → Retrieved from `class_details` → `class` → `subjects` + `sections`

### **Table Structure:**

#### **1. STUDENT_PERSONAL_INFO (Personal Data Only)**
```sql
- id
- user_id (FK to users)
- lrn
- grade_level  
- birthdate, age, sex, address, religion
- guardian_name, guardian_contact, guardian_relationship
- previous_school, student_status (new/transferee)
- documents (JSON: report_card, psa_birth_certificate, etc.)
- created_at, updated_at
```

#### **2. STUDENT_STRAND_PREFERENCES (Strand Choices)**
```sql
- id
- student_personal_info_id (FK to student_personal_info)
- strand_id (FK to strands)
- preference_order (1, 2, 3)
- created_at, updated_at
```

#### **3. ENROLLMENTS (Enrollment Process Tracking)**
```sql
- id
- student_personal_info_id (FK to student_personal_info) 
- school_year_id (FK to school_years)
- status (pending, approved, rejected, enrolled)
- assigned_strand_id (FK to strands) - set when approved
- assigned_section_id (FK to sections) - set when approved
- coordinator_id (FK to users) - who reviewed
- coordinator_notes
- submitted_at, reviewed_at
- created_at, updated_at
```

#### **4. CLASS_DETAILS (Final Enrollment - Student-Class Assignment)**
```sql
- id
- enrollment_id (FK to enrollments)
- class_id (FK to class table - which has subject, faculty, schedule)
- enrollment_status (enrolled, dropped, completed)
- enrolled_at
- created_at, updated_at
```

#### **5. CLASS (Class Schedules)**
```sql
- id
- subject_id (FK to subjects)
- section_id (FK to sections) 
- faculty_id (FK to users)
- school_year_id (FK to school_years)
- day_of_week, start_time, end_time, room
- semester, is_active
```

## **🔄 RELATIONSHIPS:**

```php
// StudentPersonalInfo Model
public function user() { return $this->belongsTo(User::class); }
public function strandPreferences() { return $this->hasMany(StudentStrandPreference::class); }
public function enrollments() { return $this->hasMany(Enrollment::class); }

// StudentStrandPreference Model  
public function studentPersonalInfo() { return $this->belongsTo(StudentPersonalInfo::class); }
public function strand() { return $this->belongsTo(Strand::class); }

// Enrollment Model
public function studentPersonalInfo() { return $this->belongsTo(StudentPersonalInfo::class); }
public function schoolYear() { return $this->belongsTo(SchoolYear::class); }
public function assignedStrand() { return $this->belongsTo(Strand::class, 'assigned_strand_id'); }
public function assignedSection() { return $this->belongsTo(Section::class, 'assigned_section_id'); }
public function coordinator() { return $this->belongsTo(User::class, 'coordinator_id'); }
public function classDetails() { return $this->hasMany(ClassDetail::class); }

// ClassDetail Model
public function enrollment() { return $this->belongsTo(Enrollment::class); }
public function class() { return $this->belongsTo(ClassSchedule::class, 'class_id'); }

// ClassSchedule Model
public function subject() { return $this->belongsTo(Subject::class); }
public function section() { return $this->belongsTo(Section::class); }
public function faculty() { return $this->belongsTo(User::class, 'faculty_id'); }
public function classDetails() { return $this->hasMany(ClassDetail::class, 'class_id'); }
```

## **💡 BENEFITS:**

### **1. No Data Redundancy:**
- LRN stored only in `student_personal_info`
- Grade level stored only in `student_personal_info`
- Strand preferences in dedicated table
- Class assignments in `class_details`

### **2. Clean Data Flow:**
```
Student Enrollment:
User → StudentPersonalInfo → StudentStrandPreferences → Enrollment (pending)

Faculty Review:
Enrollment → StudentPersonalInfo (get student data)
Enrollment → StudentStrandPreferences (get strand choices)

Student Approval:
Enrollment (approved) → ClassDetails (assign to classes)

Student Schedule:
ClassDetails → ClassSchedule → Subject + Faculty + Schedule
```

### **3. Single Source Queries:**
```php
// Get student's current schedule
$schedule = ClassDetail::with(['class.subject', 'class.faculty', 'class.section'])
    ->whereHas('enrollment', function($q) use ($studentId) {
        $q->whereHas('studentPersonalInfo', function($q2) use ($studentId) {
            $q2->where('user_id', $studentId);
        });
    })
    ->where('enrollment_status', 'enrolled')
    ->get();

// Get student's personal info + enrollment status
$student = StudentPersonalInfo::with(['enrollments.assignedStrand', 'strandPreferences.strand'])
    ->where('user_id', $studentId)
    ->first();
```

## **🔧 IMPLEMENTATION BENEFITS:**

1. **Faculty can see student info** via `enrollment → studentPersonalInfo`
2. **No redundant data** - each piece of information stored once
3. **Proper normalization** - follows database best practices
4. **Easy schedule retrieval** via `classDetails → class → subject/faculty`
5. **Clean enrollment workflow** - clear data progression
6. **Flexible class assignment** - students can be assigned to specific classes
7. **Historical tracking** - can track enrollment changes over time
