"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { isCriteriaTemplateInUse } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function updateCriteriaTemplate(
  templateId: number,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDb();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const forType = String(formData.get("forType") ?? "").trim();

  if (!name) throw new Error("Vui lòng nhập tên bộ tiêu chuẩn.");
  if (!["student", "officer"].includes(forType)) {
    throw new Error("Đối tượng không hợp lệ.");
  }

  const found = db
    .prepare(`SELECT id FROM criteria_templates WHERE id = ? LIMIT 1`)
    .get(templateId) as { id: number } | undefined;

  if (!found) throw new Error("Bộ tiêu chuẩn không tồn tại.");

  if (isCriteriaTemplateInUse(db, templateId)) {
    db.prepare(`UPDATE criteria_templates SET name = ?, description = ? WHERE id = ?`).run(
      name,
      description || null,
      templateId,
    );

    revalidatePath("/dashboard/admin/criteria-templates");
    revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

    return { ok: true, message: "Đã cập nhật tên và mô tả bộ tiêu chuẩn." };
  }

  db.prepare(
    `
    UPDATE criteria_templates
    SET name = ?, description = ?, for_type = ?
    WHERE id = ?
    `
  ).run(name, description || null, forType, templateId);

  revalidatePath("/dashboard/admin/criteria-templates");
  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return { ok: true, message: "Đã cập nhật bộ tiêu chuẩn." };
}
