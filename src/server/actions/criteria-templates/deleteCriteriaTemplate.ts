"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function deleteCriteriaTemplate(templateId: number, formData?:FormData) {
  const admin=await requireAdminContext();

  const db = getDb();

  const reason=requireChangeReason(formData?.get("reason")??null);
  const found = db.prepare(`SELECT * FROM criteria_templates WHERE id = ? LIMIT 1`).get(templateId) as Record<string,unknown> | undefined;

  if (!found) throw new Error("Bộ tiêu chuẩn không tồn tại.");

  const used = db
    .prepare(
      `
      SELECT id
      FROM events
      WHERE criteria_template_id = ?
      LIMIT 1
      `
    )
    .get(templateId) as { id: number } | undefined;

  if (used) {
    throw new Error("Không thể xóa vì bộ tiêu chuẩn đã được dùng trong đợt xét.");
  }

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM criteria_activity_rules WHERE template_id = ?`).run(
      templateId
    );

    db.prepare(`DELETE FROM criteria_conduct_rules WHERE template_id = ?`).run(
      templateId
    );

    db.prepare(`DELETE FROM criteria_template_items WHERE template_id = ?`).run(
      templateId
    );

    db.prepare(`DELETE FROM criteria_template_groups WHERE template_id = ?`).run(
      templateId
    );

    db.prepare(`DELETE FROM criteria_templates WHERE id = ?`).run(templateId);
    writeAuditLog({db,actorUserId:admin.id,action:"criteria_template.delete",entityType:"criteria_template",entityId:templateId,reason,before:found,after:null});
  });

  tx();

  revalidatePath("/dashboard/admin/criteria-templates");

  return { ok: true, message: "Đã xóa bộ tiêu chuẩn." };
}
