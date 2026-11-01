"use server";

import { redirect } from "next/navigation";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDatabase } from "@/server/db/mysql";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import { evaluateSubmission } from "@/server/submissions/evaluateSubmission";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";

export async function createOfficerSubmission(eventId: number) {
  const user = await requireOfficerParticipantContext();
  const db = getDatabase();

  const existed = (await db.first(`
      SELECT id
      FROM submissions
      WHERE event_id = ?
        AND user_id = ?
      LIMIT 1
      `, [eventId, user.id])) as { id: number } | undefined;

  if (existed) {
    redirect(`/dashboard/${user.role === "class_officer" ? "class-officer" : "faculty-officer"}/officer-submissions/detail/${existed.id}`);
  }

  const event = (await db.first(`
      SELECT id, type, status, start_at, end_at, allow_late
      FROM events
      WHERE id = ?
        AND type = 'officer'
        AND status = 'published'
      LIMIT 1
      `, [eventId])) as
    | {
        id: number;
        type: string;
        status: string;
        start_at: string;
        end_at: string;
        allow_late: number;
      }
    | undefined;

  if (!event) {
    throw new Error("Đợt xét cán bộ không tồn tại hoặc chưa công khai.");
  }

  assertEventAcceptsSubmissions({
    status: event.status,
    startAt: event.start_at,
    endAt: event.end_at,
    allowLate: Number(event.allow_late ?? 0) === 1,
  });

  const result = (await db.execute(`
      INSERT INTO submissions (
        event_id,
        user_id,
        class_id,
        status,
        score_total,
        submitted_at,
        updated_at
      )
      VALUES (?, ?, NULL, 'draft', 0, NULL, CURRENT_TIMESTAMP(3))
      `, [event.id, user.id]));

  const submissionId = Number(result.insertId);

  (await evaluateSubmissionAuto(submissionId));
  (await evaluateSubmission(submissionId));

  redirect(`/dashboard/${user.role === "class_officer" ? "class-officer" : "faculty-officer"}/officer-submissions/detail/${submissionId}`);
}
