"use server";

import { assertTemplateReady } from "@/server/criteria-templates/groupRequirements";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

type EventStatus = "draft" | "published" | "closed";

export async function updateEventStatus(eventId: number, nextStatus: EventStatus) {
  await requireAdminContext();
  const db = getDatabase();

  if (!["draft", "published", "closed"].includes(nextStatus)) {
    throw new Error("Trạng thái không hợp lệ.");
  }

  const event = (await db.first(`
      SELECT e.id, e.status, e.criteria_template_id, at.is_active
      FROM events e INNER JOIN academic_terms at ON at.id = e.term_id
      WHERE e.id = ?
      LIMIT 1
      `, [eventId])) as { id: number; status: string; criteria_template_id: number; is_active: number } | undefined;

  if (!event) {
    throw new Error("Đợt xét không tồn tại.");
  }
  if (!event.is_active) throw new Error("Không thể đổi trạng thái đợt xét thuộc học kỳ không hiện hành.");

  const submittedCount = (await db.first(`
      SELECT COUNT(*) AS total
      FROM submissions
      WHERE event_id = ?
      `, [eventId])) as { total: number };

  if (nextStatus === "draft" && Number(submittedCount?.total ?? 0) > 0) {
    throw new Error("Đợt xét đã có hồ sơ nộp, không thể đưa về nháp.");
  }

  if (nextStatus === "published" && Number(submittedCount?.total ?? 0) === 0) (await assertTemplateReady(db, event.criteria_template_id));

  (await db.execute(`
    UPDATE events
    SET
      status = ?,
      published_at = CASE
        WHEN ? = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP(3)
        ELSE published_at
      END,
      closed_at = CASE
        WHEN ? = 'closed' THEN CURRENT_TIMESTAMP(3)
        ELSE closed_at
      END
    WHERE id = ?
    `, [nextStatus, nextStatus, nextStatus, eventId]));

  revalidatePath("/dashboard/admin/events");
  revalidatePath(`/dashboard/admin/events/${eventId}/edit`);

  return {
    ok: true,
    message: "Cập nhật trạng thái đợt xét thành công.",
  };
}
