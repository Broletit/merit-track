import { getDatabase } from "@/server/db/mysql";

export async function evaluateSubmission(submissionId: number) {
  const db = getDatabase();

  const submission = (await db.first(`
      SELECT
        s.id,
        s.event_id,
        s.user_id,
        s.review_round,
        e.type,
        e.score_max
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
      LIMIT 1
      `, [submissionId])) as
    | {
        id: number;
        event_id: number;
        user_id: number;
        review_round: number;
        type: string;
        score_max: number | null;
      }
    | undefined;

  if (!submission) {
    throw new Error("Hồ sơ không tồn tại.");
  }

  // ❗ student không tính điểm
  if (submission.type !== "officer") {
    (await db.execute(`
      UPDATE submissions
      SET score_total = 0, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
      `, [submissionId]));

    return {
      ok: true,
      scoreTotal: 0,
    };
  }

  // lấy tiêu chí
  const criteria = (await db.rows(`
      SELECT i.code,i.group_code,i.score_max,i.is_required,i.sort_order,g.score_max group_score_max,g.sort_order group_sort_order
      FROM event_criteria_items i
      INNER JOIN event_criteria_groups g ON g.event_id=i.event_id AND g.code=i.group_code
      WHERE i.event_id = ?
      ORDER BY g.sort_order,i.sort_order,i.id
      `, [submission.event_id])) as {
    code: string;
    group_code: string;
    score_max: number;
    is_required: number;
    sort_order: number;
    group_score_max: number;
    group_sort_order: number;
  }[];

  const auto = (await db.rows(`
      SELECT criteria_code
      FROM submission_auto_results
      WHERE submission_id = ? AND passed = 1
      `, [submissionId])) as { criteria_code: string }[];

  const autoSet = new Set(auto.map((x) => x.criteria_code));
  const approvedRows = (await db.rows(`SELECT criteria_code FROM submission_criteria_reviews WHERE submission_id=? AND round=? AND decision='pass'`, [submissionId, Number(submission.review_round)===2?2:1])) as Array<{criteria_code:string}>;
  const approvedSet = new Set(approvedRows.map((item) => item.criteria_code));

  const autoScores = (await db.rows(`
    SELECT rule.criteria_code,
      SUM(CASE WHEN rule.score_value > 0 THEN rule.score_value ELSE item.score_max END) AS score
    FROM criteria_activity_rules rule
    INNER JOIN criteria_template_items item ON item.template_id=rule.template_id AND item.code=rule.criteria_code
    INNER JOIN activities activity ON activity.id=rule.activity_id
    INNER JOIN activity_registrations registration ON registration.activity_id=activity.id AND registration.user_id=? AND registration.status='attended'
    INNER JOIN events event ON event.id=? AND event.criteria_template_id=rule.template_id
    GROUP BY rule.criteria_code
  `, [submission.user_id, submission.event_id])) as Array<{criteria_code:string;score:number}>;
  const autoScoreMap = new Map(autoScores.map((item) => [item.criteria_code, Number(item.score)]));

  const groupScores = new Map<string, { score: number; max: number }>();

  for (const item of criteria) {
    const passed = approvedSet.has(item.code) || autoSet.has(item.code);

    if (passed) {
      const criterionScore = autoSet.has(item.code)
        ? Math.min(Number(item.score_max ?? 0), autoScoreMap.get(item.code) ?? Number(item.score_max ?? 0))
        : Number(item.score_max ?? 0);
      const group = groupScores.get(item.group_code) ?? { score: 0, max: Number(item.group_score_max ?? 0) };
      group.score = group.max > 0 ? Math.min(group.max, group.score + criterionScore) : group.score + criterionScore;
      groupScores.set(item.group_code, group);
    }
  }

  const scoreTotal = Array.from(groupScores.values()).reduce((sum, group) => sum + group.score, 0);

  const cappedScoreTotal = submission.score_max && Number(submission.score_max) > 0
    ? Math.min(scoreTotal, Number(submission.score_max))
    : scoreTotal;

  (await db.execute(`
    UPDATE submissions
    SET score_total = ?, updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    `, [cappedScoreTotal, submissionId]));

  return {
    ok: true,
    scoreTotal: cappedScoreTotal,
  };
}
