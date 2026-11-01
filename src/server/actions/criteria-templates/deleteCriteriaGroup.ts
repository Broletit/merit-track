"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";
import { assertCriteriaTemplateMutable } from "@/server/criteria-templates/assertCriteriaTemplateMutable";

export async function deleteCriteriaGroup(
  templateId: number,
  groupCode: string,
  formData?:FormData
) {
  const admin=await requireAdminContext();

  const db = getDatabase();
  (await assertCriteriaTemplateMutable(db, templateId));
  const code = String(groupCode ?? "").trim();
  const reason=requireChangeReason(formData?.get("reason")??null);

  if (!code) throw new Error("Tiêu chuẩn không hợp lệ.");

  const found = (await db.first(`
      SELECT id, title
      FROM criteria_template_groups
      WHERE template_id = ? AND code = ?
      LIMIT 1
      `, [templateId, code])) as { id: number; title: string } | undefined;

  if (!found) throw new Error("Tiêu chuẩn không tồn tại.");

  const criteriaCodes = (await db.rows(`
      SELECT code
      FROM criteria_template_items
      WHERE template_id = ? AND group_code = ?
      `, [templateId, code])) as { code: string }[];

  const tx = (async () => (await db.withTransaction(async () => {
    for (const item of criteriaCodes) {
      (await db.execute(`
        DELETE FROM criteria_activity_rules
        WHERE template_id = ? AND criteria_code = ?
        `, [templateId, item.code]));

      (await db.execute(`
        DELETE FROM criteria_conduct_rules
        WHERE template_id = ? AND criteria_code = ?
        `, [templateId, item.code]));
    }

    (await db.execute(`
      DELETE FROM criteria_template_items
      WHERE template_id = ? AND group_code = ?
      `, [templateId, code]));
    (await writeAuditLog({db,actorUserId:admin.id,action:"criteria_group.delete",entityType:"criteria_group",entityId:`${templateId}:${code}`,reason,before:{...found,templateId,code,criteriaCodes},after:null}));

    (await db.execute(`
      DELETE FROM criteria_template_groups
      WHERE template_id = ? AND code = ?
      `, [templateId, code]));
  })));

  (await tx());

  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);

  return { ok: true, message: "Đã xóa tiêu chuẩn." };
}
