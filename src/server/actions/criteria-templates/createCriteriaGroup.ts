"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

function makeGroupCode(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return alphabet[index];
  return `TC${index + 1}`;
}

export async function createCriteriaGroup(
  templateId: number,
  formData: FormData
) {
  await requireAdminContext();
  (await assertCriteriaTemplateMutable(getDatabase(), templateId));

  const db = getDatabase();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const minRequired = Number(formData.get("minRequired") ?? 1);
  const template = (await db.first(`SELECT for_type FROM criteria_templates WHERE id=? LIMIT 1`, [templateId])) as {for_type:string}|undefined;
  if (!template) throw new Error("Bộ tiêu chuẩn không tồn tại.");
  const scoreMax = template.for_type === "officer" ? Number(formData.get("scoreMax") ?? 0) : 0;

  if (!title) {
    throw new Error("Vui lòng nhập tên tiêu chuẩn.");
  }
  const duplicate = await db.first<{ id: number }>(
    "SELECT id FROM criteria_template_groups WHERE template_id=? AND LOWER(title)=LOWER(?) LIMIT 1",
    [templateId, title],
  );
  if (duplicate) throw new Error("Tên tiêu chuẩn đã tồn tại trong bộ tiêu chuẩn này.");

  if (!Number.isInteger(minRequired) || minRequired < 0) {
    throw new Error("Số tiêu chí cần đạt không hợp lệ.");
  }
  if (template.for_type === "officer" && (!Number.isFinite(scoreMax) || scoreMax <= 0)) throw new Error("Điểm tối đa của tiêu chuẩn phải lớn hơn 0.");

  const countRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM criteria_template_groups
      WHERE template_id = ?
      `, [templateId])) as { total: number };

  const sortOrder = Number(countRow.total ?? 0) + 1;
  const code = makeGroupCode(sortOrder - 1);

  (await db.execute(`
    INSERT INTO criteria_template_groups (
      template_id,
      code,
      title,
      description,
      min_required,
      score_max,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [templateId, code, title, description || null, minRequired, scoreMax, sortOrder]));

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã thêm tiêu chuẩn.",
  };
}
