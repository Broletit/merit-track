"use server";
import { notifyActivityAttendance } from "@/server/activities/notifyActivityAttendance";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
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

async function insertAttendanceLog({
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
  const db = getDatabase();



  (await db.execute(`
    INSERT INTO activity_attendance_logs (
      activity_id,
      user_id,
      qr_payload,
      scanned_by,
      scanned_at,
      result,
      note
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3), ?, ?)
    `, [activityId, userId, payload, scannedBy, result, note]));
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
  const db = getDatabase();

  if (method !== "qr" && method !== "manual") throw new Error("Phương thức điểm danh không hợp lệ.");
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
    (await insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "QR hoặc MSSV không hợp lệ",
    }));

    return {
      ok: false,
      message: "QR hoặc MSSV không hợp lệ.",
    };
  }

  const activity = (await db.first(`
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
      `, [activityId])) as
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
    (await insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Hoạt động chưa được công khai",
    }));

    return {
      ok: false,
      message: "Hoạt động chưa được công khai.",
    };
  }

  if (method === "qr" && Number(activity.qr_checkin_enabled ?? 0) !== 1) {
    (await insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Hoạt động chưa bật QR check-in",
    }));

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
    (await insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Hoạt động chưa có thời gian hợp lệ",
    }));

    return {
      ok: false,
      message: "Hoạt động chưa có thời gian hợp lệ.",
    };
  }

  if (now < startAt || now > endAt) {
    (await insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "out_of_window",
      note:
        now < startAt
          ? "Hoạt động chưa diễn ra"
          : "Hoạt động đã kết thúc",
    }));

    return {
      ok: false,
      message:
        now < startAt
          ? "Hoạt động chưa diễn ra nên chưa thể điểm danh."
          : "Hoạt động đã kết thúc nên không thể điểm danh.",
    };
  }

  const user = (await db.first(`
      SELECT id, full_name, mssv, role
      FROM users
      WHERE mssv = ? AND is_active=1
      LIMIT 1
      `, [mssv])) as
    | {
        id: number;
        full_name: string;
        mssv: string;
        role: string;
      }
    | undefined;

  if (!user) {
    (await insertAttendanceLog({
      activityId,
      userId: null,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: `Không tìm thấy người dùng có MSSV ${mssv}`,
    }));

    return {
      ok: false,
      message: `Không tìm thấy người dùng có MSSV ${mssv}.`,
    };
  }

  if (method === "qr" && Number(user.id) !== Number(verifiedQr?.userId)) {
    (await insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Mã QR không khớp tài khoản sinh viên",
    }));

    return {
      ok: false,
      message: "Mã QR không hợp lệ hoặc không khớp tài khoản sinh viên.",
    };
  }

  if (!["student", "class_officer", "faculty_officer"].includes(user.role)) {
    (await insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "invalid",
      note: "Tài khoản không thuộc đối tượng được điểm danh",
    }));

    return {
      ok: false,
      message: `${user.full_name} (${user.mssv}) không thuộc đối tượng được điểm danh.`,
    };
  }

  const registration = (await db.first(`
      SELECT id, status
      FROM activity_registrations
      WHERE activity_id = ?
        AND user_id = ?
      LIMIT 1
      `, [activityId, user.id])) as
    | {
        id: number;
        status: string;
      }
    | undefined;

  if (!registration) {
    (await insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "not_registered",
      note: "Người dùng chưa đăng ký hoạt động này",
    }));

    return {
      ok: false,
      message: `${user.full_name} (${user.mssv}) chưa đăng ký hoạt động này.`,
    };
  }

  if (registration.status === "attended") {
    (await insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "duplicate",
      note: "Người dùng đã điểm danh trước đó",
    }));

    return {
      ok: false,
      message: `${user.full_name} (${user.mssv}) đã điểm danh trước đó.`,
    };
  }

  if (!["registered", "absent"].includes(registration.status)) {
    return {ok:false,message:"Lượt đăng ký không còn hiệu lực để điểm danh."};
  }

  const activePeriod = (await db.first(`
      SELECT id
      FROM conduct_periods
      WHERE is_active = 1
      ORDER BY id DESC
      LIMIT 1
      `, [])) as { id: number } | undefined;

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
      UPDATE activity_registrations
      SET
        status = 'attended',
        checked_in_at = CURRENT_TIMESTAMP(3),
        checked_in_by = ?
      WHERE id = ?
      `, [officer.id, registration.id]));

    (await insertAttendanceLog({
      activityId,
      userId: user.id,
      payload: payloadForLog,
      scannedBy: officer.id,
      result: "success",
      note:
        method === "qr"
          ? "Quét QR thành công"
          : "Điểm danh thủ công thành công",
    }));

    if (activePeriod && Number(activity.conduct_score ?? 0) > 0) {
      (await db.execute(`
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
          VALUES (?, ?, 'activity', ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
          ON DUPLICATE KEY UPDATE score_value=VALUES(score_value),note=VALUES(note),created_by=VALUES(created_by)
          `, [user.id, activePeriod.id, activityId, activity.conduct_score, "Điểm tự động từ hoạt động", officer.id]));
    }

    (await notifyActivityAttendance(db, activityId, user.id));
  })));

  (await tx());

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
