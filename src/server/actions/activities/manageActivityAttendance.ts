"use server";

import { revalidatePath } from "next/cache";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function markActivityAttendance(registrationId: number) {
  const reviewer = await requireFacultyOfficerContext();
  const db = getDb();

  const registration = db
    .prepare(
      `
      SELECT
        ar.id,
        ar.activity_id,
        ar.user_id,
        ar.status
      FROM activity_registrations ar
      WHERE ar.id = ?
      LIMIT 1
      `
    )
    .get(registrationId) as
    | {
        id: number;
        activity_id: number;
        user_id: number;
        status: string;
      }
    | undefined;

  if (!registration) {
    throw new Error("Không tìm thấy lượt đăng ký hoạt động.");
  }

  if (registration.status === "attended") {
    throw new Error("Người dùng này đã được xác nhận tham gia.");
  }

  const activity = db
    .prepare(
      `
      SELECT id, conduct_score
      FROM activities
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(registration.activity_id) as
    | {
        id: number;
        conduct_score: number;
      }
    | undefined;

  if (!activity) {
    throw new Error("Hoạt động không tồn tại.");
  }

  const membership = db
    .prepare(
      `
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
      ORDER BY rowid DESC
      LIMIT 1
      `
    )
    .get(registration.user_id) as { class_id: number } | undefined;

  const activePeriod = db
    .prepare(
      `
      SELECT id
      FROM conduct_periods
      WHERE is_active = 1
      ORDER BY rowid DESC
      LIMIT 1
      `
    )
    .get() as { id: number } | undefined;

  const tx = db.transaction(() => {
    db.prepare(
      `
      UPDATE activity_registrations
      SET
        status = 'attended',
        checked_in_at = datetime('now'),
        checked_in_by = ?
      WHERE id = ?
      `
    ).run(reviewer.id, registrationId);

    db.prepare(
      `
      INSERT INTO activity_attendance_logs (
        activity_id,
        user_id,
        qr_payload,
        scanned_by,
        scanned_at,
        result,
        note
      )
      VALUES (?, ?, ?, ?, datetime('now'), 'success', ?)
      `
    ).run(
      registration.activity_id,
      registration.user_id,
      null,
      reviewer.id,
      "Xác nhận tham gia thủ công bởi cán bộ khoa"
    );

    if (
      activePeriod &&
      membership &&
      Number(activity.conduct_score ?? 0) > 0
    ) {
      const existedConduct = db
        .prepare(
          `
          SELECT id
          FROM conduct_scores
          WHERE user_id = ?
            AND period_id = ?
            AND source_type = 'activity'
            AND source_id = ?
          LIMIT 1
          `
        )
        .get(registration.user_id, activePeriod.id, registration.activity_id) as
        | { id: number }
        | undefined;

      if (!existedConduct) {
        db.prepare(
          `
          INSERT INTO conduct_scores (
            user_id,
            period_id,
            source_type,
            source_id,
            score_value,
            note,
            created_by,
            created_at
          )
          VALUES (?, ?, 'activity', ?, ?, ?, ?, datetime('now'))
          `
        ).run(
          registration.user_id,
          activePeriod.id,
          registration.activity_id,
          activity.conduct_score,
          "Điểm tự động từ xác nhận tham gia hoạt động",
          reviewer.id
        );
      }
    }
  });

  tx();

  revalidatePath("/dashboard/faculty-officer/activities");
  revalidatePath(`/dashboard/faculty-officer/activities/${registration.activity_id}`);
  revalidatePath("/dashboard/student/activities");
  revalidatePath(`/dashboard/student/activities/${registration.activity_id}`);
  revalidatePath("/dashboard/admin/activities");

  return {
    ok: true,
    message: "Đã xác nhận tham gia hoạt động.",
  };
}