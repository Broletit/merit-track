import { getDatabase } from "@/server/db/mysql";

export type AutoCriteriaResult = {
  criteriaCode: string;
  passed: boolean;
  matchedActivityIds: number[];
  matchedActivityTitles: string[];
};

type CriteriaRow = {
  code: string;
  evidence_type: string;
};

type ConductRuleRow = {
  min_score: number;
  period_scope: string;
};

type MatchRow = {
  activity_id: number;
  activity_title: string;
};

export async function evaluateAutoCriteria({
  eventId,
  userId,
}: {
  eventId: number;
  userId: number;
}): Promise<AutoCriteriaResult[]> {
  const db = getDatabase();

  const event = (await db.first(`
      SELECT id, criteria_template_id, term_id
      FROM events
      WHERE id = ?
      LIMIT 1
      `, [eventId])) as
    | {
        id: number;
        criteria_template_id: number | null;
        term_id: number | null;
      }
    | undefined;

  if (!event || !event.criteria_template_id || !event.term_id) {
    return [];
  }

  const criteriaRows = (await db.rows(`
      SELECT code, evidence_type
      FROM event_criteria_items
      WHERE event_id = ?
        AND evidence_type IN ('auto', 'both')
      ORDER BY sort_order ASC, code ASC
      `, [eventId])) as CriteriaRow[];

  return (await Promise.all(criteriaRows.map(async (criteria) => {
    const matches = (await db.rows(`
        SELECT
          a.id AS activity_id,
          a.title AS activity_title
        FROM criteria_activity_rules r
        INNER JOIN activities a ON a.id = r.activity_id
        INNER JOIN activity_registrations ar
          ON ar.activity_id = a.id
         AND ar.user_id = ?
         AND ar.status = 'attended'
        WHERE r.template_id = ?
          AND r.criteria_code = ?
        ORDER BY CAST(a.start_at AS DATETIME(3)) DESC, a.id DESC
        `, [userId, event.criteria_template_id, criteria.code])) as MatchRow[];

    const conductRule = (await db.first(`
        SELECT min_score, period_scope
        FROM criteria_conduct_rules
        WHERE template_id = ?
          AND criteria_code = ?
        LIMIT 1
        `, [event.criteria_template_id, criteria.code])) as ConductRuleRow | undefined;

    let conductPassed = false;
    if (conductRule) {
      const scoreRow = (await db.first(`
          SELECT COALESCE(MAX(period_total), 0) AS total_score
          FROM (
            SELECT cs.period_id, SUM(cs.score_value) AS period_total
            FROM conduct_scores cs
            INNER JOIN conduct_periods cp ON cp.id = cs.period_id
            INNER JOIN academic_terms term
              ON term.academic_year = cp.academic_year
             AND term.semester = cp.semester
            WHERE cs.user_id = ?
              AND (? = 'any' OR term.id = ?)
            GROUP BY cs.period_id
          ) totals
          `, [userId, conductRule.period_scope, event.term_id])) as
        | { total_score: number }
        | undefined;

      conductPassed = Number(scoreRow?.total_score ?? 0) >= Number(conductRule.min_score);
    }

    return {
      criteriaCode: criteria.code,
      passed: matches.length > 0 || conductPassed,
      matchedActivityIds: matches.map((item) => Number(item.activity_id)),
      matchedActivityTitles: matches.map((item) =>
        String(item.activity_title ?? "")
      ),
    };
  })));
}
