"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function upsertCriteriaConductRule(
  templateId: number,
  criteriaCode: string,
  formData: FormData
) {
  await requireAdminContext();
  const db = getDatabase();
  (await assertCriteriaTemplateMutable(db, templateId));

  const minScore = Number(formData.get("minScore") ?? 0);
  const periodScope = String(formData.get("periodScope") ?? "current").trim();

  if (!criteriaCode) throw new Error("Tiêu chí không hợp lệ.");

  if (!Number.isFinite(minScore) || minScore < 0) {
    throw new Error("Điểm rèn luyện tối thiểu không hợp lệ.");
  }

  if (!["current", "any"].includes(periodScope)) {
    throw new Error("Phạm vi kỳ điểm không hợp lệ.");
  }

  (await db.execute(`
    INSERT INTO criteria_conduct_rules (
      template_id,
      criteria_code,
      min_score,
      period_scope
    )
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      min_score = VALUES(min_score),
      period_scope = VALUES(period_scope)
    `, [templateId, criteriaCode, minScore, periodScope]));

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã cập nhật điều kiện điểm rèn luyện.",
  };
}
