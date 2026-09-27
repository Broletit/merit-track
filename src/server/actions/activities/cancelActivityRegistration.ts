"use server";

import { revalidatePath } from "next/cache";
import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

type RegistrationRow = {
  id: number;
  status: string;
  start_at: string;
  registration_end_at: string;
  registration_locked: number;
};

export async function cancelActivityRegistration(activityId: number) {
  const user = await requireStudentContext();
  const db = getDb();
  const registration = db.prepare(
    `SELECT ar.id, ar.status, a.start_at, a.registration_end_at, a.registration_locked
     FROM activity_registrations ar
     INNER JOIN activities a ON a.id = ar.activity_id
     WHERE ar.activity_id = ? AND ar.user_id = ?
     LIMIT 1`
  ).get(activityId, user.id) as RegistrationRow | undefined;

  if (!registration) throw new Error("Bạn chưa đăng ký hoạt động này.");
  if (registration.status !== "registered") {
    throw new Error("Lượt đăng ký hiện không thể hủy.");
  }
  if (registration.registration_locked) {
    throw new Error("Hoạt động đang khóa thay đổi đăng ký.");
  }

  const now = Date.now();
  if (now > new Date(registration.registration_end_at).getTime()) {
    throw new Error("Đã hết thời gian hủy đăng ký.");
  }
  if (now >= new Date(registration.start_at).getTime()) {
    throw new Error("Hoạt động đã bắt đầu nên không thể hủy đăng ký.");
  }

  db.prepare(
    `UPDATE activity_registrations
     SET status = 'cancelled', note = 'Sinh viên chủ động hủy đăng ký'
     WHERE id = ?`
  ).run(registration.id);

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/activities");
  revalidatePath(`/dashboard/student/activities/${activityId}`);
  revalidatePath("/dashboard/admin/activities");

  return { ok: true, message: "Đã hủy đăng ký hoạt động." };
}
