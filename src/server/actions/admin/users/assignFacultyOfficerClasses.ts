"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function assignFacultyOfficerClasses(
  facultyOfficerId: number,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDatabase();

  const selected = [...new Set(formData
    .getAll("classIds")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0))];

  const officer = (await db.first(`
      SELECT id, role, full_name
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [facultyOfficerId])) as
    | {
        id: number;
        role: string;
        full_name: string;
      }
    | undefined;

  if (!officer) {
    throw new Error("Không tìm thấy cán bộ khoa.");
  }

  if (officer.role !== "faculty_officer") {
    throw new Error("Người dùng không phải cán bộ khoa.");
  }

  const validClassIds = selected.length
    ? ((await db.rows(`SELECT id FROM classes WHERE is_active=1 AND id IN (${selected.map(() => "?").join(",")})`, [...selected])) as Array<{ id: number }>).map((item) => Number(item.id))
    : [];

  if (validClassIds.length !== selected.length) {
    throw new Error("Danh sách lớp phân công có lớp không hợp lệ hoặc đã ngừng hoạt động.");
  }

  const currentClassIds = ((await db.rows(`SELECT class_id FROM faculty_class_assignments WHERE faculty_officer_id=? ORDER BY class_id`, [facultyOfficerId])) as Array<{ class_id: number }>).map((item) => Number(item.class_id));
  const nextClassIds = [...validClassIds].sort((a, b) => a - b);
  const unchanged = currentClassIds.length === nextClassIds.length
    && currentClassIds.every((id, index) => id === nextClassIds[index]);

  if (unchanged) {
    return {
      ok: false,
      changed: false,
      message: "Bạn chưa thêm, bỏ hoặc thay đổi lớp quản lý nào.",
    };
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
      DELETE FROM faculty_class_assignments
      WHERE faculty_officer_id = ?
      `, [facultyOfficerId]));

    

    for (const classId of validClassIds) {
      (await db.execute(`
      INSERT INTO faculty_class_assignments (
        faculty_officer_id,
        class_id,
        assigned_at
      )
      VALUES (?, ?, CURRENT_TIMESTAMP(3))
      `, [facultyOfficerId, classId]));
    }
  })));

  (await tx());

  revalidatePath(`/dashboard/admin/users/${facultyOfficerId}`);
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/faculty-officer");

  return {
    ok: true,
    changed: true,
    message: `Đã cập nhật ${selected.length} lớp quản lý.`,
  };
}
