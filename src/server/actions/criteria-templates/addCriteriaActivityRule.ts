"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function addCriteriaActivityRule(
  templateId: number,
  criteriaCode: string,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDb();
  assertCriteriaTemplateMutable(db, templateId);

  const activityId = Number(formData.get("activityId") ?? 0);
  const scoreValue = Number(formData.get("scoreValue") ?? 0);

  if (!criteriaCode) {
    throw new Error("Tiêu chí không hợp lệ.");
  }

  if (!Number.isFinite(activityId) || activityId <= 0) {
    throw new Error("Vui lòng chọn hoạt động.");
  }
  if (!Number.isFinite(scoreValue) || scoreValue < 0) throw new Error("Điểm hoạt động không hợp lệ.");

  const criteria = db
    .prepare(
      `
      SELECT id, evidence_type
      FROM criteria_template_items
      WHERE template_id = ?
        AND code = ?
      LIMIT 1
      `
    )
    .get(templateId, criteriaCode) as
    | { id: number; evidence_type: string }
    | undefined;

  if (!criteria) {
    throw new Error("Tiêu chí không tồn tại.");
  }

  if (!["auto", "both"].includes(criteria.evidence_type)) {
    throw new Error("Chỉ tiêu chí tự động hoặc cả hai mới được gắn hoạt động.");
  }

  const activity = db
    .prepare(
      `
      SELECT id
      FROM activities
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(activityId) as { id: number } | undefined;

  if (!activity) {
    throw new Error("Hoạt động không tồn tại.");
  }

  db.prepare(
    `
    INSERT INTO criteria_activity_rules (
      template_id,
      criteria_code,
      activity_id,
      score_value
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(template_id, criteria_code, activity_id) DO UPDATE SET score_value=excluded.score_value
    `
  ).run(templateId, criteriaCode, activityId, scoreValue);

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã gắn hoạt động.",
  };
}
