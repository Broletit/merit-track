"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function startCriteriaTemplateEdit(templateId: number) {
  const admin = await requireAdminContext();
  const db = getDatabase();
  if (!Number.isSafeInteger(templateId) || templateId <= 0) throw new Error("Bộ tiêu chuẩn không hợp lệ.");

  await db.withTransaction(async () => {
    const existing = await db.first("SELECT draft_template_id FROM criteria_template_edit_drafts WHERE original_template_id=?", [templateId]);
    if (existing) return;
    const source = await db.first<{name:string;description:string|null;for_type:string}>(
      "SELECT name,description,for_type FROM criteria_templates WHERE id=?", [templateId],
    );
    if (!source) throw new Error("Bộ tiêu chuẩn không tồn tại.");
    const created = await db.execute(
      "INSERT INTO criteria_templates(name,description,for_type,created_by) VALUES(?,?,?,?)",
      [`Bản chỉnh sửa của ${source.name}`, source.description, source.for_type, admin.id],
    );
    const draftId = created.insertId;
    await db.execute("INSERT INTO criteria_template_groups(template_id,code,title,description,min_required,sort_order,score_max) SELECT ?,code,title,description,min_required,sort_order,score_max FROM criteria_template_groups WHERE template_id=?", [draftId, templateId]);
    await db.execute("INSERT INTO criteria_template_items(template_id,group_code,code,title,description,score_max,evidence_type,is_required,required_count,sort_order) SELECT ?,group_code,code,title,description,score_max,evidence_type,is_required,required_count,sort_order FROM criteria_template_items WHERE template_id=?", [draftId, templateId]);
    await db.execute("INSERT INTO criteria_activity_rules(template_id,criteria_code,activity_id,score_value) SELECT ?,criteria_code,activity_id,score_value FROM criteria_activity_rules WHERE template_id=?", [draftId, templateId]);
    await db.execute("INSERT INTO criteria_conduct_rules(template_id,criteria_code,min_score,period_scope) SELECT ?,criteria_code,min_score,period_scope FROM criteria_conduct_rules WHERE template_id=?", [draftId, templateId]);
    await db.execute("INSERT INTO criteria_template_edit_drafts(original_template_id,draft_template_id,created_by) VALUES(?,?,?)", [templateId,draftId,admin.id]);
  });
  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);
  return { ok:true };
}
