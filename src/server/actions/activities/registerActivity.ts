"use server";

import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function registerActivity(activityId: number) {
  const user = await requireStudentContext();
  const db = getDb();

  const activity = db
    .prepare(
      `
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
      `
    )
    .get(activityId) as
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

  const membership = db
    .prepare(
      `
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
        AND left_at IS NULL
      ORDER BY rowid DESC
      LIMIT 1
      `
    )
    .get(user.id) as { class_id: number } | undefined;

  if (!membership) {
    throw new Error("Tài khoản chưa được gán lớp.");
  }

  const hasScopes = db
    .prepare(`SELECT 1 FROM activity_scopes WHERE activity_id = ? LIMIT 1`)
    .get(activityId);

  if (hasScopes) {
    const isInScope = db
      .prepare(
        `SELECT 1 FROM activity_scopes WHERE activity_id = ? AND class_id = ? LIMIT 1`
      )
      .get(activityId, membership.class_id);

    if (!isInScope) {
      throw new Error("Lớp của bạn không thuộc phạm vi của hoạt động này.");
    }
  }
  if (activity.registration_locked) throw new Error("Hoạt động đang được khóa đăng ký bởi quản trị viên.");
  if (activity.participation_source === "external") {
    throw new Error("Hoạt động cấp khoa này đăng ký trên hệ thống của trường.");
  }

  const existed = db
    .prepare(
      `
      SELECT id,status
      FROM activity_registrations
      WHERE activity_id = ?
        AND user_id = ?
      LIMIT 1
      `
    )
    .get(activityId, user.id) as { id: number; status:string } | undefined;

  if (existed && existed.status !== "cancelled") {
    throw new Error("Bạn đã đăng ký hoạt động này rồi.");
  }

  if(existed){
    db.prepare(`UPDATE activity_registrations SET status='registered',registered_at=datetime('now'),checked_in_at=NULL,checked_in_by=NULL,note=NULL WHERE id=?`).run(existed.id);
  } else db.prepare(
    `
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
    VALUES (?, ?, ?, 'registered', datetime('now'), NULL, NULL, NULL)
    `
  ).run(activityId, user.id, membership.class_id);

  revalidatePath("/dashboard/student/activities");
  revalidatePath(`/dashboard/student/activities/${activityId}`);
  revalidatePath("/dashboard/class-officer");
  revalidatePath("/dashboard/faculty-officer");
  revalidatePath("/dashboard/admin/activities");

  return {
    ok: true,
    message: "Đăng ký hoạt động thành công.",
  };
}
