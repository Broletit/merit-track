"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

type ActivityStatus = "draft" | "published";

export async function updateActivityStatus(
  activityId: number,
  nextStatus: ActivityStatus
) {
  await requireAdminContext();
  const db = getDb();

  if (!["draft", "published"].includes(nextStatus)) {
    throw new Error("Trạng thái không hợp lệ.");
  }

  const activity = db
    .prepare(
      `
      SELECT a.id, a.status, at.is_active
      FROM activities a INNER JOIN academic_terms at ON at.id = a.term_id
      WHERE a.id = ?
      LIMIT 1
      `
    )
    .get(activityId) as { id: number; status: string; is_active: number } | undefined;

  if (!activity) {
    throw new Error("Hoạt động không tồn tại.");
  }
  if (!activity.is_active) throw new Error("Không thể đổi trạng thái hoạt động thuộc học kỳ không hiện hành.");

  const registrationCount = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM activity_registrations
      WHERE activity_id = ?
      `
    )
    .get(activityId) as { total: number };

  if (Number(registrationCount?.total ?? 0) > 0 && nextStatus === "draft") {
    throw new Error("Hoạt động đã có sinh viên đăng ký nên không thể đưa về nháp.");
  }

  db.prepare(
    `
    UPDATE activities
    SET
      status = ?,
      published_at = CASE
        WHEN ? = 'published' AND published_at IS NULL THEN datetime('now')
        ELSE published_at
      END,
      registration_locked = CASE WHEN ? = 'published' THEN 0 ELSE registration_locked END
    WHERE id = ?
    `
  ).run(nextStatus, nextStatus, nextStatus, activityId);

  revalidatePath("/dashboard/admin/activities");
  revalidatePath(`/dashboard/admin/activities/${activityId}/edit`);
  revalidatePath(`/dashboard/admin/activities/${activityId}`);
  revalidatePath("/dashboard/student/activities");
  revalidatePath("/dashboard/faculty-officer/checkin");

  return {
    ok: true,
    message: "Cập nhật trạng thái hoạt động thành công.",
  };
}
