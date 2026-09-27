import { getDb } from "@/server/db/sqlite";
import type { AutoCriteriaResult } from "./evaluateAutoCriteria";

export function saveAutoCriteriaResults({
  submissionId,
  results,
}: {
  submissionId: number;
  results: AutoCriteriaResult[];
}) {
  const db = getDb();

  const tx = db.transaction(() => {
    for (const item of results) {
      db.prepare(
        `
        INSERT INTO submission_auto_results (
          submission_id,
          criteria_code,
          passed,
          matched_activity_ids,
          matched_activity_titles,
          evaluated_at
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(submission_id, criteria_code)
        DO UPDATE SET
          passed = excluded.passed,
          matched_activity_ids = excluded.matched_activity_ids,
          matched_activity_titles = excluded.matched_activity_titles,
          evaluated_at = excluded.evaluated_at
        `
      ).run(
        submissionId,
        item.criteriaCode,
        item.passed ? 1 : 0,
        JSON.stringify(item.matchedActivityIds),
        JSON.stringify(item.matchedActivityTitles)
      );
    }
  });

  tx();
}