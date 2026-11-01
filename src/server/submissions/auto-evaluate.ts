import { getDatabase } from "@/server/db/mysql";

type SubmissionBaseRow = {
  id: number;
  user_id: number;
  event_id: number;
  class_id: number;
  status: string;
  criteria_template_id: number | null;
};

type EventCriteriaItemRow = {
  code: string;
  title: string;
  group_code: string;
  evidence_type: string;
  is_required: number;
};

type ActivityRuleRow = {
  activity_title: string;
  criteria_code: string;
  activity_id: number;
};

type ConductRuleRow = {
  criteria_code: string;
  min_score: number;
  period_scope: string;
};

type ConductPeriodRow = {
  id: number;
};

type AutoEvaluationResult = {
  criteriaCode: string;
  passed: boolean;
  sourceType: "activity" | "conduct";
  sourceId: number | null;
  message: string;
};

async function getCurrentConductPeriodId(): Promise<number | null> {
  const db = getDatabase();

  const row = (await db.first(`
      SELECT id
      FROM conduct_periods
      WHERE is_active = 1
      ORDER BY CAST(created_at AS DATETIME(3)) DESC, id DESC
      LIMIT 1
      `, [])) as ConductPeriodRow | undefined;

  return row ? Number(row.id) : null;
}

async function hasAttendedActivity(userId: number, activityId: number) {
  const db = getDatabase();

  const row = (await db.first(`
      SELECT id
      FROM activity_registrations
      WHERE user_id = ?
        AND activity_id = ?
        AND status IN ('attended')
      LIMIT 1
      `, [userId, activityId])) as { id: number } | undefined;

  return Boolean(row);
}

async function getConductScoreTotal(userId: number, periodId: number) {
  const db = getDatabase();

  const row = (await db.first(`
      SELECT COALESCE(SUM(score_value), 0) AS total_score
      FROM conduct_scores
      WHERE user_id = ?
        AND period_id = ?
      `, [userId, periodId])) as { total_score: number } | undefined;

  return Number(row?.total_score ?? 0);
}

export async function evaluateSubmissionAutoResults(submissionId: number) {
  const db = getDatabase();

  const submission = (await db.first(`
      SELECT
        s.id,
        s.user_id,
        s.event_id,
        s.class_id,
        s.status,
        e.criteria_template_id
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE s.id = ?
      LIMIT 1
      `, [submissionId])) as SubmissionBaseRow | undefined;

  if (!submission) {
    throw new Error("Không tìm thấy hồ sơ.");
  }

  if (!submission.criteria_template_id) {
    return {
      ok: true,
      results: [] as AutoEvaluationResult[],
    };
  }

  const eventItems = (await db.rows(`
      SELECT
        code,
        title,
        group_code,
        evidence_type,
        is_required
      FROM event_criteria_items
      WHERE event_id = ?
      ORDER BY group_code ASC, sort_order ASC, id ASC
      `, [submission.event_id])) as EventCriteriaItemRow[];

  const activityRules = (await db.rows(`
      SELECT rule.criteria_code, rule.activity_id, activity.title activity_title
      FROM criteria_activity_rules rule JOIN activities activity ON activity.id=rule.activity_id
      WHERE rule.template_id = ?
      `, [submission.criteria_template_id])) as ActivityRuleRow[];

  const conductRules = (await db.rows(`
      SELECT criteria_code, min_score, period_scope
      FROM criteria_conduct_rules
      WHERE template_id = ?
      `, [submission.criteria_template_id])) as ConductRuleRow[];

  const activityRuleMap = new Map<string, ActivityRuleRow[]>();
  for (const rule of activityRules) {
    const list = activityRuleMap.get(rule.criteria_code) ?? [];
    list.push(rule);
    activityRuleMap.set(rule.criteria_code, list);
  }

  const conductRuleMap = new Map<string, ConductRuleRow[]>();
  for (const rule of conductRules) {
    const list = conductRuleMap.get(rule.criteria_code) ?? [];
    list.push(rule);
    conductRuleMap.set(rule.criteria_code, list);
  }

  const currentPeriodId = (await getCurrentConductPeriodId());
  const results: AutoEvaluationResult[] = [];

  for (const item of eventItems) {
    const activityMatches = activityRuleMap.get(item.code) ?? [];
    const conductMatches = conductRuleMap.get(item.code) ?? [];

    for (const rule of activityMatches) {
      const passed = (await hasAttendedActivity(submission.user_id, rule.activity_id));

      results.push({
        criteriaCode: item.code,
        passed,
        sourceType: "activity",
        sourceId: Number(rule.activity_id),
        message: passed
          ? `Đạt tự động từ hoạt động: ${rule.activity_title}`
          : `Chưa đạt hoạt động yêu cầu #${rule.activity_id}.`,
      });
    }

    for (const rule of conductMatches) {
      const periodId = currentPeriodId;
      const totalScore = periodId
        ? (await getConductScoreTotal(submission.user_id, periodId))
        : 0;
      const passed = totalScore >= Number(rule.min_score);

      results.push({
        criteriaCode: item.code,
        passed,
        sourceType: "conduct",
        sourceId: periodId,
        message: periodId
          ? passed
            ? `Đạt tự động do điểm rèn luyện ${totalScore}/${rule.min_score}.`
            : `Chưa đạt điểm rèn luyện ${totalScore}/${rule.min_score}.`
          : "Chưa có kỳ điểm rèn luyện đang áp dụng.",
      });
    }
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
      DELETE FROM submission_auto_results
      WHERE submission_id = ?
      `, [submissionId]));

    

    for (const result of results) {
      (await db.execute(`
      INSERT INTO submission_auto_results (
        submission_id,
        criteria_code,
        source_type,
        source_id,
        passed,
        message,
        evaluated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
      `, [submissionId, result.criteriaCode, result.sourceType, result.sourceId, result.passed ? 1 : 0, result.message]));
    }
  })));

  (await tx());

  return {
    ok: true,
    results,
  };
}