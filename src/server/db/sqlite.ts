import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedBaseData } from "./seed";

let db: Database.Database | null = null;
let initialized = false;
let seeding = false;

function getDbPath() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "merit-track.sqlite");
}

function getSchemaPath() {
  return path.join(process.cwd(), "src", "server", "db", "schema.sql");
}

export function ensureDb() {
  if (initialized && db) return;

  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  const schemaPath = getSchemaPath();
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  db.exec(schemaSql);

  // Chuyển dữ liệu kết quả tự động từ cấu trúc cũ sang cấu trúc hiện tại.
  // SQLite không tự cập nhật cấu trúc của bảng khi dùng CREATE TABLE IF NOT EXISTS.
  const autoResultColumns = db
    .prepare(`PRAGMA table_info(submission_auto_results)`)
    .all() as Array<{ name: string }>;
  if (
    autoResultColumns.some((column) => column.name === "source_type") &&
    !autoResultColumns.some((column) => column.name === "matched_activity_ids")
  ) {
    db.exec(`
      ALTER TABLE submission_auto_results RENAME TO submission_auto_results_legacy;

      CREATE TABLE submission_auto_results (
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

      INSERT INTO submission_auto_results (
        submission_id, criteria_code, source_type, source_id, passed, message,
        matched_activity_ids, matched_activity_titles, evaluated_at
      )
      SELECT
        submission_id,
        criteria_code,
        MAX(source_type),
        MAX(source_id),
        MAX(passed),
        MAX(message),
        CASE
          WHEN MAX(CASE WHEN source_id IS NOT NULL THEN 1 ELSE 0 END) = 1
          THEN json_group_array(source_id)
          ELSE '[]'
        END,
        '[]',
        MAX(evaluated_at)
      FROM submission_auto_results_legacy
      GROUP BY submission_id, criteria_code;

      DROP TABLE submission_auto_results_legacy;
      CREATE INDEX IF NOT EXISTS idx_submission_auto_results_submission_id
        ON submission_auto_results(submission_id);
    `);
  }

  // Giữ tương thích với cả hai luồng đánh giá tự động đang được sử dụng.
  const currentAutoResultColumns = db
    .prepare(`PRAGMA table_info(submission_auto_results)`)
    .all() as Array<{ name: string }>;
  const currentAutoResultColumnNames = new Set(
    currentAutoResultColumns.map((column) => column.name)
  );
  if (!currentAutoResultColumnNames.has("source_type")) {
    db.exec(`ALTER TABLE submission_auto_results ADD COLUMN source_type TEXT`);
  }
  if (!currentAutoResultColumnNames.has("source_id")) {
    db.exec(`ALTER TABLE submission_auto_results ADD COLUMN source_id INTEGER`);
  }
  if (!currentAutoResultColumnNames.has("message")) {
    db.exec(`ALTER TABLE submission_auto_results ADD COLUMN message TEXT`);
  }
  if (!currentAutoResultColumnNames.has("matched_activity_ids")) {
    db.exec(
      `ALTER TABLE submission_auto_results ADD COLUMN matched_activity_ids TEXT`
    );
  }
  if (!currentAutoResultColumnNames.has("matched_activity_titles")) {
    db.exec(
      `ALTER TABLE submission_auto_results ADD COLUMN matched_activity_titles TEXT`
    );
  }

  const ensureColumn = (table: string, column: string, definition: string) => {
    const columns = db!.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
    }>;
    if (!columns.some((item) => item.name === column)) {
      db!.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  ensureColumn("class_members", "joined_at", "TEXT");
  ensureColumn("class_members", "left_at", "TEXT");
  ensureColumn("activities", "organizer_level", "TEXT NOT NULL DEFAULT 'faculty'");
  ensureColumn("activities", "participation_source", "TEXT NOT NULL DEFAULT 'internal'");
  ensureColumn("activities", "conduct_category_id", "INTEGER");
  ensureColumn("activities", "registration_locked", "INTEGER NOT NULL DEFAULT 0");
  db.exec(`UPDATE activities SET status='published',registration_locked=1 WHERE status='closed'`);
  db.exec(`UPDATE activities SET audience_type='student' WHERE audience_type='all'`);
  ensureColumn("conduct_score_categories", "parent_id", "INTEGER");
  const conductCategorySchema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='conduct_score_categories'`).get() as { sql: string } | undefined;
  if (conductCategorySchema?.sql?.replace(/\s+/g, " ").includes("UNIQUE(term_id, code)")) {
    db.pragma("foreign_keys = OFF");
    db.exec(`
      BEGIN;
      ALTER TABLE conduct_score_categories RENAME TO conduct_score_categories_legacy;
      CREATE TABLE conduct_score_categories (
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
      INSERT INTO conduct_score_categories(id,term_id,parent_id,code,name,score_max,sort_order,created_at)
      SELECT id,term_id,parent_id,code,name,score_max,sort_order,created_at FROM conduct_score_categories_legacy;
      DROP TABLE conduct_score_categories_legacy;
      CREATE INDEX idx_conduct_categories_term ON conduct_score_categories(term_id);
      CREATE UNIQUE INDEX idx_conduct_categories_sibling_code ON conduct_score_categories(term_id,COALESCE(parent_id,0),code);
      COMMIT;
    `);
    db.pragma("foreign_keys = ON");
  }
  ensureColumn("activity_registrations", "import_batch_id", "INTEGER");
  ensureColumn("criteria_activity_rules", "score_value", "REAL NOT NULL DEFAULT 0");
  ensureColumn("criteria_template_groups", "score_max", "REAL");
  ensureColumn("event_criteria_groups", "score_max", "REAL");
  ensureColumn("audit_logs", "reason", "TEXT");
  ensureColumn("audit_logs", "before_json", "TEXT");
  ensureColumn("audit_logs", "after_json", "TEXT");

  // Phục hồi snapshot tiêu chuẩn cho các đợt xét cũ được tạo trước khi cơ chế
  // snapshot được áp dụng. Chỉ bổ sung khi đợt xét chưa có snapshot, không ghi
  // đè dữ liệu lịch sử đã tồn tại.
  db.exec(`
    INSERT INTO event_criteria_groups (
      event_id, code, title, description, min_required, sort_order
    )
    SELECT
      e.id, g.code, g.title, g.description, g.min_required, g.sort_order
    FROM events e
    INNER JOIN criteria_template_groups g ON g.template_id = e.criteria_template_id
    WHERE e.criteria_template_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM event_criteria_groups existing WHERE existing.event_id = e.id
      );

    INSERT INTO event_criteria_items (
      event_id, group_code, code, title, description,
      score_max, evidence_type, is_required, sort_order
    )
    SELECT
      e.id, i.group_code, i.code, i.title, i.description,
      i.score_max, i.evidence_type, i.is_required, i.sort_order
    FROM events e
    INNER JOIN criteria_template_items i ON i.template_id = e.criteria_template_id
    WHERE e.criteria_template_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM event_criteria_items existing WHERE existing.event_id = e.id
      );

    -- Khôi phục kết quả tự động còn thiếu của hồ sơ cũ từ dữ liệu điểm danh.
    INSERT INTO submission_auto_results (
      submission_id, criteria_code, passed,
      matched_activity_ids, matched_activity_titles, evaluated_at
    )
    SELECT
      s.id,
      i.code,
      1,
      json_group_array(DISTINCT a.id),
      json_group_array(DISTINCT a.title),
      datetime('now')
    FROM submissions s
    INNER JOIN events e ON e.id = s.event_id
    INNER JOIN event_criteria_items i
      ON i.event_id = e.id
     AND i.evidence_type IN ('auto', 'both')
    INNER JOIN criteria_activity_rules r
      ON r.template_id = e.criteria_template_id
     AND r.criteria_code = i.code
    INNER JOIN activities a
      ON a.id = r.activity_id
     AND a.term_id = e.term_id
    INNER JOIN activity_registrations ar
      ON ar.activity_id = a.id
     AND ar.user_id = s.user_id
     AND ar.status = 'attended'
    GROUP BY s.id, i.code
    ON CONFLICT(submission_id, criteria_code) DO UPDATE SET
      passed = excluded.passed,
      matched_activity_ids = excluded.matched_activity_ids,
      matched_activity_titles = excluded.matched_activity_titles;

    -- Điểm hồ sơ cán bộ là tổng điểm của các tiêu chí đã có nguồn đáp ứng.
    UPDATE submissions
    SET score_total = COALESCE((
      SELECT SUM(i.score_max)
      FROM event_criteria_items i
      WHERE i.event_id = submissions.event_id
        AND (
          EXISTS (
            SELECT 1 FROM submission_selected_criteria sc
            WHERE sc.submission_id = submissions.id
              AND sc.criteria_code = i.code
          )
          OR EXISTS (
            SELECT 1 FROM submission_items si
            WHERE si.submission_id = submissions.id
              AND si.criteria_code = i.code
          )
          OR EXISTS (
            SELECT 1 FROM submission_auto_results ar
            WHERE ar.submission_id = submissions.id
              AND ar.criteria_code = i.code
              AND ar.passed = 1
          )
        )
    ), 0)
    WHERE EXISTS (
      SELECT 1 FROM events officer_event
      WHERE officer_event.id = submissions.event_id
        AND officer_event.type = 'officer'
    );
  `);

  const sessionColumns = db.prepare(`PRAGMA table_info(sessions)`).all() as Array<{
    name: string;
  }>;
  if (!sessionColumns.some((column) => column.name === "login_context")) {
    db.exec(
      `ALTER TABLE sessions ADD COLUMN login_context TEXT NOT NULL DEFAULT 'student'`
    );
  }

  const hasUsersTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`)
    .get();

  if (!hasUsersTable) {
    throw new Error("Không tạo được bảng users từ schema.sql");
  }

  initialized = true;

  const userCountRow = db.prepare(`SELECT COUNT(*) as count FROM users`).get() as {
    count: number;
  };

  if (Number(userCountRow.count || 0) === 0 && !seeding) {
    seeding = true;
    try {
      seedBaseData();
    } finally {
      seeding = false;
    }
  }
}

export function getDb() {
  ensureDb();
  if (!db) {
    throw new Error("Database chưa được khởi tạo.");
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
    initialized = false;
    seeding = false;
  }
}
