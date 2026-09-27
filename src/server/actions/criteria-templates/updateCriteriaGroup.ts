"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function updateCriteriaGroup(
  templateId: number,
  groupCode: string,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDb();
  assertCriteriaTemplateMutable(db, templateId);

  const code = String(groupCode ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const minRequired = Number(formData.get("minRequired") ?? 0);

  if (!code) throw new Error("Tiêu chuẩn không hợp lệ.");
  if (!title) throw new Error("Vui lòng nhập tên tiêu chuẩn.");
  if (!Number.isFinite(minRequired) || minRequired < 0) {
    throw new Error("Số tiêu chí cần đạt không hợp lệ.");
  }

  const found = db
    .prepare(
      `
      SELECT id
      FROM criteria_template_groups
      WHERE template_id = ? AND code = ?
      LIMIT 1
      `
    )
    .get(templateId, code) as { id: number } | undefined;

  if (!found) throw new Error("Tiêu chuẩn không tồn tại.");

  const itemCount = Number((db.prepare(`SELECT COUNT(*) total FROM criteria_template_items WHERE template_id=? AND group_code=?`).get(templateId,code) as {total:number}).total);
  if (minRequired > itemCount) {
    throw new Error(`Tiêu chuẩn hiện có ${itemCount} tiêu chí, không thể yêu cầu đạt tối thiểu ${minRequired}.`);
  }

  db.prepare(
    `
    UPDATE criteria_template_groups
    SET title = ?, description = ?, min_required = ?
    WHERE template_id = ? AND code = ?
    `
  ).run(title, description || null, minRequired, templateId, code);

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return { ok: true, message: "Đã cập nhật tiêu chuẩn." };
}
