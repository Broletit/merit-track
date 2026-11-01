import { assertTemplateReady } from "@/server/criteria-templates/groupRequirements";
import { getDatabase } from "@/server/db/mysql";

export async function cloneCriteriaTemplateToEvent({
  eventId,
  templateId,
}: {
  eventId: number;
  templateId: number;
}) {
  const db = getDatabase();

  const submissionCount = (await db.first(`
      SELECT COUNT(*) AS total
      FROM submissions
      WHERE event_id = ?
      `, [eventId])) as { total: number };

  if (Number(submissionCount.total ?? 0) > 0) {
    throw new Error("Không thể đồng bộ tiêu chuẩn vì đợt xét đã có hồ sơ nộp.");
  }

  (await assertTemplateReady(db,templateId));

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
      DELETE FROM event_criteria_items
      WHERE event_id = ?
      `, [eventId]));

    (await db.execute(`
      DELETE FROM event_criteria_groups
      WHERE event_id = ?
      `, [eventId]));

    (await db.execute(`
      INSERT INTO event_criteria_groups (
        event_id,
        code,
        title,
        description,
        min_required,
        score_max,
        sort_order
      )
      SELECT
        ?,
        code,
        title,
        description,
        GREATEST(min_required, (SELECT COUNT(*) FROM criteria_template_items required WHERE required.template_id=criteria_template_groups.template_id AND required.group_code=criteria_template_groups.code AND required.is_required=1)),
        score_max,
        sort_order
      FROM criteria_template_groups
      WHERE template_id = ?
      ORDER BY sort_order ASC, code ASC
      `, [eventId, templateId]));

    (await db.execute(`
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
      `, [eventId, templateId]));
  })));

  (await tx());

  return {
    ok: true,
    message: "Đã sao chép bộ tiêu chuẩn vào đợt xét.",
  };
}
