# Database Normalization Documentation

## Overview
This document outlines the database normalization improvements made to achieve proper 3NF (Third Normal Form) compliance and eliminate data redundancy.

## Issues Identified and Fixed

### 1. **Removed Redundant `year_level` from `subjects` table**
- **Issue**: Year level was duplicated since subjects are tied to strands, and sections already contain year level information
- **Migration**: `2025_08_21_095300_remove_year_level_from_subjects_table.php`
- **Impact**: Eliminates data redundancy and ensures year level is derived from section relationships

### 2. **Fixed Foreign Key References in `faculties` table**
- **Issue**: `registrar_id` incorrectly referenced `users` table instead of `registrars` table
- **Migration**: `2025_08_21_095301_fix_faculties_foreign_key_reference.php`
- **Impact**: Proper referential integrity and cleaner relationship structure

### 3. **Fixed Foreign Key References in `coordinators` table**
- **Issue**: `registrar_id` incorrectly referenced `users` table instead of `registrars` table
- **Migration**: `2025_08_21_095302_fix_coordinators_foreign_key_reference.php`
- **Impact**: Consistent foreign key relationships across all role tables

### 4. **Added `semester_id` to `grades` table**
- **Issue**: Grades lacked proper temporal context (only had school_year_id)
- **Migration**: `2025_08_21_095303_add_semester_id_to_grades_table.php`
- **Impact**: Grades are now properly tied to specific semesters for accurate academic records

### 5. **Added Unique Constraints for Data Integrity**
- **Migration**: `2025_08_21_095304_add_unique_constraints_for_data_integrity.php`
- **Constraints Added**:
  - Student enrollment uniqueness per school year
  - Grade uniqueness per student/subject/semester
  - Class enrollment uniqueness per student
  - Subject assignment uniqueness per semester
  - Strand name uniqueness
  - Section name uniqueness within strand/year level

### 6. **Removed Redundant `year_level` from `semesters` table**
- **Issue**: Year level in semesters was potentially redundant
- **Migration**: `2025_08_21_095305_remove_year_level_from_semesters_table.php`
- **Impact**: Cleaner semester structure focused on temporal aspects

### 7. **Removed Unnecessary `registrar_id` from `faculties` table**
- **Issue**: Creates unnecessary dependency and poor normalization
- **Migration**: `2025_08_21_095306_remove_registrar_id_from_faculties_table.php`
- **Impact**: Cleaner role separation, manage through application permissions

### 8. **Removed Unnecessary `registrar_id` from `coordinators` table**
- **Issue**: Creates unnecessary dependency and poor normalization  
- **Migration**: `2025_08_21_095307_remove_registrar_id_from_coordinators_table.php`
- **Impact**: Cleaner role separation, manage through application permissions

## Database Structure After Normalization

### Core Entity Tables
- `users` - Base user information
- `registrars` - Registrar role extension
- `faculties` - Faculty role extension
- `coordinators` - Coordinator role extension
- `students` - Student role extension

### Academic Structure Tables
- `school_years` - Academic year periods
- `semesters` - Semester periods within school years
- `strands` - Academic tracks/programs
- `sections` - Class groupings with year level and strand
- `subjects` - Course subjects tied to strands

### Relationship Tables
- `enrollments` - Student enrollment records
- `grades` - Student grades with proper semester context
- `class` - Class schedules
- `class_details` - Student-class enrollment junction
- `semester_subject` - Subject-semester assignments

## How to Apply Migrations

```bash
# Run all pending migrations
php artisan migrate

# Or run migrations one by one to see progress
php artisan migrate --step
```

## Benefits Achieved

1. **Eliminated Data Redundancy**: Removed duplicate year_level fields
2. **Improved Referential Integrity**: Fixed incorrect foreign key relationships
3. **Enhanced Data Consistency**: Added unique constraints to prevent duplicate records
4. **Better Temporal Context**: Grades now properly reference semesters
5. **Cleaner Schema**: More focused table structures following normalization principles

## Normalization Level Achieved
The database now complies with **Third Normal Form (3NF)**:
- ✅ **1NF**: All attributes contain atomic values
- ✅ **2NF**: All non-key attributes fully depend on primary keys
- ✅ **3NF**: No transitive dependencies between non-key attributes
