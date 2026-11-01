import { getDatabase } from "@/server/db/mysql";
import { evaluateAutoCriteria } from "./evaluateAutoCriteria";
import { saveAutoCriteriaResults } from "./saveAutoCriteriaResults";

type SubmissionOwner = {
  event_id: number;
  user_id: number;
};

export async function evaluateSubmissionAuto(submissionId: number) {
  const db = getDatabase();
  const submission = (await db.first(`
      SELECT event_id, user_id
      FROM submissions
      WHERE id = ?
      LIMIT 1
      `, [submissionId])) as SubmissionOwner | undefined;

  if (!submission) {
    throw new Error("Không tìm thấy hồ sơ.");
  }

  const results = (await evaluateAutoCriteria({
    eventId: Number(submission.event_id),
    userId: Number(submission.user_id),
  }));

  (await saveAutoCriteriaResults({ submissionId, results }));

  return { ok: true, results };
}
