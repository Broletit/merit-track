"use server";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function markNotificationRead(notificationId: number) {
  const user = await requireLogin();
  getDb().prepare(
    `UPDATE notifications
     SET is_read = 1, read_at = COALESCE(read_at, datetime('now'))
     WHERE id = ? AND user_id = ?`
  ).run(notificationId, user.id);
  revalidatePath("/dashboard/student/notifications");
  revalidatePath("/dashboard/class-officer/notifications");
  revalidatePath("/dashboard/faculty-officer/notifications");
  revalidatePath("/dashboard/admin/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await requireLogin();
  getDb().prepare(
    `UPDATE notifications
     SET is_read = 1, read_at = COALESCE(read_at, datetime('now'))
     WHERE user_id = ? AND is_read = 0`
  ).run(user.id);
  revalidatePath("/dashboard/student/notifications");
  revalidatePath("/dashboard/class-officer/notifications");
  revalidatePath("/dashboard/faculty-officer/notifications");
  revalidatePath("/dashboard/admin/notifications");
  return { ok: true, message: "Đã đánh dấu tất cả thông báo là đã đọc." };
}
