"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

function toIsoOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text).toISOString() : null;
}

type EventRow = {
  id: number;
  type: string;
  status: string;
  description: string | null;
  start_at: string;
  end_at: string;
  allow_late: number;
  criteria_template_id: number | null;
  submissions: number;
  is_active: number;
};

export async function updateEvent(eventId: number, formData: FormData) {
  await requireAdminContext();

  const db = getDb();

  const event = db
    .prepare(
      `
      SELECT
        e.id,
        e.type,
        e.status,
        e.description,
        e.start_at,
        e.end_at,
        e.allow_late,
        e.criteria_template_id,
        at.is_active,
        (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.event_id = e.id
        ) AS submissions
      FROM events e
      INNER JOIN academic_terms at ON at.id = e.term_id
      WHERE e.id = ?
      LIMIT 1
      `
    )
    .get(eventId) as EventRow | undefined;

  if (!event) {
    throw new Error("Đợt xét không tồn tại.");
  }
  if (!event.is_active) throw new Error("Không thể chỉnh sửa đợt xét thuộc học kỳ không hiện hành.");

  const isInUse = Number(event.submissions ?? 0) > 0 || event.status !== "draft";

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requestedType = String(formData.get("type") ?? "student").trim();
  const requestedStatus = String(formData.get("status") ?? "draft").trim();
  const requestedTemplateId = Number(formData.get("templateId") ?? 0);
  const requestedAllowLate = String(formData.get("allowLate") ?? "") === "on" ? 1 : 0;

  const requestedStartAt = toIsoOrNull(formData.get("startAt"));
  const requestedEndAt = toIsoOrNull(formData.get("endAt"));
  const type = isInUse ? event.type : requestedType;
  const status = isInUse ? event.status : requestedStatus;
  const allowLate = requestedAllowLate;
  const templateId = isInUse
    ? Number(event.criteria_template_id ?? 0)
    : requestedTemplateId;
  const startAt = isInUse ? event.start_at : requestedStartAt;
  const endAt = requestedEndAt;

  if (!title) throw new Error("Vui lòng nhập tên đợt xét.");

  if (!["student", "officer"].includes(type)) {
    throw new Error("Đối tượng xét không hợp lệ.");
  }

  if (!["draft", "published", "closed"].includes(status)) {
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
  const oldStart = new Date(event.start_at);
  const oldEnd = new Date(event.end_at);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Thời gian không hợp lệ.");
  }

  if (end <= start) {
    throw new Error("Thời gian đóng nộp phải sau thời gian mở nộp.");
  }

  if (isInUse && end < oldEnd) {
    throw new Error("Đợt xét đang được sử dụng chỉ được phép kéo dài, không được rút ngắn thời gian đóng nộp.");
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

  if (!template) {
    throw new Error("Mẫu tiêu chuẩn không tồn tại.");
  }

  if (template.for_type !== type) {
    throw new Error("Mẫu tiêu chuẩn không phù hợp với đối tượng xét.");
  }

  if (!isInUse) {
    if (oldStart > now && start < now) {
      throw new Error("Thời gian mở nộp không được ở quá khứ.");
    }
  }

  db.prepare(
    `
    UPDATE events
    SET
      title = ?,
      description = ?,
      type = ?,
      status = ?,
      start_at = ?,
      end_at = ?,
      allow_late = ?,
      published_at = CASE
        WHEN ? = 'published' AND published_at IS NULL THEN datetime('now')
        ELSE published_at
      END,
      closed_at = CASE
        WHEN ? = 'closed' THEN datetime('now')
        ELSE closed_at
      END,
      criteria_template_id = ?
    WHERE id = ?
    `
  ).run(
    title,
    description || null,
    type,
    status,
    startAt,
    endAt,
    allowLate,
    status,
    status,
    templateId,
    eventId
  );

  revalidatePath("/dashboard/admin/events");
  revalidatePath(`/dashboard/admin/events/${eventId}`);
  revalidatePath(`/dashboard/admin/events/${eventId}/edit`);

  return {
    ok: true,
    message: isInUse
      ? "Đã cập nhật đợt xét. Đối tượng, bộ tiêu chuẩn và thời gian mở được giữ nguyên; thời gian đóng và quy định nộp trễ đã được cập nhật theo lựa chọn."
      : "Cập nhật đợt xét thành công.",
  };
}
