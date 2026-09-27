"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function updateFacultyClassAssignments(
  facultyOfficerId: number,
  formData: FormData
) {
  await requireAdminContext();

  const classIds = formData
    .getAll("classIds")
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);

  const db = getDb();

  const user = db
    .prepare(
      `
      SELECT id, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(facultyOfficerId) as { id: number; role: string } | undefined;

  if (!user) throw new Error("Không tìm thấy tài khoản.");

  if (user.role !== "faculty_officer") {
    throw new Error("Chỉ có thể phân công lớp cho cán bộ khoa.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
      DELETE FROM faculty_class_assignments
      WHERE faculty_officer_id = ?
      `
    ).run(facultyOfficerId);

    const insert = db.prepare(
      `
      INSERT OR IGNORE INTO faculty_class_assignments (
        faculty_officer_id,
        class_id,
        assigned_at
      )
      VALUES (?, ?, datetime('now'))
      `
    );

    for (const classId of classIds) {
      insert.run(facultyOfficerId, classId);
    }
  });

  tx();

  revalidatePath("/dashboard/admin/users");
  revalidatePath(`/dashboard/admin/users/${facultyOfficerId}`);

  return {
    ok: true,
    message: "Đã cập nhật phân công lớp cho Cán Bộ Khoa.",
  };
}