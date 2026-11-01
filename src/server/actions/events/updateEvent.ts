"use server";

import { restoreDeadlineFinalizedSubmissions } from "@/server/submissions/restoreDeadlineFinalizedSubmissions";
import { assertTemplateReady } from "@/server/criteria-templates/groupRequirements";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

function toIsoOrNull(value: FormDataEntryValue | null, original: string) {
  const text = String(value ?? "").trim();
  if(!text)return null;
  const date=new Date(text),previous=new Date(original);
  // datetime-local displays minutes; an unchanged field must retain stored seconds/milliseconds.
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text) && Math.floor(date.getTime()/60000)===Math.floor(previous.getTime()/60000))return original;
  return date.toISOString();
}

type EventRow = {
  title: string;
  id: number;
  type: string;
  status: string;
  description: string | null;
  start_at: string;
  end_at: string;
  allow_late: number;
  criteria_template_id: number | null;
  score_max: number | null;
  submissions: number;
  is_active: number;
};

export async function updateEvent(eventId: number, formData: FormData) {
  const admin=await requireAdminContext();

  const db = getDatabase();

  const event = (await db.first(`
      SELECT
        e.id,
        e.title,
        e.type,
        e.status,
        e.description,
        e.start_at,
        e.end_at,
        e.allow_late,
        e.criteria_template_id,
        e.score_max,
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
      `, [eventId])) as EventRow | undefined;

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

  const requestedScoreMax = Number(formData.get("scoreMax") ?? 0);

  const requestedStartAt = toIsoOrNull(formData.get("startAt"),event.start_at);
  const requestedEndAt = toIsoOrNull(formData.get("endAt"),event.end_at);
  const type = isInUse ? event.type : requestedType;
  const status = isInUse ? event.status : requestedStatus;
  const allowLate = 0; // Legacy database column; closing time is authoritative.
  const templateId = isInUse
    ? Number(event.criteria_template_id ?? 0)
    : requestedTemplateId;
  const startAt = isInUse ? event.start_at : requestedStartAt;
  const endAt = requestedEndAt;
  const scoreMax = type === "officer"
    ? (isInUse ? Number(event.score_max ?? 0) : requestedScoreMax)
    : null;

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

  const changed=title!==String(event.title??"").trim()
    || description!==String(event.description??"").trim()
    || type!==event.type || status!==event.status
    || templateId!==Number(event.criteria_template_id??0)
    || start.getTime()!==oldStart.getTime() || end.getTime()!==oldEnd.getTime()
    || (type==="officer" && Number(scoreMax)!==Number(event.score_max??0));
  if(!changed)throw new Error("Bạn chưa thay đổi thông tin nào.");

  if (end <= start) {
    throw new Error("Thời gian đóng nộp phải sau thời gian mở nộp.");
  }
  if (type === "officer" && (!Number.isFinite(scoreMax) || Number(scoreMax) <= 0)) {
    throw new Error("Vui lòng nhập điểm tối đa lớn hơn 0 cho đợt xét cán bộ.");
  }

  if (isInUse && end < oldEnd) {
    throw new Error("Đợt xét đang được sử dụng chỉ được phép kéo dài, không được rút ngắn thời gian đóng nộp.");
  }

  const template = (await db.first(`
      SELECT id, for_type
      FROM criteria_templates
      WHERE id = ?
      LIMIT 1
      `, [templateId])) as { id: number; for_type: string } | undefined;

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

  if (status === "published" && !isInUse) (await assertTemplateReady(db, templateId));

  (await (async () => (await db.withTransaction(async ()=>{
  (await db.execute(`
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
        WHEN ? = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP(3)
        ELSE published_at
      END,
      closed_at = CASE
        WHEN ? = 'closed' THEN CURRENT_TIMESTAMP(3)
        ELSE closed_at
      END,
      criteria_template_id = ?,
      score_max = ?
    WHERE id = ?
    `, [title, description || null, type, status, startAt, endAt, allowLate, status, status, templateId, scoreMax, eventId]));

  if(status==="published" && end>oldEnd && end>now)(await restoreDeadlineFinalizedSubmissions(db,eventId,admin.id));
  })))());

  revalidatePath("/dashboard/admin/events");
  revalidatePath(`/dashboard/admin/events/${eventId}`);
  revalidatePath(`/dashboard/admin/events/${eventId}/edit`);
  revalidatePath("/dashboard","layout");

  return {
    ok: true,
    message: end>oldEnd
      ? "Đã cập nhật đợt xét và gia hạn thời gian đóng nộp."
      : "Cập nhật đợt xét thành công.",
  };
}
