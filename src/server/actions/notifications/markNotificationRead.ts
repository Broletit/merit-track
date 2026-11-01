"use server";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function markNotificationRead(notificationId: number) {
  const user = await requireLogin();
  (await getDatabase().execute(`UPDATE notifications
     SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
     WHERE id = ? AND user_id = ? AND role_context = ?`, [notificationId, user.id, user.loginContext ?? "student"]));
  revalidatePath("/dashboard/student/notifications");
  revalidatePath("/dashboard/class-officer/notifications");
  revalidatePath("/dashboard/faculty-officer/notifications");
  revalidatePath("/dashboard/admin/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await requireLogin();
  (await getDatabase().execute(`UPDATE notifications
     SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
     WHERE user_id = ? AND role_context = ? AND is_read = 0`, [user.id, user.loginContext ?? "student"]));
  revalidatePath("/dashboard/student/notifications");
  revalidatePath("/dashboard/class-officer/notifications");
  revalidatePath("/dashboard/faculty-officer/notifications");
  revalidatePath("/dashboard/admin/notifications");
  return { ok: true, message: "Đã đánh dấu tất cả thông báo là đã đọc." };
}
