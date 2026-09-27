"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";
import { assertDateRangeInsideTerm } from "@/server/academic-terms/getAcademicTermForView";

function toIsoOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text).toISOString() : null;
}

export async function createActivity(formData: FormData) {
  const user = await requireAdminContext();
  const term = getRequiredActiveTerm();
  const db = getDb();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requestedAudienceType = String(formData.get("audienceType") ?? "student").trim();
  const audienceType = requestedAudienceType === "all" ? "student" : requestedAudienceType;
  const status = String(formData.get("status") ?? "draft").trim();
  const conductScore = Number(formData.get("conductScore") ?? 0);
  const organizerLevel = String(formData.get("organizerLevel") ?? "class");
  const participationSource = organizerLevel === "class" ? "internal" : "external";
  const selectedClassIds = formData.getAll("classIds").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const conductCategoryId = Number(formData.get("conductCategoryId") ?? 0) || null;
  const qrCheckinEnabled =
    String(formData.get("qrCheckinEnabled") ?? "") === "on" ? 1 : 0;

  const startAt = toIsoOrNull(formData.get("startAt"));
  const endAt = toIsoOrNull(formData.get("endAt"));
  const registrationStartAt = toIsoOrNull(formData.get("registrationStartAt"));
  const registrationEndAt = toIsoOrNull(formData.get("registrationEndAt"));

  if (!title) throw new Error("Vui lòng nhập tên hoạt động.");
  if (!description) throw new Error("Vui lòng nhập mô tả hoạt động.");
  if (!["student", "officer"].includes(audienceType)) {
    throw new Error("Đối tượng hoạt động không hợp lệ.");
  }
  if (!["draft", "published"].includes(status)) {
    throw new Error("Trạng thái hoạt động không hợp lệ.");
  }
  if (!Number.isFinite(conductScore) || conductScore < 0) {
    throw new Error("Điểm rèn luyện không hợp lệ.");
  }
  if (conductCategoryId) {
    const category=db.prepare(`SELECT score_max FROM conduct_score_categories WHERE id=? AND term_id=?`).get(conductCategoryId,term.id) as {score_max:number}|undefined;
    if(!category) throw new Error("Mục trong Khung tiêu chuẩn ĐRL không hợp lệ.");
    if(conductScore>Number(category.score_max)) throw new Error("Điểm của hoạt động không được lớn hơn điểm tối đa của mục đã chọn.");
  }
  const duplicateActivity=db.prepare(`SELECT a.id,c.code category_code,c.name category_name,at.name term_name FROM activities a LEFT JOIN conduct_score_categories c ON c.id=a.conduct_category_id LEFT JOIN academic_terms at ON at.id=a.term_id WHERE a.term_id=? AND LOWER(TRIM(a.title))=LOWER(TRIM(?)) LIMIT 1`).get(term.id,title) as {id:number;category_code:string|null;category_name:string|null;term_name:string|null}|undefined;
  if(duplicateActivity){const category=duplicateActivity.category_name?`mục “${duplicateActivity.category_code}. ${duplicateActivity.category_name}”`:"hoạt động không thuộc mục điểm";throw new Error(`Tên hoạt động đã tồn tại trong học kỳ ${duplicateActivity.term_name??term.name}, tại ${category}. Tên hoạt động không được trùng trong cùng học kỳ.`);}
  if (!["class", "faculty"].includes(organizerLevel)) throw new Error("Cấp tổ chức không hợp lệ.");
  if (organizerLevel === "class" && selectedClassIds.length !== 1) throw new Error("Vui lòng chọn đúng một chi đoàn tổ chức hoạt động.");
  if (!startAt || !endAt || !registrationStartAt || !registrationEndAt) {
    throw new Error("Vui lòng nhập đầy đủ thời gian.");
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  const regStart = new Date(registrationStartAt);
  const regEnd = new Date(registrationEndAt);
  const now = new Date();

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    Number.isNaN(regStart.getTime()) ||
    Number.isNaN(regEnd.getTime())
  ) {
    throw new Error("Thời gian không hợp lệ.");
  }

  if (regStart < now) {
    throw new Error("Thời gian mở đăng ký không được ở quá khứ.");
  }

  if (regEnd <= regStart) {
    throw new Error("Thời gian đóng đăng ký phải sau thời gian mở đăng ký.");
  }

  if (start <= regEnd) {
    throw new Error("Thời gian diễn ra hoạt động phải sau thời gian đóng đăng ký.");
  }

  if (end <= start) {
    throw new Error("Thời gian kết thúc hoạt động phải sau thời gian bắt đầu.");
  }

  assertDateRangeInsideTerm({
    startAt: registrationStartAt,
    endAt: registrationEndAt,
    termStartAt: term.startAt,
    termEndAt: term.endAt,
    label: "Thời gian đăng ký",
  });

  assertDateRangeInsideTerm({
    startAt,
    endAt,
    termStartAt: term.startAt,
    termEndAt: term.endAt,
    label: "Thời gian diễn ra hoạt động",
  });

  const tx = db.transaction(() => {
  const created = db.prepare(
    `
    INSERT INTO activities (
      title, description, audience_type, status,
      start_at, end_at, registration_start_at, registration_end_at,
      checkin_start_at, checkin_end_at,
      conduct_score, attendance_mode, qr_checkin_enabled,
      created_by, created_at, published_at, term_id, organizer_level, participation_source, conduct_category_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'qr', ?, ?, datetime('now'),
      CASE WHEN ? = 'published' THEN datetime('now') ELSE NULL END,
      ?, ?, ?, ?
    )
    `
  ).run(
    title,
    description,
    audienceType,
    status,
    startAt,
    endAt,
    registrationStartAt,
    registrationEndAt,
    startAt,
    endAt,
    conductScore,
    qrCheckinEnabled,
    user.id,
    status,
    term.id,
    organizerLevel,
    participationSource,
    conductCategoryId
  );
  const activityId = Number(created.lastInsertRowid);
  if (organizerLevel === "class") {
    db.prepare(`INSERT INTO activity_scopes(activity_id,class_id) VALUES(?,?)`).run(activityId, selectedClassIds[0]);
  }
  });
  tx();

  revalidatePath("/dashboard/admin/activities");
  revalidatePath("/dashboard/admin/activities/create");

  return {
    ok: true,
    message: `Tạo hoạt động thành công cho ${term.name}.`,
  };
}
