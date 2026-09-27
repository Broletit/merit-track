"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { requireChangeReason, writeAuditLog } from "@/server/audit/writeAuditLog";

export async function deleteEvent(eventId: number, formData?: FormData) {
  const admin=await requireAdminContext();
  const db = getDb();
  const reason=requireChangeReason(formData?.get("reason")??null);
  const row = db.prepare(`SELECT e.*, at.is_active, (SELECT COUNT(*) FROM submissions s WHERE s.event_id = e.id) submissions FROM events e INNER JOIN academic_terms at ON at.id = e.term_id WHERE e.id = ?`).get(eventId) as { id: number; is_active: number; submissions: number; [key:string]:unknown } | undefined;
  if (!row) throw new Error("Đợt xét không tồn tại.");
  if (!row.is_active) throw new Error("Không thể xóa đợt xét thuộc học kỳ không hiện hành.");
  if (row.submissions > 0) throw new Error("Đợt xét đã có hồ sơ, không thể xóa.");
  const tx=db.transaction(()=>{db.prepare("DELETE FROM events WHERE id = ?").run(eventId);writeAuditLog({db,actorUserId:admin.id,action:"event.delete",entityType:"event",entityId:eventId,reason,before:row,after:null});});tx();
  revalidatePath("/dashboard/admin/events");
  return { ok: true, message: "Xóa đợt xét thành công." };
}
