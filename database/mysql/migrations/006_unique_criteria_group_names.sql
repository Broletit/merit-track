ALTER TABLE criteria_template_groups
  MODIFY COLUMN title VARCHAR(500) NOT NULL,
  ADD UNIQUE KEY uq_criteria_template_groups_title (template_id, title);
