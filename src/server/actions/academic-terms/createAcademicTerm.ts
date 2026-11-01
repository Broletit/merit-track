"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

function toIso(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return new Date(text).toISOString();
}

export async function createAcademicTerm(formData: FormData) {
  await requireAdminContext();

  const db = getDatabase();

  const academicYear = String(formData.get("academicYear") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const startAt = toIso(formData.get("startAt"));
  const endAt = toIso(formData.get("endAt"));

  if (!academicYear) throw new Error("Vui lòng nhập năm học.");
  if (!semester) throw new Error("Vui lòng nhập học kỳ.");
  if (!name) throw new Error("Vui lòng nhập tên học kỳ.");
  if (!startAt || !endAt) throw new Error("Vui lòng nhập thời gian bắt đầu và kết thúc.");

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Thời gian không hợp lệ.");
  }

  if (end <= start) {
    throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
  }

  (await db.execute(`
    INSERT INTO academic_terms (
      academic_year,
      semester,
      name,
      start_at,
      end_at,
      is_active,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP(3))
    `, [academicYear, semester, name, startAt, endAt]));

  revalidatePath("/dashboard/admin/academic-terms");

  return {
    ok: true,
    message: "Tạo học kỳ thành công.",
  };
}