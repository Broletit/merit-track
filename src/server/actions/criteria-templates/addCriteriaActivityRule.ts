"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function addCriteriaActivityRule(
  templateId: number,
  criteriaCode: string,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDatabase();
  (await assertCriteriaTemplateMutable(db, templateId));

  const activityId = Number(formData.get("activityId") ?? 0);
  const scoreValue = Number(formData.get("scoreValue") ?? 0);

  if (!criteriaCode) {
    throw new Error("Tiêu chí không hợp lệ.");
  }

  if (!Number.isFinite(activityId) || activityId <= 0) {
    throw new Error("Vui lòng chọn hoạt động.");
  }
  if (!Number.isFinite(scoreValue) || scoreValue < 0) throw new Error("Điểm hoạt động không hợp lệ.");

  const criteria = (await db.first(`
      SELECT id, evidence_type
      FROM criteria_template_items
      WHERE template_id = ?
        AND code = ?
      LIMIT 1
      `, [templateId, criteriaCode])) as
    | { id: number; evidence_type: string }
    | undefined;

  if (!criteria) {
    throw new Error("Tiêu chí không tồn tại.");
  }

  if (!["auto", "both"].includes(criteria.evidence_type)) {
    throw new Error("Chỉ tiêu chí tự động hoặc cả hai mới được gắn hoạt động.");
  }

  const activity = (await db.first(`
      SELECT id
      FROM activities
      WHERE id = ?
      LIMIT 1
      `, [activityId])) as { id: number } | undefined;

  if (!activity) {
    throw new Error("Hoạt động không tồn tại.");
  }

  (await db.execute(`
    INSERT INTO criteria_activity_rules (
      template_id,
      criteria_code,
      activity_id,
      score_value
    )
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE score_value=VALUES(score_value)
    `, [templateId, criteriaCode, activityId, scoreValue]));

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã gắn hoạt động.",
  };
}
