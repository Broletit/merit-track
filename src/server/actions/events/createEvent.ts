"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";

function toIsoOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text).toISOString() : null;
}

export async function createEvent(formData: FormData) {
  const user = await requireAdminContext();
  const term = getRequiredActiveTerm();
  const db = getDb();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "student").trim();
  const status = String(formData.get("status") ?? "draft").trim();
  const templateId = Number(formData.get("templateId") ?? 0);
  const allowLate = String(formData.get("allowLate") ?? "") === "on" ? 1 : 0;

  const startAt = toIsoOrNull(formData.get("startAt"));
  const endAt = toIsoOrNull(formData.get("endAt"));

  if (!title) throw new Error("Vui lòng nhập tên đợt xét.");
  if (!["student", "officer"].includes(type)) {
    throw new Error("Đối tượng xét không hợp lệ.");
  }
  if (!["draft", "published"].includes(status)) {
    throw new Error("Trạng thái đợt xét không hợp lệ.");
  }
  if (!Number.isFinite(templateId) || templateId <= 0) {
    throw new Error("Vui lòng chọn mẫu tiêu chuẩn.");
  }
  if (!startAt || !endAt) {
    throw new Error("Vui lòng nhập thời gian mở và đóng nộp hồ sơ.");
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Thời gian không hợp lệ.");
  }

  if (start < now) {
    throw new Error("Thời gian mở nộp không được ở quá khứ.");
  }

  if (end <= start) {
    throw new Error("Thời gian đóng nộp phải sau thời gian mở nộp.");
  }

  const template = db
    .prepare(
      `
      SELECT id, for_type
      FROM criteria_templates
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(templateId) as { id: number; for_type: string } | undefined;

  if (!template) throw new Error("Mẫu tiêu chuẩn không tồn tại.");

  if (template.for_type !== type) {
    throw new Error("Mẫu tiêu chuẩn không phù hợp với đối tượng xét.");
  }

  db.prepare(
    `
    INSERT INTO events (
      title,
      description,
      type,
      status,
      start_at,
      end_at,
      allow_late,
      created_by,
      created_at,
      published_at,
      criteria_template_id,
      term_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'),
      CASE WHEN ? = 'published' THEN datetime('now') ELSE NULL END,
      ?, ?
    )
    `
  ).run(
    title,
    description || null,
    type,
    status,
    startAt,
    endAt,
    allowLate,
    user.id,
    status,
    templateId,
    term.id
  );

  revalidatePath("/dashboard/admin/events");
  revalidatePath("/dashboard/admin/events/create");

  return {
    ok: true,
    message: `Tạo đợt xét thành công cho ${term.name}.`,
  };
}
