"use server";

import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { assertEventAcceptsSubmissions } from "@/lib/events/eventSubmissionPhase";
import { evaluateSubmissionAuto } from "@/server/events/evaluateSubmissionAuto";
import {
  canEditSubmission,
  getSubmissionStatusLabel,
} from "@/lib/submissions/submissionStatus";

type EventRow = {
  id: number;
  status: string;
  start_at: string;
  end_at: string;
  allow_late: number;
};

type ClassRow = {
  class_id: number;
};

type SubmissionRow = {
  id: number;
  status: string;
};

export async function ensureStudentSubmissionDraft(eventId: number) {
  const user = await requireStudentContext();
  const db = getDb();

  const event = db
    .prepare(
      `
      SELECT id, status, start_at, end_at, allow_late
      FROM events
      WHERE id = ?
        AND type = 'student'
        AND status = 'published'
      LIMIT 1
      `
    )
    .get(eventId) as EventRow | undefined;

  if (!event) {
    throw new Error("Đợt xét không tồn tại hoặc chưa được công khai.");
  }

  assertEventAcceptsSubmissions({
    status: event.status,
    startAt: event.start_at,
    endAt: event.end_at,
    allowLate: Number(event.allow_late ?? 0) === 1,
  });

  const existed = db
    .prepare(
      `
      SELECT id, status
      FROM submissions
      WHERE event_id = ?
        AND user_id = ?
      LIMIT 1
      `
    )
    .get(eventId, user.id) as SubmissionRow | undefined;

  if (existed) {
    if (!canEditSubmission(existed.status)) {
      throw new Error(
        `Hồ sơ hiện ở trạng thái “${getSubmissionStatusLabel(existed.status)}” nên không thể chỉnh sửa.`
      );
    }

    evaluateSubmissionAuto(Number(existed.id));

    return {
      id: Number(existed.id),
      submissionId: Number(existed.id),
    };
  }

  const classRow = db
    .prepare(
      `
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
      ORDER BY joined_at DESC, id DESC
      LIMIT 1
      `
    )
    .get(user.id) as ClassRow | undefined;

  if (!classRow) {
    throw new Error("Tài khoản chưa được gán lớp.");
  }

  const result = db
    .prepare(
      `
      INSERT INTO submissions (
        event_id,
        user_id,
        class_id,
        status,
        score_total,
        submitted_at,
        updated_at
      )
      VALUES (?, ?, ?, 'draft', 0, NULL, datetime('now'))
      `
    )
    .run(eventId, user.id, classRow.class_id);

  const submissionId = Number(result.lastInsertRowid);

  evaluateSubmissionAuto(submissionId);

  revalidatePath(`/dashboard/student/events/${eventId}`);
  revalidatePath("/dashboard/student/submissions");

  return {
    id: submissionId,
    submissionId,
  };
}
