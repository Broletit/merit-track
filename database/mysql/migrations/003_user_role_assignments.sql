CREATE TABLE IF NOT EXISTS user_role_assignments (
  user_id BIGINT NOT NULL,
  role VARCHAR(32) NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, role),
  KEY idx_user_role_assignments_role (role, user_id),
  CONSTRAINT fk_user_role_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ck_user_role_assignments_role CHECK (role IN ('student','class_officer','faculty_officer','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO user_role_assignments(user_id, role)
SELECT id, CASE WHEN role='admin' THEN 'admin' ELSE 'student' END FROM users;

INSERT IGNORE INTO user_role_assignments(user_id, role)
SELECT id, role FROM users WHERE role IN ('class_officer','faculty_officer');
