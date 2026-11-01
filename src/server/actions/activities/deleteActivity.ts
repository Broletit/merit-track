"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function deleteActivity(activityId: number, formData?: FormData) {
  const admin=await requireAdminContext();
  const db = getDatabase();
  const reason=requireChangeReason(formData?.get("reason")??null);
  const row = (await db.first(`SELECT a.*, at.is_active, (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id) registrations FROM activities a INNER JOIN academic_terms at ON at.id = a.term_id WHERE a.id = ?`, [activityId])) as { id: number; is_active: number; registrations: number; [key:string]:unknown } | undefined;
  if (!row) throw new Error("Hoạt động không tồn tại.");
  if (!row.is_active) throw new Error("Không thể xóa hoạt động thuộc học kỳ không hiện hành.");
  if (row.registrations > 0) throw new Error("Hoạt động đã có người đăng ký, không thể xóa.");
  const tx=(async () => (await db.withTransaction(async ()=>{(await db.execute("DELETE FROM activities WHERE id = ?", [activityId]));(await writeAuditLog({db,actorUserId:admin.id,action:"activity.delete",entityType:"activity",entityId:activityId,reason,before:row,after:null}));})));(await tx());
  revalidatePath("/dashboard/admin/activities");
  return { ok: true, message: "Xóa hoạt động thành công." };
}
