ALTER TABLE submission_evidence_units
  ADD COLUMN claimed_count INT NOT NULL DEFAULT 1 AFTER note;

ALTER TABLE submission_evidence_reviews
  ADD COLUMN approved_count INT NOT NULL DEFAULT 1 AFTER decision;

ALTER TABLE report_assessment_cache
  ADD COLUMN progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER is_eligible,
  ADD COLUMN standard_progress_json JSON NULL AFTER progress_percent;

ALTER TABLE report_assessment_cache
  ADD KEY idx_report_assessment_event_progress (event_id, progress_percent, is_eligible);
