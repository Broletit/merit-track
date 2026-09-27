"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function createCriteriaTemplate(formData: FormData) {
  const admin = await requireAdminContext();
  const db = getDb();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const forType = String(formData.get("forType") ?? "student").trim();

  if (!name) {
    throw new Error("Vui lòng nhập tên bộ tiêu chuẩn.");
  }

  if (!["student", "officer"].includes(forType)) {
    throw new Error("Đối tượng bộ tiêu chuẩn không hợp lệ.");
  }

  const result = db
    .prepare(
      `
      INSERT INTO criteria_templates (
        name,
        description,
        for_type,
        created_by,
        created_at
      )
      VALUES (?, ?, ?, ?, datetime('now'))
      `
    )
    .run(name, description || null, forType, admin.id);

  const templateId = Number(result.lastInsertRowid);

  revalidatePath("/dashboard/admin/criteria-templates");
  revalidatePath("/dashboard/admin/criteria-templates/create");
  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    templateId,
    message: "Tạo bộ tiêu chuẩn thành công. Hãy tiếp tục cấu hình tiêu chuẩn, tiêu chí và điều kiện tự động.",
  };
}