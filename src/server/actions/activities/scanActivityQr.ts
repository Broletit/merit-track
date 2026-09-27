"use server";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { decodeAndVerifyStudentQr } from "@/server/auth/qr";

type CheckinMethod = "qr" | "manual";

type ScanResult = {
  ok: boolean;
  message: string;
};

type LogResult =
  | "success"
  | "duplicate"
  | "invalid"
  | "out_of_window"
  | "not_registered";

function makePayload(method: CheckinMethod, raw: string, mssv: string) {
  return method === "manual" ? JSON.stringify({ mssv }) : raw;
}

function insertAttendanceLog({
  activityId,
  userId,
  payload,
  scannedBy,
  result,
  note,
}: {
  activityId: number;
  userId: number | null;
  payload: string;
  scannedBy: number;
  result: LogResult;
  note: string;
}) {
  const db = getDb();

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
    VALUES (?, ?, ?, ?, datetime('now'), ?, ?)
    `
  ).run(activityId, userId, payload, scannedBy, result, note);
}

export async function scanActivityQr(
  activityId: number,
  rawPayload: string,
  method: CheckinMethod = "qr"
): Promise<ScanResult> {
  const officer = await requireLogin();
  const loginContext = String(officer.loginContext ?? "student");

  if (
    !["faculty_officer", "admin"].includes(String(officer.role)) ||
    !["faculty_officer", "admin"].includes(loginContext)
  ) {
    throw new Error("Bạn không có quyền điểm danh hoạt động.");
  }
  const db = getDb();

  const verifiedQr = method === "qr" ? decodeAndVerifyStudentQr(rawPayload) : null;
  const mssv = method === "manual" ? rawPayload.trim() : verifiedQr?.mssv.trim() ?? "";

  const payloadForLog = makePayload(method, rawPayload, mssv);

  if (!Number.isFinite(activityId) || activityId <= 0) {
    return {
      ok: false,
      message: "Hoạt động không hợp lệ.",
    };
  }

  if (!mssv) {
    insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "QR hoặc MSSV không hợp lệ",
    });

    return {
      ok: false,
      message: "QR hoặc MSSV không hợp lệ.",
    };
  }

  const activity = db
    .prepare(
      `
      SELECT
        id,
        title,
        status,
        start_at,
        end_at,
        qr_checkin_enabled,
        conduct_score
      FROM activities
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(activityId) as
    | {
        id: number;
        title: string;
        status: string;
        start_at: string | null;
        end_at: string | null;
        qr_checkin_enabled: number;
        conduct_score: number;
      }
    | undefined;

  if (!activity) {
    return {
      ok: false,
      message: "Hoạt động không tồn tại.",
    };
  }

  if (activity.status !== "published") {
    insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Hoạt động chưa được công khai",
    });

    return {
      ok: false,
      message: "Hoạt động chưa được công khai.",
    };
  }

  if (method === "qr" && Number(activity.qr_checkin_enabled ?? 0) !== 1) {
    insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Hoạt động chưa bật QR check-in",
    });

    return {
      ok: false,
      message: "Hoạt động này chưa bật QR check-in.",
    };
  }

  const now = new Date();
  const startAt = activity.start_at ? new Date(activity.start_at) : null;
  const endAt = activity.end_at ? new Date(activity.end_at) : null;

  if (
    !startAt ||
    !endAt ||
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime())
  ) {
    insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Hoạt động chưa có thời gian hợp lệ",
    });

    return {
      ok: false,
      message: "Hoạt động chưa có thời gian hợp lệ.",
    };
  }

  if (now < startAt || now > endAt) {
    insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "out_of_window",
      note:
        now < startAt
          ? "Hoạt động chưa diễn ra"
          : "Hoạt động đã kết thúc",
    });

    return {
      ok: false,
      message:
        now < startAt
          ? "Hoạt động chưa diễn ra nên chưa thể điểm danh."
          : "Hoạt động đã kết thúc nên không thể điểm danh.",
    };
  }

  const user = db
    .prepare(
      `
      SELECT id, full_name, mssv, role
      FROM users
      WHERE mssv = ?
      LIMIT 1
      `
    )
    .get(mssv) as
    | {
        id: number;
        full_name: string;
        mssv: string;
        role: string;
      }
    | undefined;

  if (!user) {
    insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: `Không tìm thấy người dùng có MSSV ${mssv}`,
    });

    return {
      ok: false,
      message: `Không tìm thấy người dùng có MSSV ${mssv}.`,
    };
  }

  if (method === "qr" && Number(user.id) !== Number(verifiedQr?.userId)) {
    insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Mã QR không khớp tài khoản sinh viên",
    });

    return {
      ok: false,
      message: "Mã QR không hợp lệ hoặc không khớp tài khoản sinh viên.",
    };
  }

  if (!["student", "class_officer", "faculty_officer"].includes(user.role)) {
    insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Tài khoản không thuộc đối tượng được điểm danh",
    });

    return {
      ok: false,
      message: `${user.full_name} (${user.mssv}) không thuộc đối tượng được điểm danh.`,
    };
  }

  const registration = db
    .prepare(
      `
      SELECT id, status
      FROM activity_registrations
      WHERE activity_id = ?
        AND user_id = ?
      LIMIT 1
      `
    )
    .get(activityId, user.id) as
    | {
        id: number;
        status: string;
      }
    | undefined;

  if (!registration) {
    insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "not_registered",
      note: "Người dùng chưa đăng ký hoạt động này",
    });

    return {
      ok: false,
      message: `${user.full_name} (${user.mssv}) chưa đăng ký hoạt động này.`,
    };
  }

  if (registration.status === "attended") {
    insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "duplicate",
      note: "Người dùng đã điểm danh trước đó",
    });

    return {
      ok: false,
      message: `${user.full_name} (${user.mssv}) đã điểm danh trước đó.`,
    };
  }

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
    ).run(officer.id, registration.id);

    insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "success",
      note:
        method === "qr"
          ? "Quét QR thành công"
          : "Điểm danh thủ công thành công",
    });

    if (activePeriod && Number(activity.conduct_score ?? 0) > 0) {
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
        .get(user.id, activePeriod.id, activityId) as { id: number } | undefined;

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
          user.id,
          activePeriod.id,
          activityId,
          activity.conduct_score,
          "Điểm tự động từ hoạt động",
          officer.id
        );
      }
    }

    db.prepare(
      `INSERT INTO notifications (user_id, type, title, content, link)
       VALUES (?, 'activity_attendance', ?, ?, ?)`
    ).run(
      user.id,
      "Điểm danh hoạt động thành công",
      Number(activity.conduct_score ?? 0) > 0
        ? `Bạn đã được ghi nhận tham gia “${activity.title}”. Điểm rèn luyện của hoạt động: ${activity.conduct_score} điểm (điểm thực nhận phụ thuộc giới hạn của khung điểm).`
        : `Bạn đã được ghi nhận tham gia “${activity.title}”.`,
      `/dashboard/student/activities/${activityId}`
    );
  });

  tx();

  revalidatePath("/dashboard/faculty-officer/checkin");
  revalidatePath(`/dashboard/faculty-officer/activities/${activityId}`);
  revalidatePath("/dashboard/student/activities");
  revalidatePath(`/dashboard/student/activities/${activityId}`);
  revalidatePath("/dashboard/student/notifications");
  revalidatePath("/dashboard/admin/activities");

  return {
    ok: true,
    message: `Đã điểm danh thành công: ${user.full_name} - MSSV ${user.mssv}.`,
  };
}
