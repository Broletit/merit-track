"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function deleteCriteriaItem(
  templateId: number,
  criteriaCode: string,
  formData?:FormData
) {
  const admin=await requireAdminContext();

  const db = getDb();
  assertCriteriaTemplateMutable(db, templateId);
  const code = String(criteriaCode ?? "").trim();
  const reason=requireChangeReason(formData?.get("reason")??null);

  if (!code) throw new Error("Tiêu chí không hợp lệ.");

  const found = db
    .prepare(
      `
      SELECT id
      FROM criteria_template_items
      WHERE template_id = ? AND code = ?
      LIMIT 1
      `
    )
    .get(templateId, code) as { id: number } | undefined;

  if (!found) throw new Error("Tiêu chí không tồn tại.");

  const tx = db.transaction(() => {
    db.prepare(
      `
      DELETE FROM criteria_activity_rules
      WHERE template_id = ? AND criteria_code = ?
      `
    ).run(templateId, code);
    writeAuditLog({db,actorUserId:admin.id,action:"criteria_item.delete",entityType:"criteria_item",entityId:`${templateId}:${code}`,reason,before:{...found,templateId,code},after:null});

    db.prepare(
      `
      DELETE FROM criteria_conduct_rules
      WHERE template_id = ? AND criteria_code = ?
      `
    ).run(templateId, code);

    db.prepare(
      `
      DELETE FROM criteria_template_items
      WHERE template_id = ? AND code = ?
      `
    ).run(templateId, code);
  });

  tx();

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã xóa tiêu chí.",
  };
}
