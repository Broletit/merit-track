"use server";

import { assertActivityScope } from "@/server/activities/scopes";
import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function registerActivity(activityId: number) {
  const user = await requireStudentContext();
  const db = getDatabase();
  return db.withTransaction(async () => {

  const activity = (await db.first(`
      SELECT
        id,
        title,
        status,
        audience_type,
        participation_source,
        registration_locked,
        registration_start_at,
        registration_end_at
      FROM activities
      WHERE id = ?
      LIMIT 1
      `, [activityId])) as
    | {
        id: number;
        title: string;
        status: string;
        audience_type: string;
        participation_source: string;
        registration_locked: number;
        registration_start_at: string | null;
        registration_end_at: string | null;
      }
    | undefined;

  if (!activity) {
    throw new Error("Hoạt động không tồn tại.");
  }

  if (activity.status !== "published") {
    throw new Error("Hoạt động chưa được công khai.");
  }

  const now = new Date();

  if (activity.registration_start_at && now < new Date(activity.registration_start_at)) {
    throw new Error("Hoạt động chưa mở đăng ký.");
  }

  if (activity.registration_end_at && now > new Date(activity.registration_end_at)) {
    throw new Error("Hoạt động đã đóng đăng ký.");
  }

  if (activity.audience_type !== "student") {
    throw new Error("Hoạt động này chỉ dành cho cán bộ.");
  }

  const membership = (await db.first(`
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
        AND left_at IS NULL
      ORDER BY id DESC
      LIMIT 1
      `, [user.id])) as { class_id: number } | undefined;

  if (!membership) {
    throw new Error("Tài khoản chưa được gán lớp.");
  }

  (await assertActivityScope(activityId, user.id));
  if (activity.registration_locked) throw new Error("Hoạt động đang được khóa đăng ký bởi quản trị viên.");
  if (activity.participation_source === "external") {
    throw new Error("Hoạt động cấp khoa này đăng ký trên hệ thống của trường.");
  }

  const capacity = await db.first<{max_registrations:number|null}>('SELECT max_registrations FROM activities WHERE id=? FOR UPDATE', [activityId]);
  const count = await db.first<{total:number}>("SELECT COUNT(*) total FROM activity_registrations WHERE activity_id=? AND status<>'cancelled'", [activityId]);
  if (capacity?.max_registrations != null && Number(count?.total) >= capacity.max_registrations) throw new Error("Hoạt động đã đạt số lượng đăng ký tối đa");
  const existed = (await db.first(`
      SELECT id,status
      FROM activity_registrations
      WHERE activity_id = ?
        AND user_id = ?
      LIMIT 1
      `, [activityId, user.id])) as { id: number; status:string } | undefined;

  if (existed && existed.status !== "cancelled") {
    throw new Error("Bạn đã đăng ký hoạt động này rồi.");
  }

  if(existed){
    (await db.execute(`UPDATE activity_registrations SET status='registered',registered_at=CURRENT_TIMESTAMP(3),checked_in_at=NULL,checked_in_by=NULL,note=NULL WHERE id=?`, [existed.id]));
  } else (await db.execute(`
    INSERT INTO activity_registrations (
      activity_id,
      user_id,
      class_id,
      status,
      registered_at,
      checked_in_at,
      checked_in_by,
      note
    )
    VALUES (?, ?, ?, 'registered', CURRENT_TIMESTAMP(3), NULL, NULL, NULL)
    `, [activityId, user.id, membership.class_id]));

  (await db.execute("UPDATE activity_registrations SET role_context='student' WHERE activity_id=? AND user_id=?", [activityId, user.id]));

  revalidatePath("/dashboard/student/activities");
  revalidatePath(`/dashboard/student/activities/${activityId}`);
  revalidatePath("/dashboard/class-officer");
  revalidatePath("/dashboard/faculty-officer");
  revalidatePath("/dashboard/admin/activities");

  return {
    ok: true,
    message: "Đăng ký hoạt động thành công.",
  };
  });
}
