"use server";

import { syncGroupMinimum } from "@/server/criteria-templates/groupRequirements";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function deleteCriteriaItem(
  templateId: number,
  criteriaCode: string,
  formData?:FormData
) {
  const admin=await requireAdminContext();

  const db = getDatabase();
  (await assertCriteriaTemplateMutable(db, templateId));
  const code = String(criteriaCode ?? "").trim();
  const reason=requireChangeReason(formData?.get("reason")??null);

  if (!code) throw new Error("Tiêu chí không hợp lệ.");

  const found = (await db.first(`
      SELECT id, title
      FROM criteria_template_items
      WHERE template_id = ? AND code = ?
      LIMIT 1
      `, [templateId, code])) as { id: number; title: string } | undefined;

  if (!found) throw new Error("Tiêu chí không tồn tại.");

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
      DELETE FROM criteria_activity_rules
      WHERE template_id = ? AND criteria_code = ?
      `, [templateId, code]));
    (await writeAuditLog({db,actorUserId:admin.id,action:"criteria_item.delete",entityType:"criteria_item",entityId:`${templateId}:${code}`,reason,before:{...found,templateId,code},after:null}));

    (await db.execute(`
      DELETE FROM criteria_conduct_rules
      WHERE template_id = ? AND criteria_code = ?
      `, [templateId, code]));

    (await db.execute(`
      DELETE FROM criteria_template_items
      WHERE template_id = ? AND code = ?
      `, [templateId, code]));
    (await syncGroupMinimum(db, templateId, undefined, true));
  })));

  (await tx());

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return {
    ok: true,
    message: "Đã xóa tiêu chí.",
  };
}
