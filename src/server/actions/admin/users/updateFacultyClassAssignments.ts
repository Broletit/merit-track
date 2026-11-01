"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function updateFacultyClassAssignments(
  facultyOfficerId: number,
  formData: FormData
) {
  await requireAdminContext();

  const classIds = formData
    .getAll("classIds")
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);

  const db = getDatabase();

  const user = (await db.first(`
      SELECT id, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [facultyOfficerId])) as { id: number; role: string } | undefined;

  if (!user) throw new Error("Không tìm thấy tài khoản.");

  if (user.role !== "faculty_officer") {
    throw new Error("Chỉ có thể phân công lớp cho cán bộ khoa.");
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
      DELETE FROM faculty_class_assignments
      WHERE faculty_officer_id = ?
      `, [facultyOfficerId]));

    

    for (const classId of classIds) {
      (await db.execute(`
      INSERT IGNORE INTO faculty_class_assignments (
        faculty_officer_id,
        class_id,
        assigned_at
      )
      VALUES (?, ?, CURRENT_TIMESTAMP(3))
      `, [facultyOfficerId, classId]));
    }
  })));

  (await tx());

  revalidatePath("/dashboard/admin/users");
  revalidatePath(`/dashboard/admin/users/${facultyOfficerId}`);

  return {
    ok: true,
    message: "Đã cập nhật phân công lớp cho Cán Bộ Khoa.",
  };
}