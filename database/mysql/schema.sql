-- MeritTrack MySQL 8.4 baseline. Generated from all 49 inspected source tables; reviewed extensions below.
-- @statement

CREATE TABLE IF NOT EXISTS `cohorts` (
  `cohort` BIGINT NOT NULL,
  PRIMARY KEY (`cohort`),
  CONSTRAINT `ck_cohorts_0` CHECK (cohort BETWEEN 17 AND 95)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `academic_terms` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `academic_year` VARCHAR(191) NOT NULL,
  `semester` VARCHAR(191) NOT NULL,
  `name` VARCHAR(768) NOT NULL,
  `start_at` DATETIME(3) NOT NULL,
  `end_at` DATETIME(3) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academic_terms_1` (`academic_year`, `semester`),
  active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN is_active=1 THEN 1 ELSE NULL END) STORED,
  UNIQUE KEY uq_one_active_term(active_slot),
  CONSTRAINT `ck_academic_terms_0` CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `mssv` VARCHAR(191) NOT NULL,
  `full_name` VARCHAR(768) NOT NULL,
  `email` VARCHAR(768) NULL,
  `password_hash` VARCHAR(768) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `must_change_pw` TINYINT(1) NOT NULL DEFAULT 1,
  `qr_secret` VARCHAR(768) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `gender` VARCHAR(768) NULL,
  `date_of_birth` DATE NULL,
  `phone` VARCHAR(768) NULL,
  `cohort` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_users_cohort` (`cohort`),
  KEY `idx_users_mssv` (`mssv`),
  KEY `idx_users_active` (`is_active`),
  KEY `idx_users_role` (`role`),
  UNIQUE KEY `uq_users_1` (`mssv`),
  CONSTRAINT fk_users_cohort FOREIGN KEY(cohort) REFERENCES cohorts(cohort) ON DELETE RESTRICT,
  CONSTRAINT `ck_users_0` CHECK (role IN ('student','class_officer','faculty_officer','admin')),
  CONSTRAINT `ck_users_1` CHECK (is_active IN (0,1)),
  CONSTRAINT `ck_users_2` CHECK (must_change_pw IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_role_assignments` (
  `user_id` BIGINT NOT NULL,
  `role` VARCHAR(32) NOT NULL,
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`, `role`),
  KEY `idx_user_role_assignments_role` (`role`, `user_id`),
  CONSTRAINT `fk_user_role_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_user_role_assignments_role` CHECK (`role` IN ('student','class_officer','faculty_officer','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activities` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT NULL,
  `audience_type` VARCHAR(191) NOT NULL DEFAULT 'student',
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `start_at` DATETIME(3) NOT NULL,
  `end_at` DATETIME(3) NOT NULL,
  `registration_start_at` DATETIME(3) NULL,
  `registration_end_at` DATETIME(3) NULL,
  `checkin_start_at` DATETIME(3) NULL,
  `checkin_end_at` DATETIME(3) NULL,
  `conduct_score` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `attendance_mode` VARCHAR(768) NOT NULL DEFAULT 'qr',
  `qr_checkin_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `published_at` DATETIME(3) NULL,
  `closed_at` DATETIME(3) NULL,
  `term_id` BIGINT NULL,
  `organizer_level` VARCHAR(768) NOT NULL DEFAULT 'faculty',
  `participation_source` VARCHAR(768) NOT NULL DEFAULT 'internal',
  `conduct_category_id` BIGINT NULL,
  `registration_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `absence_penalty` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `max_registrations` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activities_start_at` (`start_at`),
  KEY `idx_activities_audience_type` (`audience_type`),
  KEY `idx_activities_status` (`status`),
  CONSTRAINT `fk_activities_0` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `ck_activities_0` CHECK (audience_type IN ('student','officer','all')),
  CONSTRAINT `ck_activities_1` CHECK (status IN ('draft','published','closed')),
  CONSTRAINT `ck_activities_2` CHECK (attendance_mode IN ('qr','manual','both')),
  CONSTRAINT `ck_activities_3` CHECK (qr_checkin_enabled IN (0,1)),
  CONSTRAINT `ck_activities_4` CHECK (max_registrations IS NULL OR max_registrations>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activity_attendance_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `activity_id` BIGINT NOT NULL,
  `user_id` BIGINT NULL,
  `qr_payload` TEXT NULL,
  `scanned_by` BIGINT NOT NULL,
  `scanned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `result` VARCHAR(768) NOT NULL,
  `note` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_attendance_logs_scanned_by` (`scanned_by`),
  KEY `idx_activity_attendance_logs_activity_id` (`activity_id`),
  CONSTRAINT `fk_activity_attendance_logs_0` FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_activity_attendance_logs_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_activity_attendance_logs_2` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_activity_attendance_logs_0` CHECK (result IN ('success','duplicate','invalid','out_of_window','not_registered'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activity_cohort_scopes` (
  `activity_id` BIGINT NOT NULL,
  `cohort` BIGINT NOT NULL,
  PRIMARY KEY (`activity_id`, `cohort`),
  CONSTRAINT `fk_activity_cohort_scopes_0` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_activity_cohort_scopes_0` CHECK (cohort BETWEEN 17 AND 95)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activity_import_batches` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `activity_id` BIGINT NOT NULL,
  `file_name` VARCHAR(768) NOT NULL,
  `file_hash` VARCHAR(191) NOT NULL,
  `import_mode` VARCHAR(768) NOT NULL,
  `reason` TEXT NOT NULL,
  `total_rows` BIGINT NOT NULL DEFAULT 0,
  `success_rows` BIGINT NOT NULL DEFAULT 0,
  `error_rows` BIGINT NOT NULL DEFAULT 0,
  `imported_by` BIGINT NULL,
  `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reverted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_import_batches_activity` (`activity_id`),
  UNIQUE KEY `uq_activity_import_batches_1` (`activity_id`, `file_hash`),
  CONSTRAINT `fk_activity_import_batches_0` FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_activity_import_batches_1` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_activity_import_batches_0` CHECK (import_mode IN ('append','replace'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activity_import_rows` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `batch_id` BIGINT NOT NULL,
  `row_number` BIGINT NOT NULL,
  `mssv` VARCHAR(768) NULL,
  `user_id` BIGINT NULL,
  `status` VARCHAR(768) NOT NULL,
  `message` TEXT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_activity_import_rows_0` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_activity_import_rows_1` FOREIGN KEY (`batch_id`) REFERENCES `activity_import_batches`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_activity_import_rows_0` CHECK (status IN ('imported','duplicate','invalid'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activity_public_ids` (
  `activity_id` BIGINT NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`activity_id`),
  UNIQUE KEY `uq_activity_public_ids_1` (`token`),
  CONSTRAINT `fk_activity_public_ids_0` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `classes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(768) NOT NULL,
  `faculty` VARCHAR(768) NULL,
  `intake_year` BIGINT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `cohort` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_classes_cohort` (`cohort`),
  KEY `idx_classes_code` (`code`),
  UNIQUE KEY `uq_classes_1` (`code`),
  CONSTRAINT fk_classes_cohort FOREIGN KEY(cohort) REFERENCES cohorts(cohort) ON DELETE RESTRICT,
  CONSTRAINT `ck_classes_0` CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activity_registrations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `activity_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `class_id` BIGINT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'registered',
  `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `checked_in_at` DATETIME(3) NULL,
  `checked_in_by` BIGINT NULL,
  `note` TEXT NULL,
  `import_batch_id` BIGINT NULL,
  `role_context` VARCHAR(768) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_registrations_status` (`status`),
  KEY `idx_activity_registrations_user_id` (`user_id`),
  KEY `idx_activity_registrations_activity_id` (`activity_id`),
  UNIQUE KEY `uq_activity_registrations_1` (`activity_id`, `user_id`),
  CONSTRAINT `fk_activity_registrations_0` FOREIGN KEY (`checked_in_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_activity_registrations_1` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_activity_registrations_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_activity_registrations_3` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_activity_registrations_0` CHECK (status IN ('registered','attended','absent','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `activity_scopes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `activity_id` BIGINT NOT NULL,
  `class_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_scopes_class_id` (`class_id`),
  KEY `idx_activity_scopes_activity_id` (`activity_id`),
  UNIQUE KEY `uq_activity_scopes_1` (`activity_id`, `class_id`),
  CONSTRAINT `fk_activity_scopes_0` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_activity_scopes_1` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `audit_log_policy_versions` (
  `version` BIGINT NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `actor_user_id` BIGINT NULL,
  `action` VARCHAR(191) NOT NULL,
  `entity_type` VARCHAR(768) NULL,
  `entity_id` VARCHAR(768) NULL,
  `meta_json` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reason` TEXT NULL,
  `before_json` TEXT NULL,
  `after_json` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_actor_user_id` (`actor_user_id`),
  CONSTRAINT `fk_audit_logs_0` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `auth_login_limits` (
  `key` VARCHAR(191) NOT NULL,
  `window_start` BIGINT NOT NULL,
  `attempts` BIGINT NOT NULL,
  PRIMARY KEY (`key`),
  KEY `idx_login_limit_window` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `news_posts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(768) NOT NULL,
  `slug` VARCHAR(191) NULL,
  `summary` TEXT NULL,
  `content` TEXT NULL,
  `image_url` VARCHAR(768) NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `published_at` DATETIME(3) NULL,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_news_posts_1` (`slug`),
  CONSTRAINT `fk_news_posts_0` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `ck_news_posts_0` CHECK (is_published IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `criteria_templates` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(768) NOT NULL,
  `description` TEXT NULL,
  `for_type` VARCHAR(768) NOT NULL DEFAULT 'student',
  `created_by` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_criteria_templates_0` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `ck_criteria_templates_0` CHECK (for_type IN ('student','officer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `criteria_template_edit_drafts` (
  `original_template_id` BIGINT NOT NULL,
  `draft_template_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` VARCHAR(16) NOT NULL DEFAULT 'editing',
  `stage` VARCHAR(16) NOT NULL DEFAULT 'submissions',
  `submission_cursor` BIGINT NOT NULL DEFAULT 0,
  `cache_event_cursor` BIGINT NOT NULL DEFAULT 0,
  `cache_user_cursor` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`original_template_id`),
  UNIQUE KEY `uq_criteria_template_edit_drafts_draft` (`draft_template_id`),
  CONSTRAINT `fk_criteria_template_edit_drafts_original` FOREIGN KEY (`original_template_id`) REFERENCES `criteria_templates`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_criteria_template_edit_drafts_draft` FOREIGN KEY (`draft_template_id`) REFERENCES `criteria_templates`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_criteria_template_edit_drafts_author` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(768) NOT NULL,
  `description` TEXT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'student',
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `start_at` DATETIME(3) NOT NULL,
  `end_at` DATETIME(3) NOT NULL,
  `allow_late` BIGINT NOT NULL DEFAULT 0,
  `created_by` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `published_at` DATETIME(3) NULL,
  `closed_at` DATETIME(3) NULL,
  `criteria_template_id` BIGINT NULL,
  `term_id` BIGINT NULL,
  `score_max` DECIMAL(12,3) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_events_type` (`type`),
  KEY `idx_events_status` (`status`),
  CONSTRAINT `fk_events_0` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_events_1` FOREIGN KEY (`criteria_template_id`) REFERENCES `criteria_templates`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `ck_events_0` CHECK (type IN ('student','officer')),
  CONSTRAINT `ck_events_1` CHECK (status IN ('draft','published','closed')),
  CONSTRAINT `ck_events_2` CHECK (allow_late IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `banners` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(768) NOT NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(768) NULL,
  `type` VARCHAR(768) NOT NULL,
  `event_id` BIGINT NULL,
  `news_id` BIGINT NULL,
  `link` VARCHAR(768) NULL,
  `badge` VARCHAR(768) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_banners_0` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_banners_1` FOREIGN KEY (`news_id`) REFERENCES `news_posts`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_banners_2` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `ck_banners_0` CHECK (type IN ('event','news','link')),
  CONSTRAINT `ck_banners_1` CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `class_cohort_links` (
  `class_id` BIGINT NOT NULL,
  `cohort` BIGINT NOT NULL,
  PRIMARY KEY (`class_id`),
  KEY `idx_class_cohort_links_cohort` (`cohort`),
  CONSTRAINT `fk_class_cohort_links_0` FOREIGN KEY (`cohort`) REFERENCES `cohorts`(`cohort`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_class_cohort_links_1` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `class_members` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `class_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `left_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_class_members_user_id` (`user_id`),
  KEY `idx_class_members_class_id` (`class_id`),
  UNIQUE KEY `uq_class_members_1` (`class_id`, `user_id`),
  CONSTRAINT `fk_class_members_0` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_class_members_1` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `conduct_periods` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(768) NOT NULL,
  `academic_year` VARCHAR(768) NOT NULL,
  `semester` VARCHAR(768) NOT NULL,
  `start_at` DATETIME(3) NULL,
  `end_at` DATETIME(3) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_conduct_periods_active` (`is_active`),
  UNIQUE KEY `uq_conduct_periods_1` (`code`),
  CONSTRAINT `ck_conduct_periods_0` CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `conduct_score_categories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `term_id` BIGINT NOT NULL,
  `parent_id` BIGINT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(768) NOT NULL,
  `score_max` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_conduct_categories_term` (`term_id`),
  parent_slot BIGINT GENERATED ALWAYS AS (COALESCE(parent_id,0)) STORED,
  UNIQUE KEY idx_conduct_categories_sibling_code(term_id,parent_slot,code),
  CONSTRAINT `fk_conduct_score_categories_0` FOREIGN KEY (`parent_id`) REFERENCES `conduct_score_categories`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_conduct_score_categories_1` FOREIGN KEY (`term_id`) REFERENCES `academic_terms`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_conduct_score_categories_0` CHECK (score_max >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `conduct_scores` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `period_id` BIGINT NOT NULL,
  `source_type` VARCHAR(191) NOT NULL,
  `source_id` BIGINT NULL,
  `score_value` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_conduct_scores_user_period` (`user_id`, `period_id`),
  KEY `idx_conduct_scores_period_id` (`period_id`),
  KEY `idx_conduct_scores_user_id` (`user_id`),
  UNIQUE KEY `uq_conduct_scores_1` (`user_id`, `period_id`, `source_type`, `source_id`),
  activity_source BIGINT GENERATED ALWAYS AS (CASE WHEN source_type='activity' THEN source_id ELSE NULL END) STORED,
  UNIQUE KEY idx_conduct_scores_activity_unique(user_id,activity_source),
  CONSTRAINT `fk_conduct_scores_0` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_conduct_scores_1` FOREIGN KEY (`period_id`) REFERENCES `conduct_periods`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_conduct_scores_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_conduct_scores_0` CHECK (source_type IN ('activity','manual'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `criteria_activity_rules` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(191) NOT NULL,
  `activity_id` BIGINT NOT NULL,
  `score_value` DECIMAL(12,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_criteria_activity_rules_template_criteria` (`template_id`, `criteria_code`),
  UNIQUE KEY `uq_criteria_activity_rules_1` (`template_id`, `criteria_code`, `activity_id`),
  CONSTRAINT `fk_criteria_activity_rules_0` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_criteria_activity_rules_1` FOREIGN KEY (`template_id`) REFERENCES `criteria_templates`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `criteria_conduct_rules` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(191) NOT NULL,
  `min_score` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `period_scope` VARCHAR(768) NOT NULL DEFAULT 'current',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_criteria_conduct_rules_1` (`template_id`, `criteria_code`),
  CONSTRAINT `fk_criteria_conduct_rules_0` FOREIGN KEY (`template_id`) REFERENCES `criteria_templates`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_criteria_conduct_rules_0` CHECK (period_scope IN ('current','any'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `criteria_template_groups` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(768) NOT NULL,
  `description` TEXT NULL,
  `min_required` BIGINT NOT NULL DEFAULT 1,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `score_max` DECIMAL(12,3) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_criteria_template_groups_template_id` (`template_id`),
  UNIQUE KEY `uq_criteria_template_groups_1` (`template_id`, `code`),
  UNIQUE KEY `uq_criteria_template_groups_title` (`template_id`, `title`),
  CONSTRAINT `fk_criteria_template_groups_0` FOREIGN KEY (`template_id`) REFERENCES `criteria_templates`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_criteria_template_groups_0` CHECK (min_required >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `criteria_template_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT NOT NULL,
  `group_code` VARCHAR(768) NULL,
  `code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(768) NOT NULL,
  `description` TEXT NULL,
  `score_max` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `evidence_type` VARCHAR(768) NOT NULL DEFAULT 'manual',
  `is_required` TINYINT(1) NOT NULL DEFAULT 0,
  `required_count` BIGINT NOT NULL DEFAULT 1,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_criteria_template_items_template_id` (`template_id`),
  UNIQUE KEY `uq_criteria_template_items_1` (`template_id`, `code`),
  CONSTRAINT `fk_criteria_template_items_0` FOREIGN KEY (`template_id`) REFERENCES `criteria_templates`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_criteria_template_items_0` CHECK (evidence_type IN ('auto','manual','both')),
  CONSTRAINT `ck_criteria_template_items_1` CHECK (is_required IN (0,1))
  ,CONSTRAINT `ck_criteria_template_items_2` CHECK (required_count >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `event_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` BIGINT NOT NULL,
  `class_id` BIGINT NOT NULL,
  `reviewer_v1` BIGINT NOT NULL,
  `reviewer_v2` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_assignments_v2` (`reviewer_v2`),
  KEY `idx_event_assignments_v1` (`reviewer_v1`),
  KEY `idx_event_assignments_event_id` (`event_id`),
  UNIQUE KEY `uq_event_assignments_1` (`event_id`, `class_id`),
  CONSTRAINT `fk_event_assignments_0` FOREIGN KEY (`reviewer_v2`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_event_assignments_1` FOREIGN KEY (`reviewer_v1`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_event_assignments_2` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_event_assignments_3` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `event_criteria_groups` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` BIGINT NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(768) NOT NULL,
  `description` TEXT NULL,
  `min_required` BIGINT NOT NULL DEFAULT 1,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  `score_max` DECIMAL(12,3) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_criteria_groups_event_id` (`event_id`),
  UNIQUE KEY `uq_event_criteria_groups_1` (`event_id`, `code`),
  CONSTRAINT `fk_event_criteria_groups_0` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_event_criteria_groups_0` CHECK (min_required >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `event_criteria_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` BIGINT NOT NULL,
  `group_code` VARCHAR(768) NULL,
  `code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(768) NOT NULL,
  `description` TEXT NULL,
  `score_max` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `evidence_type` VARCHAR(768) NOT NULL DEFAULT 'manual',
  `is_required` TINYINT(1) NOT NULL DEFAULT 0,
  `required_count` BIGINT NOT NULL DEFAULT 1,
  `sort_order` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_event_criteria_items_event_id` (`event_id`),
  UNIQUE KEY `uq_event_criteria_items_1` (`event_id`, `code`),
  CONSTRAINT `fk_event_criteria_items_0` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_event_criteria_items_0` CHECK (evidence_type IN ('auto','manual','both')),
  CONSTRAINT `ck_event_criteria_items_1` CHECK (is_required IN (0,1))
  ,CONSTRAINT `ck_event_criteria_items_2` CHECK (required_count >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `class_id` BIGINT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
  `submitted_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `score_total` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `v1_deadline` DATETIME(3) NULL,
  `v1_note` TEXT NULL,
  `v2_note` TEXT NULL,
  `review_round` BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_submissions_status` (`status`),
  KEY `idx_submissions_user_id` (`user_id`),
  KEY `idx_submissions_event_id` (`event_id`),
  UNIQUE KEY `uq_submissions_1` (`event_id`, `user_id`),
  CONSTRAINT `fk_submissions_0` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_submissions_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_submissions_2` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_submissions_0` CHECK (status IN ('draft','submitted_v1','needs_revision_v1','submitted_v2','needs_revision_v2','passed','failed','closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `event_results` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `submission_id` BIGINT NULL,
  `result_code` VARCHAR(768) NOT NULL,
  `result_label` VARCHAR(768) NULL,
  `score_total` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `summary` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_event_results_user_id` (`user_id`),
  KEY `idx_event_results_event_id` (`event_id`),
  UNIQUE KEY `uq_event_results_1` (`event_id`, `user_id`),
  CONSTRAINT `fk_event_results_0` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_event_results_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_event_results_2` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_event_results_0` CHECK (result_code IN ('PASS','FAIL','PENDING'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `event_scopes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` BIGINT NOT NULL,
  `class_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_scopes_class_id` (`class_id`),
  KEY `idx_event_scopes_event_id` (`event_id`),
  UNIQUE KEY `uq_event_scopes_1` (`event_id`, `class_id`),
  CONSTRAINT `fk_event_scopes_0` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_event_scopes_1` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `faculty_class_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `faculty_officer_id` BIGINT NOT NULL,
  `class_id` BIGINT NOT NULL,
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_faculty_class_assignments_class` (`class_id`),
  KEY `idx_faculty_class_assignments_officer` (`faculty_officer_id`),
  UNIQUE KEY `uq_faculty_class_assignments_1` (`faculty_officer_id`, `class_id`),
  CONSTRAINT `fk_faculty_class_assignments_0` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_faculty_class_assignments_1` FOREIGN KEY (`faculty_officer_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `type` VARCHAR(768) NOT NULL,
  `title` VARCHAR(768) NOT NULL,
  `content` TEXT NULL,
  `link` VARCHAR(768) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `read_at` DATETIME(3) NULL,
  `role_context` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_context` (`user_id`, `role_context`, `is_read`),
  KEY `idx_notifications_is_read` (`is_read`),
  KEY `idx_notifications_user_id` (`user_id`),
  CONSTRAINT `fk_notifications_0` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_notifications_0` CHECK (is_read IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `password_reset_requests` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` BIGINT NULL,
  `identity_hash` VARCHAR(191) NOT NULL,
  `ip_hash` VARCHAR(191) NOT NULL,
  `code_hash` VARCHAR(768) NOT NULL,
  `created_at` BIGINT NOT NULL,
  `expires_at` BIGINT NOT NULL,
  `attempts` BIGINT NOT NULL DEFAULT 0,
  `consumed_at` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_password_reset_ip` (`ip_hash`, `created_at`),
  KEY `idx_password_reset_identity` (`identity_hash`, `created_at`),
  CONSTRAINT `fk_password_reset_requests_0` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `public_page_routes` (
  `internal_path` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`internal_path`),
  UNIQUE KEY `uq_public_page_routes_1` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `round` BIGINT NOT NULL,
  `reviewer_id` BIGINT NOT NULL,
  `decision` VARCHAR(768) NOT NULL,
  `note` TEXT NULL,
  `deadline` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_reviews_reviewer_id` (`reviewer_id`),
  KEY `idx_reviews_submission_id` (`submission_id`),
  UNIQUE KEY `uq_reviews_1` (`submission_id`, `round`),
  CONSTRAINT `fk_reviews_0` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_reviews_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_reviews_0` CHECK (round IN (1,2)),
  CONSTRAINT `ck_reviews_1` CHECK (decision IN ('pass','revise','fail'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `role_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `requested_role` VARCHAR(768) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `note` TEXT NULL,
  `decided_by` BIGINT NULL,
  `decided_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_role_requests_status` (`status`),
  KEY `idx_role_requests_user_id` (`user_id`),
  CONSTRAINT `fk_role_requests_0` FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_role_requests_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_role_requests_0` CHECK (requested_role IN ('class_officer','faculty_officer')),
  CONSTRAINT `ck_role_requests_1` CHECK (status IN ('pending','approved','rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  `revoked_at` DATETIME(3) NULL,
  `user_agent` VARCHAR(768) NULL,
  `ip` VARCHAR(768) NULL,
  `login_context` VARCHAR(768) NOT NULL DEFAULT 'student',
  PRIMARY KEY (`id`),
  KEY `idx_sessions_expires_at` (`expires_at`),
  KEY `idx_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_sessions_0` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_auto_results` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(191) NOT NULL,
  `passed` TINYINT(1) NOT NULL DEFAULT 0,
  `matched_count` BIGINT NOT NULL DEFAULT 0,
  `matched_activity_ids` TEXT NULL,
  `matched_activity_titles` TEXT NULL,
  `evaluated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `source_type` VARCHAR(768) NULL,
  `source_id` BIGINT NULL,
  `message` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_submission_auto_results_submission_id` (`submission_id`),
  UNIQUE KEY `uq_submission_auto_results_1` (`submission_id`, `criteria_code`),
  CONSTRAINT `fk_submission_auto_results_0` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_submission_auto_results_0` CHECK (passed IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_criteria_reviews` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(191) NOT NULL,
  `round` BIGINT NOT NULL,
  `reviewer_id` BIGINT NOT NULL,
  `decision` VARCHAR(768) NOT NULL,
  `reviewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_criteria_reviews_submission` (`submission_id`, `round`),
  UNIQUE KEY `uq_submission_criteria_reviews_1` (`submission_id`, `criteria_code`, `round`),
  CONSTRAINT `fk_submission_criteria_reviews_0` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_submission_criteria_reviews_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_submission_criteria_reviews_0` CHECK (round IN (1,2)),
  CONSTRAINT `ck_submission_criteria_reviews_1` CHECK (decision IN ('pass','fail'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_evidence_units` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(191) NOT NULL,
  `source_type` VARCHAR(16) NOT NULL DEFAULT 'manual',
  `related_activity_id` BIGINT NULL,
  `note` TEXT NULL,
  `claimed_count` INT NOT NULL DEFAULT 1,
  `created_by` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_evidence_units_submission_criteria` (`submission_id`, `criteria_code`),
  KEY `idx_submission_evidence_units_activity` (`related_activity_id`),
  UNIQUE KEY `uq_submission_evidence_units_activity` (`submission_id`, `criteria_code`, `related_activity_id`),
  CONSTRAINT `fk_submission_evidence_units_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_evidence_units_activity` FOREIGN KEY (`related_activity_id`) REFERENCES `activities`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_submission_evidence_units_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `ck_submission_evidence_units_source_type` CHECK (`source_type` IN ('manual'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_files` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(768) NOT NULL,
  `evidence_unit_id` BIGINT NULL,
  `file_name` VARCHAR(768) NOT NULL,
  `file_path` VARCHAR(768) NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `object_key` VARCHAR(768) NOT NULL,
  `storage_provider` VARCHAR(8) NOT NULL DEFAULT 'local',
  `status` VARCHAR(16) NOT NULL DEFAULT 'ready',
  `uploaded_by` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  `object_deleted_at` DATETIME(3) NULL,
  `etag` VARCHAR(255) NULL,
  `checksum_sha256` CHAR(64) NULL,
  `mime_type` VARCHAR(768) NULL,
  `size_bytes` BIGINT NULL,
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_files_submission_id` (`submission_id`),
  KEY `idx_submission_files_evidence_unit` (`evidence_unit_id`),
  CONSTRAINT ck_submission_file_status CHECK(status IN ('pending','ready','deleted')),
  CONSTRAINT ck_submission_file_provider CHECK(storage_provider IN ('local','onedrive')),
  CONSTRAINT fk_submission_file_uploader FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT `fk_submission_files_0` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_submission_files_evidence_unit` FOREIGN KEY (`evidence_unit_id`) REFERENCES `submission_evidence_units`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_evidence_reviews` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `evidence_unit_id` BIGINT NOT NULL,
  `round` BIGINT NOT NULL,
  `reviewer_id` BIGINT NOT NULL,
  `decision` VARCHAR(16) NOT NULL,
  `approved_count` INT NOT NULL DEFAULT 1,
  `note` TEXT NULL,
  `reviewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_evidence_reviews_submission_round` (`submission_id`, `round`),
  KEY `idx_submission_evidence_reviews_unit` (`evidence_unit_id`, `round`),
  UNIQUE KEY `uq_submission_evidence_reviews_unit_round` (`evidence_unit_id`, `round`),
  CONSTRAINT `fk_submission_evidence_reviews_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_evidence_reviews_unit` FOREIGN KEY (`evidence_unit_id`) REFERENCES `submission_evidence_units`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submission_evidence_reviews_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_submission_evidence_reviews_round` CHECK (`round` IN (1,2)),
  CONSTRAINT `ck_submission_evidence_reviews_decision` CHECK (`decision` IN ('pass','fail'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(191) NOT NULL,
  `content_text` TEXT NULL,
  `reviewer_note` TEXT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_items_submission_id` (`submission_id`),
  UNIQUE KEY `uq_submission_items_1` (`submission_id`, `criteria_code`),
  CONSTRAINT `fk_submission_items_0` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_selected_criteria` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `criteria_code` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_selected_criteria_submission_id` (`submission_id`),
  UNIQUE KEY `uq_submission_selected_criteria_1` (`submission_id`, `criteria_code`),
  CONSTRAINT `fk_submission_selected_criteria_0` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_support_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `note` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'open',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_support_status` (`status`),
  UNIQUE KEY `uq_submission_support_requests_1` (`submission_id`),
  CONSTRAINT `fk_submission_support_requests_0` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `fk_submission_support_requests_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `ck_submission_support_requests_0` CHECK (status IN ('open','resolved','cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `submission_timeline` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id` BIGINT NOT NULL,
  `actor_user_id` BIGINT NULL,
  `action` VARCHAR(768) NOT NULL,
  `from_status` VARCHAR(768) NULL,
  `to_status` VARCHAR(768) NULL,
  `message` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_submission_timeline_submission_id` (`submission_id`),
  CONSTRAINT `fk_submission_timeline_0` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT `fk_submission_timeline_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE TABLE IF NOT EXISTS `user_public_ids` (
  `user_id` BIGINT NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_user_public_ids_1` (`token`),
  CONSTRAINT `fk_user_public_ids_0` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- @statement

CREATE OR REPLACE VIEW submission_ready_files AS SELECT id,submission_id,criteria_code,file_name,CONCAT('/api/submissions/files/',id) file_path,mime_type,size_bytes,uploaded_at,original_name,object_key,storage_provider,status,uploaded_by,created_at,deleted_at,etag,checksum_sha256 FROM submission_files WHERE status='ready' AND deleted_at IS NULL;


-- @statement

CREATE TABLE IF NOT EXISTS application_write_lock(id TINYINT PRIMARY KEY) ENGINE=InnoDB;

-- @statement

INSERT IGNORE INTO application_write_lock(id) VALUES(1);


-- @statement

CREATE TABLE IF NOT EXISTS email_outbox (
  id CHAR(36) NOT NULL,
  recipient VARCHAR(768) NOT NULL,
  template_name VARCHAR(191) NOT NULL,
  subject VARCHAR(768) NOT NULL,
  payload_json JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(255) NULL,
  provider_event_id VARCHAR(255) NULL,
  last_error TEXT NULL,
  attempts BIGINT NOT NULL DEFAULT 0,
  sent_at DATETIME(3) NULL,
  delivered_at DATETIME(3) NULL,
  opened_at DATETIME(3) NULL,
  clicked_at DATETIME(3) NULL,
  bounced_at DATETIME(3) NULL,
  complained_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_email_outbox_status (status, created_at),
  KEY idx_email_outbox_provider_message (provider_message_id),
  CONSTRAINT ck_email_outbox_status CHECK(status IN ('pending','sent','delivered','bounced','complained','opened','clicked','failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
