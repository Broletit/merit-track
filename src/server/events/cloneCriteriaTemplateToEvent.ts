import { getDb } from "@/server/db/sqlite";

export function cloneCriteriaTemplateToEvent({
  eventId,
  templateId,
}: {
  eventId: number;
  templateId: number;
}) {
  const db = getDb();

  const submissionCount = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM submissions
      WHERE event_id = ?
      `
    )
    .get(eventId) as { total: number };

  if (Number(submissionCount.total ?? 0) > 0) {
    throw new Error("Không thể đồng bộ tiêu chuẩn vì đợt xét đã có hồ sơ nộp.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
      DELETE FROM event_criteria_items
      WHERE event_id = ?
      `
    ).run(eventId);

    db.prepare(
      `
      DELETE FROM event_criteria_groups
      WHERE event_id = ?
      `
    ).run(eventId);

    db.prepare(
      `
      INSERT INTO event_criteria_groups (
        event_id,
        code,
        title,
        description,
        min_required,
        sort_order
      )
      SELECT
        ?,
        code,
        title,
        description,
        min_required,
        sort_order
      FROM criteria_template_groups
      WHERE template_id = ?
      ORDER BY sort_order ASC, code ASC
      `
    ).run(eventId, templateId);

    db.prepare(
      `
      INSERT INTO event_criteria_items (
        event_id,
        group_code,
        code,
        title,
        description,
        score_max,
        evidence_type,
        is_required,
        sort_order
      )
      SELECT
        ?,
        group_code,
        code,
        title,
        description,
        score_max,
        evidence_type,
        is_required,
        sort_order
      FROM criteria_template_items
      WHERE template_id = ?
      ORDER BY sort_order ASC, code ASC
      `
    ).run(eventId, templateId);
  });

  tx();

  return {
    ok: true,
    message: "Đã sao chép bộ tiêu chuẩn vào đợt xét.",
  };
}