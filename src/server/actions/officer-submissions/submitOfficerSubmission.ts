"use server";

import { revalidatePath } from "next/cache";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDb } from "@/server/db/sqlite";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";
import { assertSubmissionRequirements } from "@/server/submissions/evaluateSubmissionRequirements";

export async function submitOfficerSubmission(submissionId: number) {
  const user = await requireOfficerParticipantContext();
  const db = getDb();

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.user_id,
        s.status,
        e.status AS event_status,
        e.start_at,
        e.end_at,
        e.allow_late
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
        AND e.type = 'officer'
      LIMIT 1
      `
    )
    .get(submissionId) as
    | {
        id: number;
        user_id: number;
        status: string;
        end_at: string;
        start_at: string;
        event_status: string;
        allow_late: number;
      }
    | undefined;

  if (!submission) throw new Error("Hồ sơ không tồn tại.");

  if (Number(submission.user_id) !== Number(user.id)) {
    throw new Error("Bạn không có quyền gửi hồ sơ này.");
  }

  if (!["draft", "needs_revision_v1"].includes(submission.status)) {
    throw new Error("Hồ sơ hiện không thể gửi xét duyệt.");
  }

  assertEventAcceptsSubmissions({
    status: submission.event_status,
    startAt: submission.start_at,
    endAt: submission.end_at,
    allowLate: Number(submission.allow_late ?? 0) === 1,
  });

  evaluateSubmissionAuto(submissionId);
  assertSubmissionRequirements(db, submissionId);
  evaluateSubmission(submissionId);

  db.prepare(
    `
    UPDATE submissions
    SET
      status = 'submitted_v1',
      submitted_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(submissionId);

  revalidatePath(`/dashboard/faculty-officer/officer-submissions/detail/${submissionId}`);
  revalidatePath("/dashboard/faculty-officer/officer-submissions");

  return {
    ok: true,
    message: "Đã gửi hồ sơ xét duyệt.",
  };
}
