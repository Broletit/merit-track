"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db/sqlite";
import { hashPasswordSync } from "@/server/auth/password";

export async function transferStudentClass(studentId: number, targetClassId: number) {
  const db = getDb();

  const student = db
    .prepare(
      `
      SELECT id, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(studentId) as { id: number; role: string } | undefined;

  if (!student) {
    throw new Error("Không tìm thấy sinh viên.");
  }

  if (student.role !== "student") {
    throw new Error("Chỉ hỗ trợ chuyển lớp cho tài khoản sinh viên.");
  }

  const targetClass = db
    .prepare(
      `
      SELECT id
      FROM classes
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(targetClassId) as { id: number } | undefined;

  if (!targetClass) {
    throw new Error("Lớp đích không tồn tại.");
  }

  const currentMembership = db
    .prepare(
      `
      SELECT class_id
      FROM class_members
      WHERE user_id = ?
      LIMIT 1
      `
    )
    .get(studentId) as { class_id: number } | undefined;

  if (currentMembership && Number(currentMembership.class_id) === Number(targetClassId)) {
    return { ok: true, changed: false };
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
      DELETE FROM class_members
      WHERE user_id = ?
      `
    ).run(studentId);

    db.prepare(
      `
      INSERT INTO class_members (class_id, user_id, joined_at)
      VALUES (?, ?, datetime('now'))
      `
    ).run(targetClassId, studentId);
  });

  tx();

  revalidatePath("/dashboard/admin/students");
  revalidatePath(`/dashboard/admin/students/${studentId}`);
  revalidatePath("/dashboard/admin/students-import");
  revalidatePath("/dashboard/class-officer");
  revalidatePath("/dashboard/faculty-officer");

  return { ok: true, changed: true };
}

export async function resetStudentPassword(studentId: number) {
  const db = getDb();

  const student = db
    .prepare(
      `
      SELECT id, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(studentId) as { id: number; role: string } | undefined;

  if (!student) {
    throw new Error("Không tìm thấy sinh viên.");
  }

  if (student.role !== "student") {
    throw new Error("Chỉ hỗ trợ đặt lại mật khẩu cho tài khoản sinh viên.");
  }

  const passwordHash = hashPasswordSync("1111");

  db.prepare(
    `
    UPDATE users
    SET
      password_hash = ?,
      must_change_pw = 1,
      updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(passwordHash, studentId);

  revalidatePath("/dashboard/admin/students");
  revalidatePath(`/dashboard/admin/students/${studentId}`);

  return { ok: true };
}