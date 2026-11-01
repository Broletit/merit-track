"use server";

import { assertActivityScope } from "@/server/activities/scopes";
import { revalidatePath } from "next/cache";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDatabase } from "@/server/db/mysql";

export async function registerOfficerActivity(activityId: number) {
  const user = await requireOfficerParticipantContext();
  const db = getDatabase();
  return db.withTransaction(async () => {

  const activity = (await db.first(`
      SELECT
        id,
        audience_type,
        status,
        participation_source,
        registration_start_at,
        registration_end_at
      FROM activities
      WHERE id = ?
      LIMIT 1
      `, [activityId])) as
    | {
        id: number;
        audience_type: string;
        status: string;
        participation_source: string;
        registration_start_at: string | null;
        registration_end_at: string | null;
      }
    | undefined;

  if (!activity) throw new Error("Hoạt động không tồn tại.");

  if (activity.audience_type !== "officer") {
    throw new Error("Hoạt động này không dành cho cán bộ.");
  }

  if (activity.status !== "published") {
    throw new Error("Hoạt động chưa được công khai.");
  }

  const now = new Date();
  const regStart = activity.registration_start_at
    ? new Date(activity.registration_start_at)
    : new Date(0);
  const regEnd = activity.registration_end_at
    ? new Date(activity.registration_end_at)
    : new Date(8_640_000_000_000_000);

  if (now < regStart) throw new Error("Chưa đến thời gian đăng ký.");
  if (now > regEnd) throw new Error("Đã hết thời gian đăng ký.");

  if (activity.participation_source === "external") throw new Error("Hoạt động cấp khoa đăng ký trên hệ thống của trường.");
  const membership = (await db.first(`SELECT class_id FROM class_members WHERE user_id=? AND left_at IS NULL ORDER BY id DESC LIMIT 1`, [user.id])) as { class_id: number } | undefined;
  if (!membership) throw new Error("Tài khoản chưa được gán lớp.");
  (await assertActivityScope(activityId, user.id));

  const capacity = await db.first<{max_registrations:number|null}>("SELECT max_registrations FROM activities WHERE id=? FOR UPDATE", [activityId]);
  const count = await db.first<{total:number}>("SELECT COUNT(*) total FROM activity_registrations WHERE activity_id=? AND status<>'cancelled'", [activityId]);
  if (capacity?.max_registrations != null && Number(count?.total) >= capacity.max_registrations) throw new Error("Hoạt động đã đạt số lượng đăng ký tối đa");
  const result = (await db.execute(`
    INSERT IGNORE INTO activity_registrations (
      activity_id,
      user_id,
      class_id,
      status,
      registered_at
    )
    VALUES (?, ?, ?, 'registered', CURRENT_TIMESTAMP(3))
    `, [activityId, user.id, membership.class_id]));

  if (result.changes === 0) {
    throw new Error("Bạn đã đăng ký hoạt động này rồi.");
  }

  (await db.execute("UPDATE activity_registrations SET role_context=? WHERE activity_id=? AND user_id=?", [user.loginContext ?? "class_officer", activityId, user.id]));

  revalidatePath("/dashboard/faculty-officer/officer-activities");
  revalidatePath(`/dashboard/faculty-officer/officer-activities/${activityId}`);
  revalidatePath("/dashboard/class-officer/officer-activities");
  revalidatePath(`/dashboard/class-officer/officer-activities/${activityId}`);

  return {
    ok: true,
    message: "Đăng ký hoạt động thành công.",
  };
  });
}
