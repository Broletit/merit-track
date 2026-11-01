-- MySQL equivalents of all integrity/context policies from the inspected SQLite database.
-- @statement
CREATE TRIGGER classes_require_cohort BEFORE INSERT ON classes FOR EACH ROW
BEGIN
  IF NEW.cohort IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CLASS_COHORT_REQUIRED'; END IF;
END;
-- @statement
CREATE TRIGGER classes_keep_cohort BEFORE UPDATE ON classes FOR EACH ROW
BEGIN
  IF OLD.cohort IS NOT NULL AND NOT (NEW.cohort <=> OLD.cohort) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CLASS_COHORT_IMMUTABLE'; END IF;
END;
-- @statement
CREATE TRIGGER classes_create_cohort_link AFTER INSERT ON classes FOR EACH ROW
BEGIN
  INSERT INTO class_cohort_links(class_id,cohort) VALUES(NEW.id,NEW.cohort);
END;
-- @statement
CREATE TRIGGER classes_set_cohort_link AFTER UPDATE ON classes FOR EACH ROW
BEGIN
  INSERT INTO class_cohort_links(class_id,cohort) VALUES(NEW.id,NEW.cohort) ON DUPLICATE KEY UPDATE cohort=VALUES(cohort);
END;
-- @statement
CREATE TRIGGER class_cohort_link_matches_insert BEFORE INSERT ON class_cohort_links FOR EACH ROW
BEGIN
  IF NOT EXISTS(SELECT 1 FROM classes WHERE id=NEW.class_id AND cohort=NEW.cohort) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CLASS_COHORT_LINK_MISMATCH'; END IF;
END;
-- @statement
CREATE TRIGGER class_cohort_link_matches_update BEFORE UPDATE ON class_cohort_links FOR EACH ROW
BEGIN
  IF NOT EXISTS(SELECT 1 FROM classes WHERE id=NEW.class_id AND cohort=NEW.cohort) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CLASS_COHORT_LINK_MISMATCH'; END IF;
END;
-- @statement
CREATE TRIGGER users_keep_imported_cohort BEFORE UPDATE ON users FOR EACH ROW
BEGIN
  IF OLD.cohort IS NOT NULL AND NOT (NEW.cohort <=> OLD.cohort) AND OLD.role<>'admin' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='USER_COHORT_IMMUTABLE'; END IF;
END;
-- @statement
CREATE TRIGGER users_cohort_insert BEFORE INSERT ON users FOR EACH ROW
BEGIN
  IF NEW.cohort IS NULL AND NEW.role IN ('student','class_officer','faculty_officer') AND NEW.mssv REGEXP '^[0-9]{8}$' AND SUBSTRING(NEW.mssv,1,2) BETWEEN '21' AND '99' THEN
    SET NEW.cohort=CAST(SUBSTRING(NEW.mssv,1,2) AS UNSIGNED)-4;
  END IF;
END;
-- @statement
CREATE TRIGGER class_members_cohort_insert BEFORE INSERT ON class_members FOR EACH ROW
BEGIN
  IF NEW.left_at IS NULL AND NOT EXISTS(SELECT 1 FROM users u JOIN class_cohort_links cc ON cc.class_id=NEW.class_id WHERE u.id=NEW.user_id AND u.cohort=cc.cohort AND u.cohort IS NOT NULL) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CLASS_USER_COHORT_MISMATCH'; END IF;
END;
-- @statement
CREATE TRIGGER class_members_cohort_update BEFORE UPDATE ON class_members FOR EACH ROW
BEGIN
  IF NEW.left_at IS NULL AND NOT EXISTS(SELECT 1 FROM users u JOIN class_cohort_links cc ON cc.class_id=NEW.class_id WHERE u.id=NEW.user_id AND u.cohort=cc.cohort AND u.cohort IS NOT NULL) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CLASS_USER_COHORT_MISMATCH'; END IF;
END;
-- @statement
CREATE TRIGGER notifications_assign_context BEFORE INSERT ON notifications FOR EACH ROW
BEGIN
  IF NEW.role_context IS NULL THEN
    SET NEW.role_context=CASE WHEN NEW.link LIKE '/dashboard/admin/%' THEN 'admin' WHEN NEW.link LIKE '/dashboard/faculty-officer/%' THEN 'faculty_officer' WHEN NEW.link LIKE '/dashboard/class-officer/%' THEN 'class_officer' ELSE 'student' END;
  END IF;
END;
-- @statement
CREATE TRIGGER registrations_assign_context BEFORE INSERT ON activity_registrations FOR EACH ROW
BEGIN
  IF NEW.role_context IS NULL THEN
    SET NEW.role_context=CASE WHEN (SELECT audience_type FROM activities WHERE id=NEW.activity_id)='student' THEN 'student' WHEN (SELECT role FROM users WHERE id=NEW.user_id)='faculty_officer' THEN 'faculty_officer' ELSE 'class_officer' END;
  END IF;
END;
-- @statement
CREATE TRIGGER registration_capacity_insert BEFORE INSERT ON activity_registrations FOR EACH ROW
BEGIN
  DECLARE capacity BIGINT;
  SELECT max_registrations INTO capacity FROM activities WHERE id=NEW.activity_id FOR UPDATE;
  IF NEW.status='registered' AND capacity IS NOT NULL AND (SELECT COUNT(*) FROM activity_registrations WHERE activity_id=NEW.activity_id AND status<>'cancelled')>=capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ACTIVITY_REGISTRATION_CAPACITY_REACHED'; END IF;
END;
-- @statement
CREATE TRIGGER registration_capacity_update BEFORE UPDATE ON activity_registrations FOR EACH ROW
BEGIN
  DECLARE capacity BIGINT;
  IF NEW.status='registered' AND (NOT (NEW.status <=> OLD.status) OR NEW.activity_id<>OLD.activity_id) THEN
    SELECT max_registrations INTO capacity FROM activities WHERE id=NEW.activity_id FOR UPDATE;
    IF capacity IS NOT NULL AND (SELECT COUNT(*) FROM activity_registrations WHERE activity_id=NEW.activity_id AND status<>'cancelled' AND id<>OLD.id)>=capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ACTIVITY_REGISTRATION_CAPACITY_REACHED'; END IF;
  END IF;
END;
-- @statement
CREATE TRIGGER audit_logs_reasoned_admin_only BEFORE INSERT ON audit_logs FOR EACH ROW
BEGIN
  IF NEW.action NOT IN ('activity.delete','event.delete','conduct.category.delete','criteria_template.delete','criteria_group.delete','criteria_item.delete','user.class.transfer','user.access.update','user.role.update','user.status.update','activity.attendance.import') OR CHAR_LENGTH(TRIM(COALESCE(NEW.reason,'')))<10 OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_user_id AND role='admin') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REASONED_ADMIN_AUDIT_REQUIRED'; END IF;
END;
