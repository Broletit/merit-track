"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function deleteCriteriaTemplate(templateId: number, formData?:FormData) {
  const admin=await requireAdminContext();

  const db = getDatabase();

  const reason=requireChangeReason(formData?.get("reason")??null);
  const found = (await db.first(`SELECT * FROM criteria_templates WHERE id = ? LIMIT 1`, [templateId])) as Record<string,unknown> | undefined;

  if (!found) throw new Error("Bộ tiêu chuẩn không tồn tại.");

  const used = (await db.first(`
      SELECT id
      FROM events
      WHERE criteria_template_id = ?
      LIMIT 1
      `, [templateId])) as { id: number } | undefined;

  if (used) {
    throw new Error("Không thể xóa vì bộ tiêu chuẩn đã được dùng trong đợt xét.");
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`DELETE FROM criteria_activity_rules WHERE template_id = ?`, [templateId]));

    (await db.execute(`DELETE FROM criteria_conduct_rules WHERE template_id = ?`, [templateId]));

    (await db.execute(`DELETE FROM criteria_template_items WHERE template_id = ?`, [templateId]));

    (await db.execute(`DELETE FROM criteria_template_groups WHERE template_id = ?`, [templateId]));

    (await db.execute(`DELETE FROM criteria_templates WHERE id = ?`, [templateId]));
    (await writeAuditLog({db,actorUserId:admin.id,action:"criteria_template.delete",entityType:"criteria_template",entityId:templateId,reason,before:found,after:null}));
  })));

  (await tx());

  revalidatePath("/dashboard/admin/criteria-templates");

  return { ok: true, message: "Đã xóa bộ tiêu chuẩn." };
}
