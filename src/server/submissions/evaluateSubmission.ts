import { getDb } from "@/server/db/sqlite";

export function evaluateSubmission(submissionId: number) {
  const db = getDb();

  const submission = db
    .prepare(
      `
      SELECT
        s.id,
        s.event_id,
        s.user_id,
        e.type
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
      LIMIT 1
      `
    )
    .get(submissionId) as
    | {
        id: number;
        event_id: number;
        user_id: number;
        type: string;
      }
    | undefined;

  if (!submission) {
    throw new Error("Hồ sơ không tồn tại.");
  }

  // ❗ student không tính điểm
  if (submission.type !== "officer") {
    db.prepare(
      `
      UPDATE submissions
      SET score_total = 0, updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(submissionId);

    return {
      ok: true,
      scoreTotal: 0,
    };
  }

  // lấy tiêu chí
  const criteria = db
    .prepare(
      `
      SELECT code, score_max, is_required
      FROM event_criteria_items
      WHERE event_id = ?
      `
    )
    .all(submission.event_id) as {
    code: string;
    score_max: number;
    is_required: number;
  }[];

  const manual = db
    .prepare(
      `
      SELECT criteria_code
      FROM submission_items
      WHERE submission_id = ?
        AND TRIM(COALESCE(content_text, '')) <> ''
      UNION
      SELECT criteria_code
      FROM submission_files
      WHERE submission_id = ?
      `
    )
    .all(submissionId, submissionId) as { criteria_code: string }[];

  const auto = db
    .prepare(
      `
      SELECT criteria_code
      FROM submission_auto_results
      WHERE submission_id = ? AND passed = 1
      `
    )
    .all(submissionId) as { criteria_code: string }[];

  const manualSet = new Set(manual.map((x) => x.criteria_code));
  const autoSet = new Set(auto.map((x) => x.criteria_code));

  const autoScores = db.prepare(`
    SELECT rule.criteria_code,
      SUM(CASE WHEN rule.score_value > 0 THEN rule.score_value ELSE item.score_max END) AS score
    FROM criteria_activity_rules rule
    INNER JOIN criteria_template_items item ON item.template_id=rule.template_id AND item.code=rule.criteria_code
    INNER JOIN activities activity ON activity.id=rule.activity_id
    INNER JOIN activity_registrations registration ON registration.activity_id=activity.id AND registration.user_id=? AND registration.status='attended'
    INNER JOIN events event ON event.id=? AND event.criteria_template_id=rule.template_id AND event.term_id=activity.term_id
    GROUP BY rule.criteria_code
  `).all(submission.user_id, submission.event_id) as Array<{criteria_code:string;score:number}>;
  const autoScoreMap = new Map(autoScores.map((item) => [item.criteria_code, Number(item.score)]));

  let scoreTotal = 0;

  for (const item of criteria) {
    const passed = manualSet.has(item.code) || autoSet.has(item.code);

    if (passed) {
      scoreTotal += manualSet.has(item.code)
        ? Number(item.score_max ?? 0)
        : Math.min(Number(item.score_max ?? 0), autoScoreMap.get(item.code) ?? Number(item.score_max ?? 0));
    }
  }

  db.prepare(
    `
    UPDATE submissions
    SET score_total = ?, updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(scoreTotal, submissionId);

  return {
    ok: true,
    scoreTotal,
  };
}
