"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
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
  assertCriteriaTemplateMutable(getDb(), templateId);

  const db = getDb();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const minRequired = Number(formData.get("minRequired") ?? 1);

  if (!title) {
    throw new Error("Vui lòng nhập tên tiêu chuẩn.");
  }

  if (!Number.isFinite(minRequired) || minRequired < 0) {
    throw new Error("Số tiêu chí cần đạt không hợp lệ.");
  }

  const countRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM criteria_template_groups
      WHERE template_id = ?
      `
    )
    .get(templateId) as { total: number };

  const sortOrder = Number(countRow.total ?? 0) + 1;
  const code = makeGroupCode(sortOrder - 1);

  db.prepare(
    `
    INSERT INTO criteria_template_groups (
      template_id,
      code,
      title,
      description,
      min_required,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(templateId, code, title, description || null, minRequired, sortOrder);

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã thêm tiêu chuẩn.",
  };
}
