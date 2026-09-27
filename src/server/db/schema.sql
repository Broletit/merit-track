PRAGMA foreign_keys = ON;

-- =========================================================
-- 1) USERS / SESSIONS / ROLE REQUESTS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  mssv              TEXT NOT NULL UNIQUE,
  full_name         TEXT NOT NULL,
  email             TEXT,
  gender            TEXT,
  date_of_birth     TEXT,
  phone             TEXT,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL CHECK(role IN ('student','class_officer','faculty_officer','admin')),
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  must_change_pw    INTEGER NOT NULL DEFAULT 1 CHECK(must_change_pw IN (0,1)),
  qr_secret         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_mssv ON users(mssv);

CREATE TABLE IF NOT EXISTS sessions (
  id                TEXT PRIMARY KEY,
  user_id           INTEGER NOT NULL,
  login_context     TEXT NOT NULL DEFAULT 'student'
                    CHECK(login_context IN ('student','class_officer','faculty_officer','admin')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at        TEXT NOT NULL,
  revoked_at        TEXT,
  user_agent        TEXT,
  ip                TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS role_requests (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  requested_role    TEXT NOT NULL CHECK(requested_role IN ('class_officer','faculty_officer')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  note              TEXT,
  decided_by        INTEGER,
  decided_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);

-- =========================================================
-- 2) CLASSES / MEMBERSHIP
-- =========================================================

CREATE TABLE IF NOT EXISTS classes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  faculty           TEXT,
  intake_year       INTEGER,
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(code);

CREATE TABLE IF NOT EXISTS class_members (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id          INTEGER NOT NULL,
  user_id           INTEGER NOT NULL,
  joined_at         TEXT NOT NULL DEFAULT (datetime('now')),
  left_at           TEXT,
  UNIQUE(class_id, user_id),
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON class_members(user_id);

-- =========================================================
-- 3) CONDUCT PERIODS / CONDUCT SCORES
-- =========================================================

CREATE TABLE IF NOT EXISTS conduct_periods (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  academic_year     TEXT NOT NULL,
  semester          TEXT NOT NULL,
  start_at          TEXT,
  end_at            TEXT,
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conduct_periods_active ON conduct_periods(is_active);

CREATE TABLE IF NOT EXISTS conduct_scores (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  period_id         INTEGER NOT NULL,
  source_type       TEXT NOT NULL CHECK(source_type IN ('activity','manual')),
  source_id         INTEGER,
  score_value       REAL NOT NULL DEFAULT 0,
  note              TEXT,
  created_by        INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, period_id, source_type, source_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(period_id) REFERENCES conduct_periods(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conduct_scores_user_id ON conduct_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_conduct_scores_period_id ON conduct_scores(period_id);
CREATE INDEX IF NOT EXISTS idx_conduct_scores_user_period ON conduct_scores(user_id, period_id);

-- =========================================================
-- 4) ACTIVITIES (KHOA TỔ CHỨC)
-- =========================================================

CREATE TABLE IF NOT EXISTS activities (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  title                 TEXT NOT NULL,
  description           TEXT,
  audience_type         TEXT NOT NULL DEFAULT 'student' CHECK(audience_type IN ('student','officer','all')),
  status                TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
  start_at              TEXT NOT NULL,
  end_at                TEXT NOT NULL,
  registration_start_at TEXT,
  registration_end_at   TEXT,
  registration_locked   INTEGER NOT NULL DEFAULT 0 CHECK(registration_locked IN (0,1)),
  checkin_start_at      TEXT,
  checkin_end_at        TEXT,
  conduct_score         REAL NOT NULL DEFAULT 0,
  attendance_mode       TEXT NOT NULL DEFAULT 'qr' CHECK(attendance_mode IN ('qr','manual','both')),
  qr_checkin_enabled    INTEGER NOT NULL DEFAULT 1 CHECK(qr_checkin_enabled IN (0,1)),
  created_by            INTEGER NOT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  published_at          TEXT,
  closed_at             TEXT,
  term_id INTEGER,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_audience_type ON activities(audience_type);
CREATE INDEX IF NOT EXISTS idx_activities_start_at ON activities(start_at);

CREATE TABLE IF NOT EXISTS activity_scopes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id       INTEGER NOT NULL,
  class_id          INTEGER NOT NULL,
  UNIQUE(activity_id, class_id),
  FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_scopes_activity_id ON activity_scopes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_scopes_class_id ON activity_scopes(class_id);

CREATE TABLE IF NOT EXISTS activity_registrations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id       INTEGER NOT NULL,
  user_id           INTEGER NOT NULL,
  class_id          INTEGER,
  status            TEXT NOT NULL DEFAULT 'registered'
                    CHECK(status IN ('registered','attended','absent','cancelled')),
  registered_at     TEXT NOT NULL DEFAULT (datetime('now')),
  checked_in_at     TEXT,
  checked_in_by     INTEGER,
  note              TEXT,
  UNIQUE(activity_id, user_id),
  FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY(checked_in_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_registrations_activity_id ON activity_registrations(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_registrations_user_id ON activity_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_registrations_status ON activity_registrations(status);

CREATE TABLE IF NOT EXISTS activity_attendance_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id       INTEGER NOT NULL,
  user_id           INTEGER,
  qr_payload        TEXT,
  scanned_by        INTEGER NOT NULL,
  scanned_at        TEXT NOT NULL DEFAULT (datetime('now')),
  result            TEXT NOT NULL CHECK(result IN ('success','duplicate','invalid','out_of_window','not_registered')),
  note              TEXT,
  FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(scanned_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_activity_attendance_logs_activity_id ON activity_attendance_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_logs_scanned_by ON activity_attendance_logs(scanned_by);

-- =========================================================
-- 5) CRITERIA TEMPLATES / GROUPS / ITEMS
-- template = bộ tiêu chuẩn
-- groups   = tiêu chuẩn
-- items    = tiêu chí
-- =========================================================

CREATE TABLE IF NOT EXISTS criteria_templates (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  description       TEXT,
  for_type          TEXT NOT NULL DEFAULT 'student' CHECK(for_type IN ('student','officer')),
  created_by        INTEGER NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS criteria_template_groups (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id       INTEGER NOT NULL,
  code              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  min_required      INTEGER NOT NULL DEFAULT 1 CHECK(min_required >= 0),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(template_id, code),
  FOREIGN KEY(template_id) REFERENCES criteria_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_criteria_template_groups_template_id
  ON criteria_template_groups(template_id);

CREATE TABLE IF NOT EXISTS criteria_template_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id       INTEGER NOT NULL,
  group_code        TEXT,
  code              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  score_max         REAL NOT NULL DEFAULT 0,
  evidence_type     TEXT NOT NULL DEFAULT 'manual' CHECK(evidence_type IN ('auto','manual','both')),
  is_required       INTEGER NOT NULL DEFAULT 0 CHECK(is_required IN (0,1)),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(template_id, code),
  FOREIGN KEY(template_id) REFERENCES criteria_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_criteria_template_items_template_id
  ON criteria_template_items(template_id);

-- =========================================================
-- 6) AUTO RULES: ACTIVITY / CONDUCT -> CRITERIA
-- =========================================================

CREATE TABLE IF NOT EXISTS criteria_activity_rules (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id       INTEGER NOT NULL,
  criteria_code     TEXT NOT NULL,
  activity_id       INTEGER NOT NULL,
  UNIQUE(template_id, criteria_code, activity_id),
  FOREIGN KEY(template_id) REFERENCES criteria_templates(id) ON DELETE CASCADE,
  FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_criteria_activity_rules_template_criteria
  ON criteria_activity_rules(template_id, criteria_code);

CREATE TABLE IF NOT EXISTS criteria_conduct_rules (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id       INTEGER NOT NULL,
  criteria_code     TEXT NOT NULL,
  min_score         REAL NOT NULL DEFAULT 0,
  period_scope      TEXT NOT NULL DEFAULT 'current' CHECK(period_scope IN ('current','any')),
  UNIQUE(template_id, criteria_code),
  FOREIGN KEY(template_id) REFERENCES criteria_templates(id) ON DELETE CASCADE
);

-- =========================================================
-- 7) EVENTS (ĐỢT XÉT)
-- type = student | officer
-- officer sẽ dùng score_max ở item
-- student chỉ xét đạt/không đạt
-- =========================================================

CREATE TABLE IF NOT EXISTS events (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT NOT NULL,
  description         TEXT,
  type                TEXT NOT NULL DEFAULT 'student' CHECK(type IN ('student','officer')),
  status              TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
  start_at            TEXT NOT NULL,
  end_at              TEXT NOT NULL,
  allow_late          INTEGER NOT NULL DEFAULT 0 CHECK(allow_late IN (0,1)),
  created_by          INTEGER NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  published_at        TEXT,
  closed_at           TEXT,
  criteria_template_id INTEGER,
  term_id INTEGER,
  FOREIGN KEY(criteria_template_id) REFERENCES criteria_templates(id) ON DELETE SET NULL,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

CREATE TABLE IF NOT EXISTS event_scopes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id          INTEGER NOT NULL,
  class_id          INTEGER NOT NULL,
  UNIQUE(event_id, class_id),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_scopes_event_id ON event_scopes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scopes_class_id ON event_scopes(class_id);



-- =========================================================
-- 8) SNAPSHOT TIÊU CHUẨN / TIÊU CHÍ THEO ĐỢT XÉT
-- groups = tiêu chuẩn
-- items  = tiêu chí
-- =========================================================

CREATE TABLE IF NOT EXISTS event_criteria_groups (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id          INTEGER NOT NULL,
  code              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  min_required      INTEGER NOT NULL DEFAULT 1 CHECK(min_required >= 0),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(event_id, code),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_criteria_groups_event_id
  ON event_criteria_groups(event_id);

CREATE TABLE IF NOT EXISTS event_criteria_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id          INTEGER NOT NULL,
  group_code        TEXT,
  code              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  score_max         REAL NOT NULL DEFAULT 0,
  evidence_type     TEXT NOT NULL DEFAULT 'manual' CHECK(evidence_type IN ('auto','manual','both')),
  is_required       INTEGER NOT NULL DEFAULT 0 CHECK(is_required IN (0,1)),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(event_id, code),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_criteria_items_event_id
  ON event_criteria_items(event_id);

-- =========================================================
-- 9) SUBMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS submissions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id          INTEGER NOT NULL,
  user_id           INTEGER NOT NULL,
  class_id          INTEGER,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK(status IN ('draft','submitted_v1','needs_revision_v1','submitted_v2','passed','failed','closed')),
  submitted_at      TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  score_total       REAL NOT NULL DEFAULT 0,
  v1_deadline       TEXT,
  v1_note           TEXT,
  v2_note           TEXT,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE SET NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_event_id ON submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

CREATE TABLE IF NOT EXISTS submission_support_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_submission_support_status ON submission_support_requests(status);

CREATE TABLE IF NOT EXISTS submission_selected_criteria (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id     INTEGER NOT NULL,
  criteria_code     TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(submission_id, criteria_code),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submission_selected_criteria_submission_id
  ON submission_selected_criteria(submission_id);

CREATE TABLE IF NOT EXISTS submission_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id     INTEGER NOT NULL,
  criteria_code     TEXT NOT NULL,
  content_text      TEXT,
  reviewer_note     TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(submission_id, criteria_code),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submission_items_submission_id
  ON submission_items(submission_id);

CREATE TABLE IF NOT EXISTS submission_files (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id     INTEGER NOT NULL,
  criteria_code     TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  mime_type         TEXT,
  size_bytes        INTEGER,
  uploaded_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission_id
  ON submission_files(submission_id);

CREATE TABLE IF NOT EXISTS submission_auto_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  criteria_code TEXT NOT NULL,
  source_type TEXT,
  source_id INTEGER,
  passed INTEGER NOT NULL DEFAULT 0 CHECK(passed IN (0,1)),
  message TEXT,
  matched_activity_ids TEXT,
  matched_activity_titles TEXT,
  evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(submission_id, criteria_code),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submission_auto_results_submission_id
  ON submission_auto_results(submission_id);

CREATE TABLE IF NOT EXISTS submission_timeline (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id     INTEGER NOT NULL,
  actor_user_id     INTEGER,
  action            TEXT NOT NULL,
  from_status       TEXT,
  to_status         TEXT,
  message           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_timeline_submission_id
  ON submission_timeline(submission_id);

-- =========================================================
-- 10) REVIEWS / RESULTS
-- =========================================================

CREATE TABLE IF NOT EXISTS reviews (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id     INTEGER NOT NULL,
  round             INTEGER NOT NULL CHECK(round IN (1,2)),
  reviewer_id       INTEGER NOT NULL,
  decision          TEXT NOT NULL CHECK(decision IN ('pass','revise','fail')),
  note              TEXT,
  deadline          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY(reviewer_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE(submission_id, round)
);

CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

CREATE TABLE IF NOT EXISTS submission_criteria_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  criteria_code TEXT NOT NULL,
  round INTEGER NOT NULL CHECK(round IN (1,2)),
  reviewer_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('pass','fail')),
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(submission_id, criteria_code, round),
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY(reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_submission_criteria_reviews_submission ON submission_criteria_reviews(submission_id, round);

CREATE TABLE IF NOT EXISTS event_results (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id          INTEGER NOT NULL,
  user_id           INTEGER NOT NULL,
  submission_id     INTEGER,
  result_code       TEXT NOT NULL CHECK(result_code IN ('PASS','FAIL','PENDING')),
  result_label      TEXT,
  score_total       REAL NOT NULL DEFAULT 0,
  summary           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, user_id),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_event_results_event_id ON event_results(event_id);
CREATE INDEX IF NOT EXISTS idx_event_results_user_id ON event_results(user_id);

-- =========================================================
-- 11) CONTENT / NOTIFICATIONS / AUDIT
-- =========================================================

CREATE TABLE IF NOT EXISTS news_posts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  slug              TEXT UNIQUE,
  summary           TEXT,
  content           TEXT,
  image_url         TEXT,
  is_published      INTEGER NOT NULL DEFAULT 1 CHECK(is_published IN (0,1)),
  published_at      TEXT,
  created_by        INTEGER,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS banners (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  description       TEXT,
  image_url         TEXT,
  type              TEXT NOT NULL CHECK(type IN ('event','news','link')),
  event_id          INTEGER,
  news_id           INTEGER,
  link              TEXT,
  badge             TEXT,
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_by        INTEGER,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY(news_id) REFERENCES news_posts(id) ON DELETE SET NULL,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  content           TEXT,
  link              TEXT,
  is_read           INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  read_at           TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id     INTEGER,
  action            TEXT NOT NULL,
  entity_type       TEXT,
  entity_id         TEXT,
  meta_json         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =========================================================
-- 12) COMPATIBILITY VIEWS
-- chặn lỗi cho code cũ nếu còn query activity_participants
-- =========================================================

CREATE VIEW IF NOT EXISTS activity_participants AS
SELECT
  id,
  activity_id,
  user_id,
  class_id,
  status,
  registered_at,
  checked_in_at,
  checked_in_by,
  note
FROM activity_registrations;

CREATE TABLE IF NOT EXISTS academic_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  name TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(academic_year, semester)
);

CREATE TABLE IF NOT EXISTS faculty_class_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_officer_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(faculty_officer_id, class_id),
  FOREIGN KEY(faculty_officer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_faculty_class_assignments_officer
ON faculty_class_assignments(faculty_officer_id);

CREATE INDEX IF NOT EXISTS idx_faculty_class_assignments_class
ON faculty_class_assignments(class_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conduct_scores_activity_unique
ON conduct_scores(user_id, source_type, source_id)
WHERE source_type = 'activity';

-- =========================================================
-- 13) SCORE FRAMES / IMPORTS / AUDIT DETAILS
-- =========================================================

CREATE TABLE IF NOT EXISTS conduct_score_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id INTEGER NOT NULL,
  parent_id INTEGER,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  score_max REAL NOT NULL DEFAULT 0 CHECK(score_max >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id) REFERENCES conduct_score_categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS activity_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  import_mode TEXT NOT NULL CHECK(import_mode IN ('append','replace')),
  reason TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  imported_by INTEGER,
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  reverted_at TEXT,
  UNIQUE(activity_id, file_hash),
  FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY(imported_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_import_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  row_number INTEGER NOT NULL,
  mssv TEXT,
  user_id INTEGER,
  status TEXT NOT NULL CHECK(status IN ('imported','duplicate','invalid')),
  message TEXT,
  FOREIGN KEY(batch_id) REFERENCES activity_import_batches(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conduct_categories_term
ON conduct_score_categories(term_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conduct_categories_sibling_code
ON conduct_score_categories(term_id, COALESCE(parent_id, 0), code);
CREATE INDEX IF NOT EXISTS idx_activity_import_batches_activity
ON activity_import_batches(activity_id);
