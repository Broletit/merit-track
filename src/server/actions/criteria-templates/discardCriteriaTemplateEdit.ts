"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function discardCriteriaTemplateEdit(templateId: number) {
  await requireAdminContext();
  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
    throw new Error("Bộ tiêu chuẩn không hợp lệ.");
  }

  const db = getDatabase();
  await db.withTransaction(async () => {
    const draft = await db.first<{ draft_template_id: number; status: string }>(
      "SELECT draft_template_id,status FROM criteria_template_edit_drafts WHERE original_template_id=? FOR UPDATE",
      [templateId],
    );
    if (!draft) return;
    if (draft.status !== "editing") {
      throw new Error("Bộ tiêu chuẩn đã bắt đầu cập nhật và không thể hủy bản nháp.");
    }
    await db.execute("DELETE FROM criteria_template_edit_drafts WHERE original_template_id=?", [templateId]);
    await db.execute("DELETE FROM criteria_templates WHERE id=?", [draft.draft_template_id]);
  });
  revalidatePath(`/dashboard/admin/criteria-templates/${templateId}/configure`);
}
