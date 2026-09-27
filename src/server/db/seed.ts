import { getDb } from "./sqlite";
import { hashPasswordSync } from "@/server/auth/password";

function plusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function minusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function seedDb() {
  const db = getDb();
  const passwordHash = hashPasswordSync("1111");

  const tx = db.transaction(() => {
    db.pragma("foreign_keys = OFF");

    db.prepare(`DELETE FROM submissions`).run();
    db.prepare(`DELETE FROM events`).run();
    db.prepare(`DELETE FROM conduct_scores`).run();
    db.prepare(`DELETE FROM conduct_periods`).run();
    db.prepare(`DELETE FROM class_members`).run();
    db.prepare(`DELETE FROM classes`).run();
    db.prepare(`DELETE FROM users`).run();

    db.pragma("foreign_keys = ON");

    const insertUser = db.prepare(`
      INSERT INTO users (
        mssv, full_name, email, password_hash, role,
        is_active, must_change_pw, qr_secret,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1, 0, ?, datetime('now'), datetime('now'))
    `);

    const adminId = Number(insertUser.run(
      "admin",
      "Quản trị hệ thống",
      "admin@merittrack.local",
      passwordHash,
      "admin",
      "qr-admin"
    ).lastInsertRowid);

    const classOfficerId = Number(insertUser.run(
      "21110001",
      "Nguyễn Bí Thư Lớp",
      "loptruong@merittrack.local",
      passwordHash,
      "class_officer",
      "qr-21110001"
    ).lastInsertRowid);

    const facultyOfficerId = Number(insertUser.run(
      "21110002",
      "Trần Cán Bộ Khoa",
      "cbkhoa@merittrack.local",
      passwordHash,
      "faculty_officer",
      "qr-21110002"
    ).lastInsertRowid);

    const studentAId = Number(insertUser.run(
      "21110003",
      "Lê Sinh Viên A",
      "sva@merittrack.local",
      passwordHash,
      "student",
      "qr-21110003"
    ).lastInsertRowid);

    const studentBId = Number(insertUser.run(
      "21110004",
      "Phạm Sinh Viên B",
      "svb@merittrack.local",
      passwordHash,
      "student",
      "qr-21110004"
    ).lastInsertRowid);

    const studentCId = Number(insertUser.run(
      "21110005",
      "Hoàng Sinh Viên C",
      "svc@merittrack.local",
      passwordHash,
      "student",
      "qr-21110005"
    ).lastInsertRowid);

    const insertClass = db.prepare(`
      INSERT INTO classes (code, name, faculty, intake_year, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `);

    const classAId = Number(insertClass.run(
      "DHTH17A",
      "Lớp DHTH17A",
      "Công nghệ thông tin",
      2021
    ).lastInsertRowid);

    const classBId = Number(insertClass.run(
      "DHTH17B",
      "Lớp DHTH17B",
      "Công nghệ thông tin",
      2021
    ).lastInsertRowid);

    const insertMember = db.prepare(`
      INSERT INTO class_members (class_id, user_id, joined_at)
      VALUES (?, ?, datetime('now'))
    `);

    insertMember.run(classAId, classOfficerId);
    insertMember.run(classAId, studentAId);
    insertMember.run(classAId, studentBId);
    insertMember.run(classBId, facultyOfficerId);
    insertMember.run(classBId, studentCId);

    const insertActivity = db.prepare(`
      INSERT INTO activities (
        title, description, audience_type, status,
        start_at, end_at,
        registration_start_at, registration_end_at,
        checkin_start_at, checkin_end_at,
        conduct_score,
        attendance_mode, qr_checkin_enabled,
        created_by, created_at, published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'qr', 1, ?, datetime('now'), datetime('now'))
    `);

    const activity1Id = Number(insertActivity.run(
      "Xuân tình nguyện",
      "Hoạt động tình nguyện",
      "student",
      "published",
      minusDays(10),
      minusDays(9),
      minusDays(20),
      minusDays(11),
      minusDays(10),
      minusDays(9),
      10,
      adminId
    ).lastInsertRowid);

    const activity2Id = Number(insertActivity.run(
      "Tập huấn cán bộ",
      "Dành cho cán bộ",
      "officer",
      "published",
      minusDays(5),
      minusDays(4),
      minusDays(7),
      minusDays(6),
      minusDays(5),
      minusDays(4),
      12,
      adminId
    ).lastInsertRowid);

    const periodId = Number(db.prepare(`
      INSERT INTO conduct_periods (
        code, name, academic_year, semester,
        start_at, end_at, is_active, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
      "2025-2026-HK2",
      "Điểm rèn luyện HK2",
      "2025-2026",
      "HK2",
      minusDays(120),
      plusDays(120)
    ).lastInsertRowid);

    const insertConduct = db.prepare(`
      INSERT INTO conduct_scores (
        user_id, period_id, source_type, source_id,
        score_value, note, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertConduct.run(studentAId, periodId, "activity", activity1Id, 10, "Điểm tình nguyện", adminId);
    insertConduct.run(classOfficerId, periodId, "activity", activity2Id, 12, "Điểm cán bộ", adminId);

    const eventId = Number(db.prepare(`
      INSERT INTO events (
        title, description, type, status,
        start_at, end_at,
        created_by, created_at, published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      "Xét Sinh viên 5 tốt",
      "Đợt xét cấp khoa",
      "student",
      "published",
      minusDays(2),
      plusDays(10),
      adminId
    ).lastInsertRowid);

    db.prepare(`
      INSERT INTO submissions (
        event_id, user_id, class_id, status,
        submitted_at, updated_at, score_total
      )
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?)
    `).run(eventId, studentAId, classAId, "submitted_v1", 10);
  });

  tx();

  return {
    ok: true,
    accounts: {
      admin: { username: "admin", password: "1111" },
      class_officer: { username: "21110001", password: "1111" },
      faculty_officer: { username: "21110002", password: "1111" },
      student_a: { username: "21110003", password: "1111" },
      student_b: { username: "21110004", password: "1111" },
      student_c: { username: "21110005", password: "1111" },
    },
  };
}

export const seedBaseData = seedDb;