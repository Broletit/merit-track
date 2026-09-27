"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

type EventStatus = "draft" | "published" | "closed";

export async function updateEventStatus(eventId: number, nextStatus: EventStatus) {
  await requireAdminContext();
  const db = getDb();

  if (!["draft", "published", "closed"].includes(nextStatus)) {
    throw new Error("Trạng thái không hợp lệ.");
  }

  const event = db
    .prepare(
      `
      SELECT e.id, e.status, at.is_active
      FROM events e INNER JOIN academic_terms at ON at.id = e.term_id
      WHERE e.id = ?
      LIMIT 1
      `
    )
    .get(eventId) as { id: number; status: string; is_active: number } | undefined;

  if (!event) {
    throw new Error("Đợt xét không tồn tại.");
  }
  if (!event.is_active) throw new Error("Không thể đổi trạng thái đợt xét thuộc học kỳ không hiện hành.");

  const submittedCount = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM submissions
      WHERE event_id = ?
      `
    )
    .get(eventId) as { total: number };

  if (nextStatus === "draft" && Number(submittedCount?.total ?? 0) > 0) {
    throw new Error("Đợt xét đã có hồ sơ nộp, không thể đưa về nháp.");
  }

  db.prepare(
    `
    UPDATE events
    SET
      status = ?,
      published_at = CASE
        WHEN ? = 'published' AND published_at IS NULL THEN datetime('now')
        ELSE published_at
      END,
      closed_at = CASE
        WHEN ? = 'closed' THEN datetime('now')
        ELSE closed_at
      END
    WHERE id = ?
    `
  ).run(nextStatus, nextStatus, nextStatus, eventId);

  revalidatePath("/dashboard/admin/events");
  revalidatePath(`/dashboard/admin/events/${eventId}/edit`);

  return {
    ok: true,
    message: "Cập nhật trạng thái đợt xét thành công.",
  };
}
