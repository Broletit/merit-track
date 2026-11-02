CREATE TABLE IF NOT EXISTS report_assessment_cache (
  event_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  assessment_type VARCHAR(16) NOT NULL,
  achieved_criteria INT NOT NULL DEFAULT 0,
  total_criteria INT NOT NULL DEFAULT 0,
  missing_required INT NOT NULL DEFAULT 0,
  is_eligible TINYINT(1) NOT NULL DEFAULT 0,
  source_revision BIGINT NOT NULL DEFAULT 1,
  refreshed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (event_id, user_id),
  KEY idx_report_assessment_event_eligible (event_id, is_eligible, missing_required),
  KEY idx_report_assessment_user (user_id),
  CONSTRAINT fk_report_assessment_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_assessment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_report_assessment_type CHECK (assessment_type IN ('student','officer')),
  CONSTRAINT ck_report_assessment_eligible CHECK (is_eligible IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS report_cache_state (
  cache_key VARCHAR(191) NOT NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  refreshed_at DATETIME(3) NULL,
  PRIMARY KEY (cache_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
