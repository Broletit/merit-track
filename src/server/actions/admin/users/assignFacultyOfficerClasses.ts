"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function assignFacultyOfficerClasses(
  facultyOfficerId: number,
  formData: FormData
) {
  await requireAdminContext();

  const db = getDb();

  const selected = [...new Set(formData
    .getAll("classIds")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0))];

  const officer = db
    .prepare(
      `
      SELECT id, role, full_name
      FROM users
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(facultyOfficerId) as
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
    ? (db.prepare(`SELECT id FROM classes WHERE is_active=1 AND id IN (${selected.map(() => "?").join(",")})`).all(...selected) as Array<{ id: number }>).map((item) => Number(item.id))
    : [];

  if (validClassIds.length !== selected.length) {
    throw new Error("Danh sách lớp phân công có lớp không hợp lệ hoặc đã ngừng hoạt động.");
  }

  const currentClassIds = (db.prepare(
    `SELECT class_id FROM faculty_class_assignments WHERE faculty_officer_id=? ORDER BY class_id`
  ).all(facultyOfficerId) as Array<{ class_id: number }>).map((item) => Number(item.class_id));
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

  const tx = db.transaction(() => {
    db.prepare(
      `
      DELETE FROM faculty_class_assignments
      WHERE faculty_officer_id = ?
      `
    ).run(facultyOfficerId);

    const stmt = db.prepare(
      `
      INSERT INTO faculty_class_assignments (
        faculty_officer_id,
        class_id,
        assigned_at
      )
      VALUES (?, ?, datetime('now'))
      `
    );

    for (const classId of validClassIds) {
      stmt.run(facultyOfficerId, classId);
    }
  });

  tx();

  revalidatePath(`/dashboard/admin/users/${facultyOfficerId}`);
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/faculty-officer");

  return {
    ok: true,
    changed: true,
    message: `Đã cập nhật ${selected.length} lớp quản lý.`,
  };
}
