"use server";

import { assertSameClassCohort } from "@/server/cohorts/classCohortIntegrity";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/server/db/mysql";
import { hashPasswordSync } from "@/server/auth/password";
import { requireAdminContext } from "@/server/auth/guards";

export async function transferStudentClass(studentId: number, targetClassId: number) {
  await requireAdminContext();
  if (!Number.isSafeInteger(studentId) || studentId <= 0 || !Number.isSafeInteger(targetClassId) || targetClassId <= 0) throw new Error("Sinh viên hoặc lớp không hợp lệ.");
  const db = getDatabase();
  (await assertSameClassCohort(db,studentId,targetClassId));

  const student = (await db.first(`
      SELECT id, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [studentId])) as { id: number; role: string } | undefined;

  if (!student) {
    throw new Error("Không tìm thấy sinh viên.");
  }

  if (student.role !== "student") {
    throw new Error("Chỉ hỗ trợ chuyển lớp cho tài khoản sinh viên.");
  }

  const targetClass = (await db.first(`
      SELECT id
      FROM classes
      WHERE id = ?
      LIMIT 1
      `, [targetClassId])) as { id: number } | undefined;

  if (!targetClass) {
    throw new Error("Lớp đích không tồn tại.");
  }

  const currentMembership = (await db.first(`
      SELECT class_id
      FROM class_members
      WHERE user_id = ? AND left_at IS NULL
      LIMIT 1
      `, [studentId])) as { class_id: number } | undefined;

  if (currentMembership && Number(currentMembership.class_id) === Number(targetClassId)) {
    return { ok: true, changed: false };
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await assertSameClassCohort(db,studentId,targetClassId));
    (await db.execute(`
      UPDATE class_members SET left_at=CURRENT_TIMESTAMP(3)
      WHERE user_id = ? AND left_at IS NULL
      `, [studentId]));

    (await db.execute(`
      INSERT INTO class_members (class_id, user_id, joined_at)
      VALUES (?, ?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE joined_at=CURRENT_TIMESTAMP(3),left_at=NULL
      `, [targetClassId, studentId]));
  })));

  (await tx());

  revalidatePath("/dashboard/admin/students");
  revalidatePath(`/dashboard/admin/students/${studentId}`);
  revalidatePath("/dashboard/admin/students-import");
  revalidatePath("/dashboard/class-officer");
  revalidatePath("/dashboard/faculty-officer");

  return { ok: true, changed: true };
}

export async function resetStudentPassword(studentId: number) {
  await requireAdminContext();
  if (!Number.isSafeInteger(studentId) || studentId <= 0) throw new Error("Sinh viên không hợp lệ.");
  const db = getDatabase();

  const student = (await db.first(`
      SELECT id, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [studentId])) as { id: number; role: string } | undefined;

  if (!student) {
    throw new Error("Không tìm thấy sinh viên.");
  }

  if (student.role !== "student") {
    throw new Error("Chỉ hỗ trợ đặt lại mật khẩu cho tài khoản sinh viên.");
  }

  const passwordHash = hashPasswordSync("1111");

  (await (async () => (await db.withTransaction(async () => {
  (await db.execute(`
    UPDATE users
    SET
      password_hash = ?,
      must_change_pw = 1,
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    `, [passwordHash, studentId]));
  (await db.execute("UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND revoked_at IS NULL", [studentId]));
  })))());

  revalidatePath("/dashboard/admin/students");
  revalidatePath(`/dashboard/admin/students/${studentId}`);

  return { ok: true };
}
