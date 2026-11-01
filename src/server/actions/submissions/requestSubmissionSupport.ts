"use server";

import { revalidatePath } from "next/cache";
import { canEditSubmission } from "@/lib/submissions/submissionStatus";
import { requireStudentContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";

type SubmissionRow = {
  id: number;
  status: string;
  event_id: number;
  event_status:string;start_at:string;end_at:string;allow_late:number;
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

  const db = getDatabase();
  const submission = (await db.first(`SELECT s.id,s.status,s.event_id,e.status event_status,e.start_at,e.end_at,e.allow_late
     FROM submissions s JOIN events e ON e.id=s.event_id
     WHERE s.id = ? AND s.user_id = ? AND e.type='student'
     LIMIT 1`, [submissionId, user.id])) as SubmissionRow | undefined;

  if (!submission) throw new Error("Không tìm thấy hồ sơ.");
  assertEventAcceptsSubmissions({status:submission.event_status,startAt:submission.start_at,endAt:submission.end_at,allowLate:Number(submission.allow_late)===1});
  if (!canEditSubmission(submission.status)) {
    throw new Error("Hồ sơ hiện không thể gửi yêu cầu hỗ trợ.");
  }

  (await db.execute(`INSERT INTO submission_support_requests (submission_id, user_id, note, status)
     VALUES (?, ?, ?, 'open')
     ON DUPLICATE KEY UPDATE
       note = VALUES(note),
       status = 'open',
       updated_at = CURRENT_TIMESTAMP(3)`, [submissionId, user.id, note]));

  revalidatePath(`/dashboard/student/events/${submission.event_id}`);
  revalidatePath(`/dashboard/student/submissions/${submissionId}`);
  revalidatePath(`/dashboard/admin/events/${submission.event_id}/candidates`);
  revalidatePath("/dashboard/admin/submissions");
  revalidatePath(`/dashboard/admin/submissions/${submissionId}`);
  revalidatePath("/dashboard/student/submissions");
  revalidatePath("/dashboard/faculty-officer/reviews");
  revalidatePath(`/dashboard/faculty-officer/reviews/${submissionId}`);

  return {
    ok: true,
    message: "Đã gửi yêu cầu hỗ trợ đến khoa. Đây chưa phải hồ sơ đăng ký xét chính thức.",
  };
}
