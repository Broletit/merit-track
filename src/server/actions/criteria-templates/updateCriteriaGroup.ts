"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function updateCriteriaGroup(
  templateId: number,
  groupCode: string,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDatabase();
  (await assertCriteriaTemplateMutable(db, templateId));

  const code = String(groupCode ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const minRequired = Number(formData.get("minRequired") ?? 0);
  const template = (await db.first(`SELECT for_type FROM criteria_templates WHERE id=? LIMIT 1`, [templateId])) as {for_type:string}|undefined;
  if (!template) throw new Error("Bộ tiêu chuẩn không tồn tại.");
  const scoreMax = template.for_type === "officer" ? Number(formData.get("scoreMax") ?? 0) : 0;

  if (!code) throw new Error("Tiêu chuẩn không hợp lệ.");
  if (!title) throw new Error("Vui lòng nhập tên tiêu chuẩn.");
  const duplicate = await db.first<{ id: number }>(
    "SELECT id FROM criteria_template_groups WHERE template_id=? AND LOWER(title)=LOWER(?) AND code<>? LIMIT 1",
    [templateId, title, code],
  );
  if (duplicate) throw new Error("Tên tiêu chuẩn đã tồn tại trong bộ tiêu chuẩn này.");
  if (!Number.isInteger(minRequired) || minRequired < 0) {
    throw new Error("Số tiêu chí cần đạt không hợp lệ.");
  }

  const found = (await db.first(`
      SELECT id
      FROM criteria_template_groups
      WHERE template_id = ? AND code = ?
      LIMIT 1
      `, [templateId, code])) as { id: number } | undefined;

  if (!found) throw new Error("Tiêu chuẩn không tồn tại.");

  const itemCount = Number(((await db.first(`SELECT COUNT(*) total FROM criteria_template_items WHERE template_id=? AND group_code=?`, [templateId, code])) as {total:number}).total);
  const mandatoryCount = Number(((await db.first("SELECT COUNT(*) total FROM criteria_template_items WHERE template_id=? AND group_code=? AND is_required=1", [templateId, code])) as {total:number}).total);
  if (minRequired < mandatoryCount) throw new Error(`Số tiêu chí tối thiểu phải từ ${mandatoryCount} vì tiêu chuẩn có ${mandatoryCount} tiêu chí bắt buộc.`);
  if (minRequired > itemCount) {
    throw new Error(`Tiêu chuẩn hiện có ${itemCount} tiêu chí, không thể yêu cầu đạt tối thiểu ${minRequired}.`);
  }
  if (template.for_type === "officer" && (!Number.isFinite(scoreMax) || scoreMax <= 0)) throw new Error("Điểm tối đa của tiêu chuẩn phải lớn hơn 0.");

  (await db.execute(`
    UPDATE criteria_template_groups
    SET title = ?, description = ?, min_required = ?, score_max = ?
    WHERE template_id = ? AND code = ?
    `, [title, description || null, minRequired, scoreMax, templateId, code]));

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return { ok: true, message: "Đã cập nhật tiêu chuẩn." };
}
