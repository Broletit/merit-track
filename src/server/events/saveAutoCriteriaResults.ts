import { getDatabase } from "@/server/db/mysql";
import type { AutoCriteriaResult } from "./evaluateAutoCriteria";

export async function saveAutoCriteriaResults({
  submissionId,
  results,
}: {
  submissionId: number;
  results: AutoCriteriaResult[];
}) {
  const db = getDatabase();

  const tx = (async () => (await db.withTransaction(async () => {
    for (const item of results) {
      (await db.execute(`
        INSERT INTO submission_auto_results (
          submission_id,
          criteria_code,
          passed,
          matched_count,
          matched_activity_ids,
          matched_activity_titles,
          evaluated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE
          passed = VALUES(passed),
          matched_count = VALUES(matched_count),
          matched_activity_ids = VALUES(matched_activity_ids),
          matched_activity_titles = VALUES(matched_activity_titles),
          evaluated_at = VALUES(evaluated_at)
        `, [submissionId, item.criteriaCode, item.passed ? 1 : 0, item.matchedCount, JSON.stringify(item.matchedActivityIds), JSON.stringify(item.matchedActivityTitles)]));
    }
  })));

  (await tx());
}
