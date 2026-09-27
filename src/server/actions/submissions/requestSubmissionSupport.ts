"use server";

import { revalidatePath } from "next/cache";
import { canEditSubmission } from "@/lib/submissions/submissionStatus";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

type SubmissionRow = {
  id: number;
  status: string;
  event_id: number;
};

export async function requestSubmissionSupport(
  submissionId: number,
  formData: FormData
) {
  const user = await requireStudentContext();
  const note = String(formData.get("supportNote") ?? "").trim();
  if (note.length < 10) {
    throw new Error("Vui lòng mô tả nội dung cần khoa hỗ trợ ít nhất 10 ký tự.");
  }

  const db = getDb();
  const submission = db.prepare(
    `SELECT id, status, event_id
     FROM submissions
     WHERE id = ? AND user_id = ?
     LIMIT 1`
  ).get(submissionId, user.id) as SubmissionRow | undefined;

  if (!submission) throw new Error("Không tìm thấy hồ sơ.");
  if (!canEditSubmission(submission.status)) {
    throw new Error("Hồ sơ hiện không thể gửi yêu cầu hỗ trợ.");
  }

  db.prepare(
    `INSERT INTO submission_support_requests (submission_id, user_id, note, status)
     VALUES (?, ?, ?, 'open')
     ON CONFLICT(submission_id) DO UPDATE SET
       note = excluded.note,
       status = 'open',
       updated_at = datetime('now')`
  ).run(submissionId, user.id, note);

  revalidatePath(`/dashboard/student/events/${submission.event_id}`);
  revalidatePath(`/dashboard/student/submissions/${submissionId}`);
  revalidatePath(`/dashboard/admin/events/${submission.event_id}/candidates`);

  return {
    ok: true,
    message: "Đã gửi yêu cầu hỗ trợ đến khoa. Đây chưa phải hồ sơ đăng ký xét chính thức.",
  };
}
