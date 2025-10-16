# Database Migration Revision Summary

## Core Schema Migrations (KEEP THESE)

### 1. Foundation Tables
- `0001_01_01_000000_create_users_table.php` ✅ **REVISED**
- `0001_01_01_000001_create_cache_table.php` ✅ **KEEP**
- `0001_01_01_000002_create_jobs_table.php` ✅ **KEEP**

### 2. Student Information System
- `2025_08_09_125837_create_student_personal_info_table.php` ✅ **REVISED**
- `2025_01_01_000003_create_transferee_previous_schools_table.php` ✅ **NEW**
- `2025_01_01_000004_create_transferee_subject_credits_table.php` ✅ **NEW**
- `2025_01_01_000005_create_student_strand_preferences_table.php` ✅ **NEW**

### 3. Academic Structure
- `2025_08_09_125810_create_strands_table.php` ✅ **KEEP**
- `2025_08_09_125754_create_school_years_table.php` ✅ **REVISED**
- `2025_08_09_125819_create_sections_table.php` ✅ **REVISED**
- `2025_08_09_125836_create_subjects_table.php` ✅ **REVISED**

### 4. Enrollment & Class Management
- `2025_08_09_125930_create_enrollments_table.php` ✅ **REVISED**
- `2025_08_09_125937_create_class_table.php` ✅ **REVISED**
- `2025_08_13_084816_create_class_details_table.php` ✅ **REVISED**

### 5. Grading System
- `2025_08_09_125935_create_grades_table.php` ✅ **REVISED**

### 6. Authentication
- `2025_08_11_142641_create_personal_access_tokens_table.php` ✅ **KEEP**
- `2025_08_30_210800_create_password_resets_table.php` ✅ **KEEP**
- `2025_09_10_081303_create_sessions_table.php` ✅ **KEEP**

## Migrations to REMOVE (Conflicts with new schema)

### Redundant/Conflicting Migrations
- `2025_08_09_125838_create_student_strand_preferences_table.php` ❌ **REMOVE** (replaced by new clean version)
- `2025_01_04_014900_fix_duplicate_school_years.php` ❌ **REMOVE**
- `2025_01_04_015500_add_guardian_fields_safe.php` ❌ **REMOVE**
- `2025_01_04_063100_remove_guardian_address_column.php` ❌ **REMOVE**
- `2025_01_04_065100_reorder_document_columns.php` ❌ **REMOVE**
- `2025_01_04_065200_reorder_columns_safe.php` ❌ **REMOVE**
- `2025_01_13_120000_drop_teacher_id_from_sections_table.php` ❌ **REMOVE**
- `2025_01_13_143000_ensure_enrollment_fields_exist.php` ❌ **REMOVE**
- `2025_01_13_143100_fix_enrollment_control_immediately.php` ❌ **REMOVE**
- `2025_01_13_143200_fix_enrollment_dates_to_current.php` ❌ **REMOVE**

### Field Addition/Modification Migrations (No longer needed)
- All migrations from `2025_01_20_*` to `2025_10_13_*` ❌ **REMOVE**

## Database Schema Summary

### Tables and Relationships
```sql
users (id, username, email, password, role, is_coordinator)
├── student_personal_info (user_id → users.id)
│   ├── transferee_previous_schools (student_personal_info_id → student_personal_info.id)
│   │   └── transferee_subject_credits (previous_school_id → transferee_previous_schools.id)
│   └── student_strand_preferences (student_personal_info_id → student_personal_info.id)
├── sections (adviser_id → users.id)
├── subjects (faculty_id → users.id)
├── class (faculty_id → users.id)
├── class_details (student_id → users.id)
└── grades (student_id, faculty_id, approved_by → users.id)

strands (id, code, name, description)
├─ds.id)
├── student_strand_prefe─ sections (strand_id → strands.id)
├── subjects (strand_id → stranrences (strand_id → strands.id)
└── enrollments (strand_id → strands.id)

school_years (id, year_start, year_end, semester, start_date, end_date)
├── sections (school_year_id → school_years.id)
├── subjects (school_year_id → school_years.id)
├── class (school_year_id → school_years.id)
├── grades (school_year_id → school_years.id)
└── enrollments (school_year_id → school_years.id)

enrollments (student_personal_info_id, strand_id, assigned_section_id, school_year_id, coordinator_id)
├── class_details (enrollment_id → enrollments.id)

class (section_id, subject_id, faculty_id, school_year_id)
├── class_details (class_id → class.id)
└── grades (class_id → class.id)
```

## Migration Order (Dependency-based)
1. users
2. strands
3. school_years
4. student_personal_info
5. transferee_previous_schools
6. sections
7. subjects
8. transferee_subject_credits
9. student_strand_preferences
10. enrollments
11. class
12. class_details
13. grades

## Next Steps
1. **Backup current database**
2. **Remove conflicting migration files**
3. **Run fresh migration**: `php artisan migrate:fresh`
4. **Seed with sample data**
5. **Test all relationships**

## Key Changes Made
- ✅ Simplified users table to match exact schema
- ✅ Enhanced student_personal_info with proper fields
- ✅ Added transferee support tables
- ✅ Fixed all foreign key relationships
- ✅ Implemented proper enrollment workflow
- ✅ Enhanced grades table with quarterly system
- ✅ Added proper constraints and indexes
