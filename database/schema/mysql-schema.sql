/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `class`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `section_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `faculty_id` bigint unsigned DEFAULT NULL,
  `day_of_week` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `duration` int NOT NULL DEFAULT '60',
  `end_time` time NOT NULL,
  `semester` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1st Semester',
  `school_year` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2024-2025',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `school_year_id` bigint unsigned DEFAULT NULL,
  `enrollment_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_section_schedule` (`section_id`,`day_of_week`,`start_time`,`semester`,`school_year`),
  KEY `class_subject_id_foreign` (`subject_id`),
  KEY `class_faculty_id_foreign` (`faculty_id`),
  KEY `class_school_year_id_foreign` (`school_year_id`),
  KEY `class_enrollment_id_foreign` (`enrollment_id`),
  CONSTRAINT `class_enrollment_id_foreign` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_faculty_id_foreign` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `class_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_section_id_foreign` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `class_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `class_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `enrollment_id` bigint unsigned NOT NULL,
  `enrollment_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'enrolled',
  `section_id` bigint unsigned NOT NULL,
  `is_enrolled` tinyint(1) NOT NULL DEFAULT '1',
  `enrolled_at` timestamp NOT NULL DEFAULT '2025-10-06 22:21:59',
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_details_class_id_student_id_unique` (`class_id`,`student_id`),
  KEY `class_details_student_id_foreign` (`student_id`),
  KEY `class_details_enrollment_id_foreign` (`enrollment_id`),
  KEY `class_details_section_id_foreign` (`section_id`),
  CONSTRAINT `class_details_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_details_enrollment_id_foreign` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_details_section_id_foreign` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_details_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `student_personal_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_personal_info_id` bigint unsigned DEFAULT NULL,
  `student_id` bigint unsigned DEFAULT NULL,
  `student_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_lrn` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_school_attended` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `strand_id` bigint unsigned NOT NULL,
  `assigned_section_id` bigint unsigned DEFAULT NULL,
  `intended_grade_level` int NOT NULL DEFAULT '11',
  `grade_level` enum('Grade 11','Grade 12') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `has_grade_11_enrollment` tinyint(1) NOT NULL DEFAULT '0',
  `first_semester_completed` tinyint(1) NOT NULL DEFAULT '0',
  `second_semester_completed` tinyint(1) NOT NULL DEFAULT '0',
  `academic_year_completed` tinyint(1) NOT NULL DEFAULT '0',
  `eligible_for_progression` tinyint(1) NOT NULL DEFAULT '0',
  `progressed_at` datetime DEFAULT NULL,
  `progressed_by` bigint unsigned DEFAULT NULL,
  `school_year_id` bigint unsigned NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `enrollment_type` enum('regular','summer','transferee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regular',
  `summer_subjects` json DEFAULT NULL,
  `schedule_preference` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `academic_year_status` enum('in_progress','completed','failed','summer_required') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  `enrollment_date` timestamp NULL DEFAULT NULL,
  `coordinator_id` bigint unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `date_enrolled` date NOT NULL DEFAULT '2025-09-04',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `enrolled_by` bigint unsigned DEFAULT NULL,
  `previous_enrollment_id` bigint unsigned DEFAULT NULL,
  `enrollment_method` enum('self','auto','manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'self',
  `cor_generated` tinyint(1) NOT NULL DEFAULT '0',
  `cor_generated_at` timestamp NULL DEFAULT NULL,
  `cor_subjects` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `enrollments_student_id_school_year_id_unique` (`student_id`,`school_year_id`),
  UNIQUE KEY `unique_student_school_year_enrollment` (`student_id`,`school_year_id`),
  KEY `enrollments_strand_id_foreign` (`strand_id`),
  KEY `enrollments_school_year_id_foreign` (`school_year_id`),
  KEY `enrollments_coordinator_id_foreign` (`coordinator_id`),
  KEY `enrollments_progressed_by_foreign` (`progressed_by`),
  KEY `enrollments_assigned_section_id_foreign` (`assigned_section_id`),
  KEY `enrollments_enrolled_by_foreign` (`enrolled_by`),
  KEY `enrollments_student_personal_info_id_foreign` (`student_personal_info_id`),
  KEY `enrollments_previous_enrollment_id_foreign` (`previous_enrollment_id`),
  CONSTRAINT `enrollments_previous_enrollment_id_foreign` FOREIGN KEY (`previous_enrollment_id`) REFERENCES `enrollments` (`id`),
  CONSTRAINT `enrollments_student_personal_info_id_foreign` FOREIGN KEY (`student_personal_info_id`) REFERENCES `student_personal_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faculty_loads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_loads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `faculty_id` bigint unsigned NOT NULL,
  `school_year_id` bigint unsigned NOT NULL,
  `total_loads` int NOT NULL DEFAULT '0',
  `max_loads` int NOT NULL DEFAULT '5',
  `is_overloaded` tinyint(1) NOT NULL DEFAULT '0',
  `load_notes` text COLLATE utf8mb4_unicode_ci,
  `assigned_by` bigint unsigned DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `faculty_loads_faculty_id_school_year_id_unique` (`faculty_id`,`school_year_id`),
  KEY `faculty_loads_school_year_id_foreign` (`school_year_id`),
  KEY `faculty_loads_assigned_by_foreign` (`assigned_by`),
  CONSTRAINT `faculty_loads_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `faculty_loads_faculty_id_foreign` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `faculty_loads_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `faculty_id` bigint unsigned NOT NULL,
  `school_year_id` bigint unsigned NOT NULL,
  `class_id` bigint unsigned DEFAULT NULL,
  `semester` enum('1st','2nd') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Which semester (1st or 2nd)',
  `is_summer_grade` tinyint(1) NOT NULL DEFAULT '0',
  `original_failed_grade` decimal(5,2) DEFAULT NULL,
  `summer_completion_date` timestamp NULL DEFAULT NULL,
  `first_quarter` decimal(5,2) DEFAULT NULL COMMENT '1st Quarter Grade (1st sem) OR 3rd Quarter Grade (2nd sem)',
  `second_quarter` decimal(5,2) DEFAULT NULL COMMENT '2nd Quarter Grade (1st sem) OR 4th Quarter Grade (2nd sem)',
  `third_quarter` decimal(5,2) DEFAULT NULL COMMENT '3rd Quarter Grade',
  `fourth_quarter` decimal(5,2) DEFAULT NULL COMMENT '4th Quarter Grade',
  `semester_grade` decimal(5,2) DEFAULT NULL COMMENT 'Final grade for this semester (average of 2 quarters)',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Faculty remarks',
  `status` enum('ongoing','completed','incomplete','dropped','pending_approval','approved') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ongoing',
  `approval_status` enum('draft','pending_approval','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `submitted_for_approval_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_subject_semester` (`student_id`,`subject_id`,`semester`,`school_year_id`),
  KEY `grades_school_year_id_foreign` (`school_year_id`),
  KEY `grades_class_id_foreign` (`class_id`),
  KEY `idx_student_school_year` (`student_id`,`school_year_id`),
  KEY `idx_faculty_school_year` (`faculty_id`,`school_year_id`),
  KEY `idx_subject_semester` (`subject_id`,`semester`),
  KEY `grades_approved_by_foreign` (`approved_by`),
  CONSTRAINT `grades_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `grades_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_faculty_id_foreign` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grades_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `password_resets_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `school_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_years` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `year_start` int NOT NULL,
  `year_end` int NOT NULL,
  `semester` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `enrollment_open` tinyint(1) NOT NULL DEFAULT '1',
  `enrollment_start` datetime DEFAULT NULL,
  `enrollment_end` datetime DEFAULT NULL,
  `quarter_1_start` date DEFAULT NULL,
  `quarter_1_end` date DEFAULT NULL,
  `quarter_2_start` date DEFAULT NULL,
  `quarter_2_end` date DEFAULT NULL,
  `quarter_3_start` date DEFAULT NULL,
  `quarter_3_end` date DEFAULT NULL,
  `quarter_4_start` date DEFAULT NULL,
  `quarter_4_end` date DEFAULT NULL,
  `grading_deadline` date DEFAULT NULL,
  `is_enrollment_open` tinyint(1) NOT NULL DEFAULT '0',
  `is_current_academic_year` tinyint(1) NOT NULL DEFAULT '0',
  `allow_grade_progression` tinyint(1) NOT NULL DEFAULT '0',
  `current_semester` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `allow_faculty_cor_print` tinyint(1) NOT NULL DEFAULT '1',
  `allow_coordinator_cor_print` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_years_year_start_year_end_semester_unique` (`year_start`,`year_end`,`semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `section_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `year_level` int NOT NULL,
  `strand_id` bigint unsigned NOT NULL,
  `adviser_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `school_year_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sections_section_name_strand_id_year_level_unique` (`section_name`,`strand_id`,`year_level`),
  KEY `sections_strand_id_foreign` (`strand_id`),
  KEY `sections_school_year_id_foreign` (`school_year_id`),
  KEY `sections_adviser_id_index` (`adviser_id`),
  CONSTRAINT `sections_adviser_id_foreign` FOREIGN KEY (`adviser_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sections_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sections_strand_id_foreign` FOREIGN KEY (`strand_id`) REFERENCES `strands` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `strands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `strands` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `strands_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_personal_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_personal_info` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `lrn` varchar(20) DEFAULT NULL,
  `grade_level` varchar(10) DEFAULT NULL,
  `student_status` varchar(50) DEFAULT NULL,
  `previous_school` varchar(255) DEFAULT NULL,
  `extension_name` varchar(100) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `age` int DEFAULT NULL,
  `sex` varchar(100) DEFAULT NULL,
  `birth_place` varchar(100) DEFAULT NULL,
  `address` text,
  `religion` varchar(100) DEFAULT NULL,
  `ip_community` varchar(255) DEFAULT NULL,
  `four_ps` varchar(255) DEFAULT NULL,
  `pwd_id` varchar(255) DEFAULT NULL,
  `last_grade` varchar(255) DEFAULT NULL,
  `last_sy` varchar(255) DEFAULT NULL,
  `last_school` varchar(100) DEFAULT NULL,
  `report_card` varchar(255) DEFAULT NULL COMMENT 'Path to uploaded report card document',
  `guardian_name` varchar(100) DEFAULT NULL,
  `guardian_contact` varchar(100) DEFAULT NULL,
  `guardian_relationship` varchar(100) DEFAULT NULL,
  `emergency_contact_name` varchar(100) DEFAULT NULL,
  `emergency_contact_number` varchar(100) DEFAULT NULL,
  `emergency_contact_relationship` varchar(100) DEFAULT NULL,
  `psa_birth_certificate` varchar(100) DEFAULT NULL,
  `image` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_strand_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_strand_preferences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_personal_info_id` bigint unsigned DEFAULT NULL,
  `strand_id` bigint unsigned NOT NULL,
  `preference_order` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_strand_preferences_student_id_preference_order_unique` (`preference_order`),
  UNIQUE KEY `student_strand_preferences_student_id_strand_id_unique` (`strand_id`),
  KEY `student_strand_preferences_strand_id_foreign` (`strand_id`),
  KEY `student_strand_preferences_student_personal_info_id_foreign` (`student_personal_info_id`),
  CONSTRAINT `student_strand_preferences_student_personal_info_id_foreign` FOREIGN KEY (`student_personal_info_id`) REFERENCES `student_personal_info` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `semester` int NOT NULL DEFAULT '1',
  `is_summer_subject` tinyint(1) NOT NULL DEFAULT '0',
  `summer_duration_weeks` int DEFAULT NULL,
  `year_level` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_year_id` bigint unsigned DEFAULT NULL,
  `strand_id` bigint unsigned DEFAULT NULL,
  `faculty_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subjects_code_unique` (`code`),
  KEY `subjects_school_year_id_foreign` (`school_year_id`),
  KEY `subjects_strand_id_foreign` (`strand_id`),
  KEY `subjects_faculty_id_foreign` (`faculty_id`),
  CONSTRAINT `subjects_faculty_id_foreign` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subjects_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subjects_strand_id_foreign` FOREIGN KEY (`strand_id`) REFERENCES `strands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `summer_class_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `summer_class_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `enrollment_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `faculty_id` bigint unsigned DEFAULT NULL,
  `school_year_id` bigint unsigned NOT NULL,
  `schedule_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'intensive',
  `class_days` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_hours` int NOT NULL DEFAULT '40',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `summer_class_schedules_school_year_id_foreign` (`school_year_id`),
  KEY `summer_class_schedules_enrollment_id_school_year_id_index` (`enrollment_id`,`school_year_id`),
  KEY `summer_class_schedules_subject_id_school_year_id_index` (`subject_id`,`school_year_id`),
  KEY `summer_class_schedules_faculty_id_school_year_id_index` (`faculty_id`,`school_year_id`),
  CONSTRAINT `summer_class_schedules_enrollment_id_foreign` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `summer_class_schedules_faculty_id_foreign` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `summer_class_schedules_school_year_id_foreign` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`) ON DELETE CASCADE,
  CONSTRAINT `summer_class_schedules_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transferee_credited_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transferee_credited_subjects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `grade` decimal(5,2) NOT NULL,
  `semester` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_subject_semester` (`student_id`,`subject_id`,`semester`),
  KEY `transferee_credited_subjects_subject_id_foreign` (`subject_id`),
  CONSTRAINT `transferee_credited_subjects_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferee_credited_subjects_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transferee_previous_schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transferee_previous_schools` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `last_school` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transferee_previous_schools_student_id_unique` (`student_id`),
  CONSTRAINT `transferee_previous_schools_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `firstname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `middlename` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_changed` tinyint(1) NOT NULL DEFAULT '0',
  `role` enum('student','faculty','coordinator','registrar') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_type` enum('new','continuing','transferee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new' COMMENT 'Type of student: new (first-time), continuing (returning), transferee (from another school)',
  `assigned_strand_id` bigint unsigned DEFAULT NULL,
  `is_coordinator` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','inactive','pending') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_disabled` tinyint(1) NOT NULL DEFAULT '0',
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_assigned_strand_id_foreign` (`assigned_strand_id`),
  KEY `users_role_assigned_strand_id_index` (`role`,`assigned_strand_id`),
  CONSTRAINT `users_assigned_strand_id_foreign` FOREIGN KEY (`assigned_strand_id`) REFERENCES `strands` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (256,'0001_01_01_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (257,'0001_01_01_000001_create_cache_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (258,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (259,'2025_08_09_125754_create_school_years_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (260,'2025_08_09_125810_create_strands_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (261,'2025_08_09_125819_create_sections_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (262,'2025_08_09_125836_create_subjects_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (263,'2025_08_09_125837_create_student_personal_info_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (264,'2025_08_09_125838_create_student_strand_preferences_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (265,'2025_08_09_125839_create_strand_subjects_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (266,'2025_08_09_125930_create_enrollments_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (267,'2025_08_09_125935_create_grades_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (268,'2025_08_09_125937_create_class_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (269,'2025_08_09_125941_create_notifications_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (270,'2025_08_11_142641_create_personal_access_tokens_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (271,'2025_08_13_084816_create_class_details_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (272,'2025_08_20_132120_add_teacher_id_to_sections_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (273,'2025_08_21_095303_add_semester_id_to_grades_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (274,'2025_08_21_095304_add_unique_constraints_for_data_integrity',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (275,'2025_08_30_210800_create_password_resets_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (276,'2025_08_31_015800_add_coordinator_id_to_enrollments_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (277,'2025_08_31_024600_add_cor_fields_to_class_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (278,'2025_09_04_101500_add_strand_assignment_to_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (279,'2025_09_04_124611_add_password_changed_to_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (280,'2025_01_04_014900_fix_duplicate_school_years',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (281,'2025_01_04_015500_add_guardian_fields_safe',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (282,'2025_01_04_063100_remove_guardian_address_column',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (283,'2025_01_04_065100_reorder_document_columns',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (284,'2025_01_04_065200_reorder_columns_safe',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (285,'2025_01_13_143000_ensure_enrollment_fields_exist',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (286,'2025_01_13_143100_fix_enrollment_control_immediately',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (287,'2025_01_13_143200_fix_enrollment_dates_to_current',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (288,'2025_01_20_220800_add_student_status_to_student_personal_info_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (289,'2025_01_20_230000_fix_student_personal_info_table_schema',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (290,'2025_01_20_230001_fix_student_personal_info_table_schema_v2',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (291,'2025_01_20_235000_remove_special_needs_column',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (292,'2025_01_27_033200_rename_enrolled_grade_level_to_intended_grade_level',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (293,'2025_09_04_141928_add_start_end_dates_to_school_years_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (294,'2025_09_09_154500_add_school_year_id_to_class_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (295,'2025_09_09_154600_add_duration_to_class_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (296,'2025_09_10_081303_create_sessions_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (297,'2025_09_11_174600_add_description_to_strands_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (298,'2025_09_14_213500_update_varchar_columns_to_100',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (299,'2025_09_16_000000_add_is_coordinator_to_users_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (300,'2025_09_17_015132_add_strand_choices_to_enrollments_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (301,'2025_09_17_015211_align_enrollments_table_to_normalized_schema',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (302,'2025_09_17_021126_add_strand_choices_to_enrollments_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (303,'2025_09_17_083224_add_psa_birth_certificate_to_student_personal_info_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (304,'2025_09_18_050117_normalize_enrollments_status_to_varchar',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (305,'2025_09_18_123500_remove_enrollment_status_from_student_personal_info',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (306,'2025_09_20_140000_add_school_year_id_to_sections_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (307,'2025_09_22_071200_add_year_start_end_to_school_years_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (308,'2025_09_22_084000_fix_school_years_unique_constraint',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (309,'2025_09_22_092400_ensure_student_status_column_exists',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (310,'2025_09_22_093300_add_guardian_fields_to_student_personal_info',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (311,'2025_09_22_123100_add_section_id_to_student_personal_info',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (312,'2025_09_22_132500_add_unique_constraint_to_enrollments',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (313,'2025_09_22_152400_remove_student_fields_from_class_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (314,'2025_09_23_095400_ensure_school_years_schema_consistency',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (315,'2025_09_25_105700_remove_unused_columns_from_enrollments',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (316,'2025_09_25_114500_update_school_year_for_philippine_shs',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (317,'2025_09_26_064800_add_assigned_section_id_to_enrollments_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (318,'2025_09_26_074500_add_last_login_at_to_users_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (319,'2025_09_27_141408_update_grades_table_for_philippine_shs_quarterly_system',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (320,'2025_09_28_155204_remove_final_grade_from_grades_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (321,'2025_09_28_155715_update_grades_student_id_to_reference_users_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (322,'2025_09_28_161417_add_approval_system_to_grades_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (323,'2025_09_29_194930_add_allow_faculty_cor_print_to_school_years',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (324,'2025_09_29_210800_ensure_grade12_sections',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (325,'2025_09_30_072335_add_allow_coordinator_cor_print_to_school_years',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (326,'2025_09_30_132500_remove_enrollment_subjects_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (327,'2025_10_01_033408_fix_class_details_table_structure',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (328,'2025_10_01_045859_fix_grades_status_column',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (329,'2025_10_01_140000_redesign_grades_table_for_philippine_shs',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (330,'2025_10_02_145400_create_transferee_previous_schools_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (331,'2025_10_02_210700_create_transferee_credited_subjects_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (332,'2025_10_02_212200_add_student_type_to_users_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (333,'2025_10_03_120000_drop_notifications_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (334,'2025_10_03_235900_add_manual_enrollment_fields',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (335,'2025_10_06_112429_fix_enrollment_dates_2024',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (336,'2025_10_06_112658_extend_enrollment_period',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (337,'2025_10_06_112929_fix_enrollment_year_2025',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (338,'2025_10_06_132157_drop_transferee_credits_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (339,'2025_10_06_133108_update_existing_transferee_student_types',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (340,'2025_10_06_141405_add_credited_subjects_to_students_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (341,'2025_10_06_145535_remove_credited_subjects_from_student_personal_info_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (342,'2025_10_06_153317_add_third_fourth_quarter_to_grades_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (343,'2025_10_07_010300_ensure_guardian_columns_exist',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (344,'2025_10_07_044500_add_missing_fields_to_enrollments_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (345,'2025_10_07_050300_fix_enrolled_by_column_type',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (346,'2025_10_07_050400_ensure_transferee_enrollment_fields',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (347,'2025_10_07_051000_simple_fix_enrolled_by',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (348,'2025_10_07_051100_direct_fix_transferee_enrollment',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (349,'2025_10_07_051500_fix_enrollments_student_id_foreign_key',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (350,'2025_10_07_061000_fix_transferee_credited_subjects_semester_column',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (351,'2025_01_21_000001_cleanup_users_table_remove_redundant_columns',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (352,'2025_01_21_000002_drop_strand_subjects_table',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (353,'2025_01_27_100000_add_summer_enrollment_support',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (354,'2025_10_08_172248_add_approval_columns_to_grades_table',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (355,'2025_10_11_001000_add_enrollment_day_restrictions',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (356,'2025_01_13_120000_drop_teacher_id_from_sections_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (357,'2025_01_21_000010_add_adviser_id_to_sections_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (358,'2025_01_21_120000_cleanup_enrollments_and_related_tables',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (359,'2025_01_21_130000_eliminate_table_redundancy',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (360,'2025_01_21_140000_implement_normalized_database_structure',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (361,'2025_01_21_150000_fix_redundant_columns_and_optimize_lengths',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (362,'2025_10_11_135452_add_enrollment_management_fields_to_enrollments_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (363,'2025_10_12_162739_add_missing_guardian_fields_to_student_personal_info_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (364,'2025_10_12_163610_add_report_card_back_to_student_personal_info_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (365,'2025_10_13_100000_remove_password_columns_from_users_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (366,'2025_10_13_100100_remove_room_column_from_class_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (367,'2025_10_13_100200_remove_enrollment_day_columns_from_school_years_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (368,'2025_10_13_100300_remove_notes_columns_from_enrollments_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (369,'2025_10_13_100400_remove_approval_notes_from_grades_table',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (370,'2025_10_13_111100_add_shs_grade_logic_to_enrollments',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (371,'2025_10_13_114000_restore_password_changed_field',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (372,'2025_10_13_130000_add_missing_intended_grade_level_field',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (373,'2025_10_13_214200_create_faculty_loads_table',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (374,'2025_10_13_220000_add_missing_academic_calendar_fields',6);
