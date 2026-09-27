"use server";

import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";

export async function importFacultyAttendance(activityId: number, formData: FormData) {
  const admin = await requireAdminContext();
  const db = getDb();
  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "append");
  const confirmUnregistered = String(formData.get("confirmUnregistered") ?? "") === "1";
  const reason = requireChangeReason(formData.get("reason"));
  if (!(file instanceof File) || file.size === 0) throw new Error("Vui lòng chọn file Excel.");
  if (!file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)) throw new Error("Chỉ hỗ trợ XLSX, XLS hoặc CSV.");
  if (!["append", "replace"].includes(mode)) throw new Error("Chế độ nhập không hợp lệ.");

  const activity = db.prepare(`SELECT * FROM activities WHERE id = ? LIMIT 1`).get(activityId) as Record<string, unknown> | undefined;
  if (!activity) throw new Error("Hoạt động không tồn tại.");
  const activityEnd = new Date(String(activity.end_at ?? ""));
  if (Number.isNaN(activityEnd.getTime())) throw new Error("Thời gian kết thúc hoạt động không hợp lệ.");
  if (activityEnd.getTime() > Date.now()) throw new Error(`Chưa thể nhập danh sách. Hoạt động chỉ được xác nhận tham gia và cộng điểm sau khi kết thúc vào ${activityEnd.toLocaleString("vi-VN")}.`);
  const term = db.prepare(`SELECT id,name,academic_year,semester,start_at,end_at,is_active FROM academic_terms WHERE id=? LIMIT 1`).get(activity.term_id) as {id:number;name:string;academic_year:string;semester:string;start_at:string;end_at:string;is_active:number}|undefined;
  if (!term) throw new Error("Không xác định được học kỳ của hoạt động. Vui lòng kiểm tra lại cấu hình hoạt động.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!data.length) throw new Error("File không có dữ liệu.");

  const readMssv = (row: Record<string, unknown>) => {
    const key = Object.keys(row).find((item) => ["mssv", "ma sinh vien", "mã sinh viên", "student id"].includes(item.trim().toLowerCase()));
    return key ? String(row[key] ?? "").trim() : "";
  };
  const readName = (row: Record<string, unknown>) => {
    const key = Object.keys(row).find((item) => ["ho ten", "họ tên", "họ và tên", "hovaten", "full name", "name"].includes(item.normalize("NFKC").trim().toLocaleLowerCase("vi")));
    return key ? String(row[key] ?? "").trim() : "";
  };
  const rows = data.map((row, index) => ({ rowNumber: index + 2, mssv: readMssv(row), fileName: readName(row) }));
  if (rows.every((row) => !row.mssv)) throw new Error("Không tìm thấy cột MSSV trong file.");

  type ResolvedUser = { id: number; full_name: string; class_id: number | null; class_code: string | null; class_name: string | null };
  const usersByMssv = new Map<string, ResolvedUser | undefined>();
  for (const row of rows) {
    if (!row.mssv || usersByMssv.has(row.mssv)) continue;
    const user = db.prepare(`SELECT u.id,u.full_name,c.id class_id,c.code class_code,c.name class_name FROM users u LEFT JOIN class_members cm ON cm.user_id=u.id AND cm.left_at IS NULL LEFT JOIN classes c ON c.id=cm.class_id WHERE u.mssv=? AND u.is_active=1 LIMIT 1`).get(row.mssv) as ResolvedUser | undefined;
    usersByMssv.set(row.mssv, user);
  }

  const unregistered: Array<{ mssv: string; fullName: string; classLabel: string }> = [];
  if (activity.organizer_level === "class") {
    for (const row of rows) {
      const user = usersByMssv.get(row.mssv);
      if (!user?.class_id) continue;
      const inScope = db.prepare(`SELECT 1 FROM activity_scopes WHERE activity_id=? AND class_id=? LIMIT 1`).get(activityId, user.class_id);
      if (!inScope) continue;
      const registration = db.prepare(`SELECT status FROM activity_registrations WHERE activity_id=? AND user_id=? LIMIT 1`).get(activityId, user.id) as { status: string } | undefined;
      if (!registration || registration.status === "cancelled") unregistered.push({ mssv: row.mssv, fullName: user.full_name, classLabel: `${user.class_code} - ${user.class_name}` });
    }
  }
  if (unregistered.length && !confirmUnregistered) {
    return { ok: false as const, requiresConfirmation: true as const, message: `Có ${unregistered.length} sinh viên trong danh sách chưa đăng ký hoạt động trên hệ thống. Hãy kiểm tra và xác nhận nếu các sinh viên này thực tế đã đăng ký, tham gia.`, unregistered };
  }

  const affectedUsers = new Set<number>();
  const result = { total: rows.length, success: 0, invalid: 0, duplicate: 0 };
  const tx = db.transaction(() => {
    let conductPeriod = db.prepare(`SELECT id FROM conduct_periods WHERE academic_year=? AND semester=? LIMIT 1`).get(term.academic_year,term.semester) as {id:number}|undefined;
    if(!conductPeriod){
      const inserted=db.prepare(`INSERT INTO conduct_periods(code,name,academic_year,semester,start_at,end_at,is_active) VALUES(?,?,?,?,?,?,?)`).run(`TERM-${term.id}`,`Điểm rèn luyện - ${term.name}`,term.academic_year,term.semester,term.start_at,term.end_at,term.is_active);
      conductPeriod={id:Number(inserted.lastInsertRowid)};
    }
    if (mode === "replace") {
      db.prepare(`DELETE FROM conduct_scores WHERE source_type = 'activity' AND source_id = ?`).run(activityId);
      db.prepare(`DELETE FROM activity_registrations WHERE activity_id = ? AND import_batch_id IS NOT NULL`).run(activityId);
    }
    const batch = db.prepare(`
      INSERT INTO activity_import_batches (activity_id, file_name, file_hash, import_mode, reason, total_rows, imported_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(activityId, file.name, hash, mode, reason, rows.length, admin.id);
    const batchId = Number(batch.lastInsertRowid);
    const seen = new Set<string>();

    for (const row of rows) {
      if (!row.mssv || seen.has(row.mssv)) {
        result[row.mssv ? "duplicate" : "invalid"]++;
        db.prepare(`INSERT INTO activity_import_rows (batch_id,row_number,mssv,status,message) VALUES (?,?,?,?,?)`)
          .run(batchId, row.rowNumber, row.mssv || null, row.mssv ? "duplicate" : "invalid", row.mssv ? "MSSV trùng trong file" : "Thiếu MSSV");
        continue;
      }
      seen.add(row.mssv);
      const user = usersByMssv.get(row.mssv);
      if (!user) {
        result.invalid++;
        db.prepare(`INSERT INTO activity_import_rows (batch_id,row_number,mssv,status,message) VALUES (?,?,?,?,?)`)
          .run(batchId, row.rowNumber, row.mssv, "invalid", "Không tìm thấy sinh viên đang hoạt động");
        continue;
      }
      if (!user.class_id) {
        result.invalid++;
        db.prepare(`INSERT INTO activity_import_rows (batch_id,row_number,mssv,user_id,status,message) VALUES (?,?,?,?,?,?)`)
          .run(batchId, row.rowNumber, row.mssv, user.id, "invalid", "Sinh viên chưa có lớp hiện tại");
        continue;
      }
      if (activity.organizer_level === "class") {
        const inScope = db.prepare(`SELECT 1 FROM activity_scopes WHERE activity_id=? AND class_id=? LIMIT 1`).get(activityId, user.class_id);
        if (!inScope) {
          result.invalid++;
          db.prepare(`INSERT INTO activity_import_rows (batch_id,row_number,mssv,user_id,status,message) VALUES (?,?,?,?,?,?)`)
            .run(batchId, row.rowNumber, row.mssv, user.id, "invalid", "Sinh viên không thuộc chi đoàn tổ chức");
          continue;
        }
      }
      const existing = db.prepare(`SELECT id FROM activity_registrations WHERE activity_id = ? AND user_id = ?`).get(activityId, user.id) as { id: number } | undefined;
      const importNote = activity.organizer_level === "faculty" ? "Danh sách tham gia chính thức cấp khoa" : "Bổ sung từ danh sách điểm danh cấp chi đoàn";
      db.prepare(`
        INSERT INTO activity_registrations (activity_id,user_id,class_id,status,checked_in_at,checked_in_by,note,import_batch_id)
        VALUES (?,?,?,'attended',datetime('now'),?,?,?)
        ON CONFLICT(activity_id,user_id) DO UPDATE SET class_id=excluded.class_id,status='attended', checked_in_at=datetime('now'), checked_in_by=excluded.checked_in_by, note=excluded.note, import_batch_id=excluded.import_batch_id
      `).run(activityId, user.id, user.class_id, admin.id, importNote, batchId);
      db.prepare(`
        INSERT INTO conduct_scores (user_id,period_id,source_type,source_id,score_value,note,created_by)
        VALUES (?, ?, 'activity', ?, ?, ?, ?)
        ON CONFLICT(user_id,period_id,source_type,source_id) DO UPDATE SET score_value=excluded.score_value,note=excluded.note,created_by=excluded.created_by
      `).run(user.id, conductPeriod.id, activityId, Number(activity.conduct_score ?? 0), importNote, admin.id);
      result[existing ? "duplicate" : "success"]++;
      affectedUsers.add(user.id);
      db.prepare(`INSERT INTO activity_import_rows (batch_id,row_number,mssv,user_id,status,message) VALUES (?,?,?,?,?,?)`)
        .run(batchId, row.rowNumber, row.mssv, user.id, "imported", existing ? "Cập nhật bản ghi đã có" : null);
    }
    db.prepare(`UPDATE activity_import_batches SET success_rows=?,error_rows=? WHERE id=?`)
      .run(result.success + result.duplicate, result.invalid, batchId);
    writeAuditLog({ db, actorUserId: admin.id, action: "activity.attendance.import", entityType: "activity", entityId: activityId, reason, before: mode === "replace" ? "Danh sách nhập trước" : null, after: result, meta: { fileName: file.name, hash, mode, batchId } });
  });
  tx();

  for (const userId of affectedUsers) {
    const submissions = db.prepare(`SELECT s.id FROM submissions s INNER JOIN events e ON e.id=s.event_id WHERE s.user_id=? AND e.term_id=?`).all(userId, activity.term_id) as { id: number }[];
    for (const submission of submissions) {
      evaluateSubmissionAuto(submission.id);
      evaluateSubmission(submission.id);
    }
  }
  revalidatePath(`/dashboard/admin/activities/${activityId}`);
  revalidatePath("/dashboard/student/activities");
  revalidatePath("/dashboard/student/conduct-score");
  return { ok: true as const, requiresConfirmation: false as const, message: `Đã xử lý ${result.total} dòng: ${result.success + result.duplicate} hợp lệ, ${result.invalid} lỗi.`, result };
}
