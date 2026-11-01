"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function createCriteriaItem(
  templateId: number,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDatabase();
  (await assertCriteriaTemplateMutable(db, templateId));

  const groupCode = String(formData.get("groupCode") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const evidenceType = String(formData.get("evidenceType") ?? "manual").trim();
  const isRequired = String(formData.get("isRequired") ?? "") === "on";
  const scoreMax = Number(formData.get("scoreMax") ?? 0);

  if (!groupCode) throw new Error("Tiêu chuẩn không hợp lệ.");
  if (!title) throw new Error("Vui lòng nhập tên tiêu chí.");

  if (!["auto", "manual", "both"].includes(evidenceType)) {
    throw new Error("Loại xét tiêu chí không hợp lệ.");
  }

  const group = (await db.first(`
      SELECT code
      FROM criteria_template_groups
      WHERE template_id = ?
        AND code = ?
      LIMIT 1
      `, [templateId, groupCode])) as { code: string } | undefined;

  if (!group) {
    throw new Error("Tiêu chuẩn không tồn tại.");
  }

  const countRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM criteria_template_items
      WHERE template_id = ?
        AND group_code = ?
      `, [templateId, groupCode])) as { total: number };

  const nextIndex = Number(countRow.total ?? 0) + 1;
  const code = `${groupCode}${nextIndex}`;
  const sortOrder = nextIndex;

  (await db.execute(`
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
    `, [templateId, groupCode, code, title, description || null, scoreMax, evidenceType, isRequired ? 1 : 0, sortOrder]));

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã thêm tiêu chí.",
  };
}
