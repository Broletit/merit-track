CREATE TABLE IF NOT EXISTS criteria_template_edit_drafts (
  original_template_id BIGINT NOT NULL PRIMARY KEY,
  draft_template_id BIGINT NOT NULL UNIQUE,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  status VARCHAR(16) NOT NULL DEFAULT 'editing',
  stage VARCHAR(16) NOT NULL DEFAULT 'submissions',
  submission_cursor BIGINT NOT NULL DEFAULT 0,
  cache_event_cursor BIGINT NOT NULL DEFAULT 0,
  cache_user_cursor BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT fk_criteria_template_edit_drafts_original FOREIGN KEY (original_template_id) REFERENCES criteria_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_criteria_template_edit_drafts_draft FOREIGN KEY (draft_template_id) REFERENCES criteria_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_criteria_template_edit_drafts_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
