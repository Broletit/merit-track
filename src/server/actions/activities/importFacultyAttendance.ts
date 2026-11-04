"use server";
import { notifyActivityAttendance } from "@/server/activities/notifyActivityAttendance";
import { assertActivityScope } from "@/server/activities/scopes";

import { createHash } from "node:crypto";
import { parseAttendanceFile } from "@/server/activities/parseAttendanceFile";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";

export async function importFacultyAttendance(activityId: number, formData: FormData) {
  const admin = await requireAdminContext();
  const db = getDatabase();
  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "append");
  const confirmUnregistered = String(formData.get("confirmUnregistered") ?? "") === "1";
  const reason = requireChangeReason(formData.get("reason"));
  if (!(file instanceof File) || file.size === 0) throw new Error("Vui lòng chọn file Excel.");
  if (!file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)) throw new Error("Chỉ hỗ trợ XLSX, XLS hoặc CSV.");
  if (!["append", "replace"].includes(mode)) throw new Error("Chế độ nhập không hợp lệ.");

  const activity = (await db.first(`SELECT * FROM activities WHERE id = ? LIMIT 1`, [activityId])) as Record<string, unknown> | undefined;
  if (!activity) throw new Error("Hoạt động không tồn tại.");
  const activityEnd = new Date(String(activity.end_at ?? ""));
  if (Number.isNaN(activityEnd.getTime())) throw new Error("Thời gian kết thúc hoạt động không hợp lệ.");
  if (activityEnd.getTime() > Date.now()) throw new Error(`Chưa thể nhập danh sách. Hoạt động chỉ được xác nhận tham gia và cộng điểm sau khi kết thúc vào ${activityEnd.toLocaleString("vi-VN")}.`);
  const term = (await db.first(`SELECT id,name,academic_year,semester,start_at,end_at,is_active FROM academic_terms WHERE id=? LIMIT 1`, [activity.term_id])) as {id:number;name:string;academic_year:string;semester:string;start_at:string;end_at:string;is_active:number}|undefined;
  if (!term) throw new Error("Không xác định được học kỳ của hoạt động. Vui lòng kiểm tra lại cấu hình hoạt động.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const previousImport = (await db.first(`
      SELECT id, file_name, imported_at
      FROM activity_import_batches
      WHERE activity_id = ? AND file_hash = ?
      LIMIT 1
      `, [activityId, hash])) as { id: number; file_name: string; imported_at: string } | undefined;
  if (previousImport) {
    throw new Error(`File “${file.name}” đã được nhập cho hoạt động này trước đó. Vui lòng chọn file khác; nếu cần cập nhật lại toàn bộ danh sách, hãy chỉnh sửa nội dung file rồi chọn “Thay thế danh sách”.`);
  }
  const rows = parseAttendanceFile(buffer, file.name);

  type ResolvedUser = { id: number; full_name: string; is_active: number; class_id: number | null; class_code: string | null; class_name: string | null };
  const usersByMssv = new Map<string, ResolvedUser | undefined>();
  for (const row of rows) {
    if (!row.mssv || usersByMssv.has(row.mssv)) continue;
    const user = (await db.first(`SELECT u.id,u.full_name,u.is_active,c.id class_id,c.code class_code,c.name class_name FROM users u LEFT JOIN class_members cm ON cm.user_id=u.id AND cm.left_at IS NULL LEFT JOIN classes c ON c.id=cm.class_id WHERE u.mssv=? LIMIT 1`, [row.mssv])) as ResolvedUser | undefined;
    usersByMssv.set(row.mssv, user);
  }

  const unregistered: Array<{ mssv: string; fullName: string; classLabel: string }> = [];
  if (activity.organizer_level === "class") {
    for (const row of rows) {
      const user = usersByMssv.get(row.mssv);
      if (!user?.class_id) continue;
      let inScope = true;
      try { (await assertActivityScope(activityId, user.id)); } catch { inScope = false; }
      if (!inScope) continue;
      const registration = (await db.first(`SELECT status FROM activity_registrations WHERE activity_id=? AND user_id=? LIMIT 1`, [activityId, user.id])) as { status: string } | undefined;
      if (!registration || registration.status === "cancelled") unregistered.push({ mssv: row.mssv, fullName: user.full_name, classLabel: `${user.class_code} - ${user.class_name}` });
    }
  }
  if (unregistered.length && !confirmUnregistered) {
    return { ok: false as const, requiresConfirmation: true as const, message: `Có ${unregistered.length} sinh viên trong danh sách chưa đăng ký hoạt động trên hệ thống. Hãy kiểm tra và xác nhận nếu các sinh viên này thực tế đã đăng ký, tham gia.`, unregistered };
  }

  const affectedUsers = new Set<number>();
  const result = { total: rows.length, success: 0, updated: 0, invalid: 0, duplicateInFile: 0 };
  let batchId = 0;
  const tx = (async () => (await db.withTransaction(async () => {
    let conductPeriod = (await db.first(`SELECT id FROM conduct_periods WHERE academic_year=? AND semester=? LIMIT 1`, [term.academic_year, term.semester])) as {id:number}|undefined;
    if(!conductPeriod){
      const inserted=(await db.execute(`INSERT INTO conduct_periods(code,name,academic_year,semester,start_at,end_at,is_active) VALUES(?,?,?,?,?,?,?)`, [`TERM-${term.id}`, `Điểm rèn luyện - ${term.name}`, term.academic_year, term.semester, term.start_at, term.end_at, term.is_active]));
      conductPeriod={id:Number(inserted.insertId)};
    }
    if (mode === "replace") {
      (await db.execute(`DELETE FROM conduct_scores WHERE source_type = 'activity' AND source_id = ?`, [activityId]));
      (await db.execute(`DELETE FROM activity_registrations WHERE activity_id = ? AND import_batch_id IS NOT NULL`, [activityId]));
    }
    const batch = (await db.execute(`
      INSERT INTO activity_import_batches (activity_id, file_name, file_hash, import_mode, reason, total_rows, imported_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [activityId, file.name, hash, mode, reason, rows.length, admin.id]));
    batchId = Number(batch.insertId);
    const seen = new Set<string>();

    for (const row of rows) {
      if (!row.mssv || seen.has(row.mssv)) {
        if (row.mssv) result.duplicateInFile++;
        else result.invalid++;
        (await db.execute(`INSERT INTO activity_import_rows (batch_id,\`row_number\`,mssv,status,message) VALUES (?,?,?,?,?)`, [batchId, row.rowNumber, row.mssv || null, row.mssv ? "duplicate" : "invalid", row.mssv ? "MSSV trùng trong file" : "Thiếu MSSV"]));
        continue;
      }
      seen.add(row.mssv);
      const user = usersByMssv.get(row.mssv);
      if (!user) {
        result.invalid++;
        (await db.execute(`INSERT INTO activity_import_rows (batch_id,\`row_number\`,mssv,status,message) VALUES (?,?,?,?,?)`, [batchId, row.rowNumber, row.mssv, "invalid", "Không tìm thấy MSSV trong hệ thống"]));
        continue;
      }
      if (!Number(user.is_active)) {
        result.invalid++;
        (await db.execute(`INSERT INTO activity_import_rows (batch_id,\`row_number\`,mssv,user_id,status,message) VALUES (?,?,?,?,?,?)`, [batchId, row.rowNumber, row.mssv, user.id, "invalid", "Tài khoản sinh viên đã bị vô hiệu hóa"]));
        continue;
      }
      if (!user.class_id) {
        result.invalid++;
        (await db.execute(`INSERT INTO activity_import_rows (batch_id,\`row_number\`,mssv,user_id,status,message) VALUES (?,?,?,?,?,?)`, [batchId, row.rowNumber, row.mssv, user.id, "invalid", "Sinh viên chưa có lớp hiện tại"]));
        continue;
      }
      if (activity.organizer_level === "class") {
        let inScope = true;
      try { (await assertActivityScope(activityId, user.id)); } catch { inScope = false; }
        if (!inScope) {
          result.invalid++;
          (await db.execute(`INSERT INTO activity_import_rows (batch_id,\`row_number\`,mssv,user_id,status,message) VALUES (?,?,?,?,?,?)`, [batchId, row.rowNumber, row.mssv, user.id, "invalid", "Sinh viên không thuộc chi đoàn tổ chức"]));
          continue;
        }
      }
      const existing = (await db.first(`SELECT id FROM activity_registrations WHERE activity_id = ? AND user_id = ?`, [activityId, user.id])) as { id: number } | undefined;
      const importNote = activity.organizer_level === "faculty" ? "Danh sách tham gia chính thức cấp khoa" : "Bổ sung từ danh sách điểm danh cấp chi đoàn";
      (await db.execute(`
        INSERT INTO activity_registrations (activity_id,user_id,class_id,status,checked_in_at,checked_in_by,note,import_batch_id)
        VALUES (?,?,?,'attended',CURRENT_TIMESTAMP(3),?,?,?)
        ON DUPLICATE KEY UPDATE class_id=VALUES(class_id),status='attended', checked_in_at=CURRENT_TIMESTAMP(3), checked_in_by=VALUES(checked_in_by), note=VALUES(note), import_batch_id=VALUES(import_batch_id)
      `, [activityId, user.id, user.class_id, admin.id, importNote, batchId]));
      (await db.execute(`
        INSERT INTO conduct_scores (user_id,period_id,source_type,source_id,score_value,note,created_by)
        VALUES (?, ?, 'activity', ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE period_id=VALUES(period_id),score_value=VALUES(score_value),note=VALUES(note),created_by=VALUES(created_by)
      `, [user.id, conductPeriod.id, activityId, Number(activity.conduct_score ?? 0), importNote, admin.id]));
      result[existing ? "updated" : "success"]++;
      (await notifyActivityAttendance(db, activityId, user.id));
      affectedUsers.add(user.id);
      (await db.execute(`INSERT INTO activity_import_rows (batch_id,\`row_number\`,mssv,user_id,status,message) VALUES (?,?,?,?,?,?)`, [batchId, row.rowNumber, row.mssv, user.id, "imported", existing ? "Cập nhật bản ghi đã có" : null]));
    }
    (await db.execute(`UPDATE activity_import_batches SET success_rows=?,error_rows=? WHERE id=?`, [result.success + result.updated, result.invalid + result.duplicateInFile, batchId]));
    (await writeAuditLog({ db, actorUserId: admin.id, action: "activity.attendance.import", entityType: "activity", entityId: activityId, reason, before: mode === "replace" ? "Danh sách nhập trước" : null, after: { ...result, title: String(activity.title ?? "") }, meta: { fileName: file.name, hash, mode, batchId } }));
  })));
  try {
    await tx();
  } catch (error) {
    if (error instanceof Error && /Duplicate entry .*activity_import_batches|uq_activity_import_batches_1/i.test(error.message)) {
      throw new Error(`File “${file.name}” đã được nhập cho hoạt động này trước đó. Vui lòng chọn file khác; nếu cần cập nhật lại toàn bộ danh sách, hãy chỉnh sửa nội dung file rồi chọn “Thay thế danh sách”.`);
    }
    throw error;
  }

  const issueSummary = (await db.rows(`
      SELECT status, message, COUNT(*) AS total, MIN(\`row_number\`) AS sample_row
      FROM activity_import_rows
      WHERE batch_id = ? AND status <> 'imported'
      GROUP BY status, message
      ORDER BY total DESC, sample_row ASC
      `, [batchId])) as Array<{ status: string; message: string | null; total: number; sample_row: number }>;

  for (const userId of affectedUsers) {
    const submissions = (await db.rows(`SELECT s.id FROM submissions s INNER JOIN events e ON e.id=s.event_id WHERE s.user_id=? AND e.term_id=?`, [userId, activity.term_id])) as { id: number }[];
    for (const submission of submissions) {
      (await evaluateSubmissionAuto(submission.id));
      (await evaluateSubmission(submission.id));
    }
  }
  revalidatePath(`/dashboard/admin/activities/${activityId}`);
  revalidatePath("/dashboard/student/activities");
  revalidatePath("/dashboard/student/conduct-score");
  return { ok: true as const, requiresConfirmation: false as const, message: `Đã xử lý ${result.total} dòng: ${result.success + result.updated} hợp lệ, ${result.invalid + result.duplicateInFile} lỗi.`, result, issueSummary };
}
