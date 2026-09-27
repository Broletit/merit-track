import { getDb } from "@/server/db/sqlite";
import { evaluateAutoCriteria } from "./evaluateAutoCriteria";
import { saveAutoCriteriaResults } from "./saveAutoCriteriaResults";

type SubmissionOwner = {
  event_id: number;
  user_id: number;
};

export function evaluateSubmissionAuto(submissionId: number) {
  const db = getDb();
  const submission = db
    .prepare(
      `
      SELECT event_id, user_id
      FROM submissions
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(submissionId) as SubmissionOwner | undefined;

  if (!submission) {
    throw new Error("Không tìm thấy hồ sơ.");
  }

  const results = evaluateAutoCriteria({
    eventId: Number(submission.event_id),
    userId: Number(submission.user_id),
  });

  saveAutoCriteriaResults({ submissionId, results });

  return { ok: true, results };
}
