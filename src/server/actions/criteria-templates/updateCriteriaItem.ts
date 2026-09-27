"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function updateCriteriaItem(
  templateId: number,
  criteriaCode: string,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDb();
  assertCriteriaTemplateMutable(db, templateId);

  const code = String(criteriaCode ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isRequired = String(formData.get("isRequired") ?? "") === "on";
  const scoreMax = Number(formData.get("scoreMax") ?? 0);

  const activityIds = formData
    .getAll("activityIds")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  const evidenceType = activityIds.length > 0 ? "both" : "manual";

  if (!code) throw new Error("Tiêu chí không hợp lệ.");
  if (!title) throw new Error("Vui lòng nhập tên tiêu chí.");
  if (!Number.isFinite(scoreMax) || scoreMax < 0) {
    throw new Error("Điểm tối đa không hợp lệ.");
  }

  const found = db
    .prepare(
      `
      SELECT id
      FROM criteria_template_items
      WHERE template_id = ? AND code = ?
      LIMIT 1
      `
    )
    .get(templateId, code) as { id: number } | undefined;

  if (!found) throw new Error("Tiêu chí không tồn tại.");

  const tx = db.transaction(() => {
    db.prepare(
      `
      UPDATE criteria_template_items
      SET
        title = ?,
        description = ?,
        score_max = ?,
        evidence_type = ?,
        is_required = ?
      WHERE template_id = ? AND code = ?
      `
    ).run(
      title,
      description || null,
      scoreMax,
      evidenceType,
      isRequired ? 1 : 0,
      templateId,
      code
    );

    db.prepare(
      `
      DELETE FROM criteria_activity_rules
      WHERE template_id = ? AND criteria_code = ?
      `
    ).run(templateId, code);

    for (const activityId of activityIds) {
      db.prepare(
        `
        INSERT OR IGNORE INTO criteria_activity_rules (
          template_id,
          criteria_code,
          activity_id
        )
        VALUES (?, ?, ?)
        `
      ).run(templateId, code, activityId);
    }
  });

  tx();

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã cập nhật tiêu chí.",
  };
}
