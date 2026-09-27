"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function createCriteriaItem(
  templateId: number,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDb();
  assertCriteriaTemplateMutable(db, templateId);

  const groupCode = String(formData.get("groupCode") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isRequired = String(formData.get("isRequired") ?? "") === "on";
  const scoreMax = Number(formData.get("scoreMax") ?? 0);

  const activityIds = formData
    .getAll("activityIds")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  const evidenceType = activityIds.length > 0 ? "both" : "manual";

  if (!groupCode) throw new Error("Tiêu chuẩn không hợp lệ.");
  if (!title) throw new Error("Vui lòng nhập tên tiêu chí.");

  if (!Number.isFinite(scoreMax) || scoreMax < 0) {
    throw new Error("Điểm tối đa không hợp lệ.");
  }

  const group = db
    .prepare(
      `
      SELECT code
      FROM criteria_template_groups
      WHERE template_id = ?
        AND code = ?
      LIMIT 1
      `
    )
    .get(templateId, groupCode) as { code: string } | undefined;

  if (!group) {
    throw new Error("Tiêu chuẩn không tồn tại.");
  }

  const countRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM criteria_template_items
      WHERE template_id = ?
        AND group_code = ?
      `
    )
    .get(templateId, groupCode) as { total: number };

  const nextIndex = Number(countRow.total ?? 0) + 1;
  const code = `${groupCode}${nextIndex}`;
  const sortOrder = nextIndex;

  const tx = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO criteria_template_items (
        template_id,
        group_code,
        code,
        title,
        description,
        score_max,
        evidence_type,
        is_required,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      templateId,
      groupCode,
      code,
      title,
      description || null,
      scoreMax,
      evidenceType,
      isRequired ? 1 : 0,
      sortOrder
    );

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
    message: "Đã thêm tiêu chí.",
  };
}
