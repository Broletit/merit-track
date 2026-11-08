ALTER TABLE criteria_template_items
  ADD COLUMN required_count BIGINT NOT NULL DEFAULT 1 AFTER is_required,
  ADD CONSTRAINT ck_criteria_template_items_required_count CHECK (required_count >= 1);

ALTER TABLE event_criteria_items
  ADD COLUMN required_count BIGINT NOT NULL DEFAULT 1 AFTER is_required,
  ADD CONSTRAINT ck_event_criteria_items_required_count CHECK (required_count >= 1);

ALTER TABLE submission_auto_results
  ADD COLUMN matched_count BIGINT NOT NULL DEFAULT 0 AFTER passed;

CREATE TABLE submission_evidence_units (
  id BIGINT NOT NULL AUTO_INCREMENT,
  submission_id BIGINT NOT NULL,
  criteria_code VARCHAR(191) NOT NULL,
  source_type VARCHAR(16) NOT NULL DEFAULT 'manual',
  related_activity_id BIGINT NULL,
  note TEXT NULL,
  created_by BIGINT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_submission_evidence_units_submission_criteria (submission_id, criteria_code),
  KEY idx_submission_evidence_units_activity (related_activity_id),
  UNIQUE KEY uq_submission_evidence_units_activity (submission_id, criteria_code, related_activity_id),
  CONSTRAINT fk_submission_evidence_units_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_submission_evidence_units_activity FOREIGN KEY (related_activity_id) REFERENCES activities(id) ON DELETE SET NULL,
  CONSTRAINT fk_submission_evidence_units_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_submission_evidence_units_source_type CHECK (source_type IN ('manual'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE submission_files
  ADD COLUMN evidence_unit_id BIGINT NULL AFTER criteria_code,
  ADD KEY idx_submission_files_evidence_unit (evidence_unit_id),
  ADD CONSTRAINT fk_submission_files_evidence_unit FOREIGN KEY (evidence_unit_id) REFERENCES submission_evidence_units(id) ON DELETE CASCADE;

CREATE TABLE submission_evidence_reviews (
  id BIGINT NOT NULL AUTO_INCREMENT,
  submission_id BIGINT NOT NULL,
  evidence_unit_id BIGINT NOT NULL,
  round BIGINT NOT NULL,
  reviewer_id BIGINT NOT NULL,
  decision VARCHAR(16) NOT NULL,
  note TEXT NULL,
  reviewed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_submission_evidence_reviews_submission_round (submission_id, round),
  KEY idx_submission_evidence_reviews_unit (evidence_unit_id, round),
  UNIQUE KEY uq_submission_evidence_reviews_unit_round (evidence_unit_id, round),
  CONSTRAINT fk_submission_evidence_reviews_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_submission_evidence_reviews_unit FOREIGN KEY (evidence_unit_id) REFERENCES submission_evidence_units(id) ON DELETE CASCADE,
  CONSTRAINT fk_submission_evidence_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_submission_evidence_reviews_round CHECK (round IN (1,2)),
  CONSTRAINT ck_submission_evidence_reviews_decision CHECK (decision IN ('pass','fail'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO submission_evidence_units(submission_id, criteria_code, source_type, note, created_by)
SELECT si.submission_id, si.criteria_code, 'manual', NULLIF(TRIM(si.content_text), ''), NULL
FROM submission_items si
WHERE NULLIF(TRIM(si.content_text), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM submission_evidence_units eu
    WHERE eu.submission_id=si.submission_id AND eu.criteria_code=si.criteria_code
  );

INSERT INTO submission_evidence_units(submission_id, criteria_code, source_type, created_by)
SELECT sf.submission_id, sf.criteria_code, 'manual', sf.uploaded_by
FROM submission_files sf
WHERE sf.status='ready'
  AND NOT EXISTS (
    SELECT 1 FROM submission_evidence_units eu
    WHERE eu.submission_id=sf.submission_id AND eu.criteria_code=sf.criteria_code
  );

UPDATE submission_files sf
JOIN submission_evidence_units eu
  ON eu.submission_id=sf.submission_id AND eu.criteria_code=sf.criteria_code
SET sf.evidence_unit_id=eu.id
WHERE sf.status='ready' AND sf.evidence_unit_id IS NULL;
