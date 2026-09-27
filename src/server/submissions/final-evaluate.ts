import { getDb } from "@/server/db/sqlite";

export function evaluateSubmissionFinal(submissionId: number) {
  const db = getDb();

  const groups = db
    .prepare(
      `
      SELECT code, min_required
      FROM event_criteria_groups
      WHERE event_id = (
        SELECT event_id
        FROM submissions
        WHERE id = ?
      )
      ORDER BY sort_order ASC, id ASC
      `
    )
    .all(submissionId) as Array<{ code: string; min_required: number }>;

  const items = db
    .prepare(
      `
      SELECT group_code, code
      FROM event_criteria_items
      WHERE event_id = (
        SELECT event_id
        FROM submissions
        WHERE id = ?
      )
      ORDER BY group_code ASC, sort_order ASC, id ASC
      `
    )
    .all(submissionId) as Array<{ group_code: string; code: string }>;

  const auto = db
    .prepare(
      `
      SELECT criteria_code, passed
      FROM submission_auto_results
      WHERE submission_id = ?
      `
    )
    .all(submissionId) as Array<{ criteria_code: string; passed: number }>;

  const autoMap = new Map<string, boolean>();

  for (const row of auto) {
    const prev = autoMap.get(row.criteria_code) ?? false;
    autoMap.set(row.criteria_code, prev || Boolean(row.passed));
  }

  const groupResults = groups.map((group) => {
    const groupItems = items.filter((item) => item.group_code === group.code);
    const passedCount = groupItems.filter((item) => autoMap.get(item.code)).length;
    const passed = passedCount >= Number(group.min_required ?? 0);

    return {
      groupCode: String(group.code ?? ""),
      passed,
      passedCount,
      required: Number(group.min_required ?? 0),
    };
  });

  return {
    submissionPassed: groupResults.every((group) => group.passed),
    groupResults,
  };
}