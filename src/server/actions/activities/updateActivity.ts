"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { validateActivityTime } from "@/server/actions/validators/activityValidator";

function toIsoOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text).toISOString() : null;
}

function toInt(value: FormDataEntryValue | null, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

export async function updateActivity(activityId: number, formData: FormData) {
  await requireAdminContext();
  const db = getDb();

  const activity = db
    .prepare(
      `
      SELECT a.*, at.is_active,
        CASE WHEN datetime(a.start_at) <= datetime('now') THEN 1 ELSE 0 END AS has_started,
        (SELECT COUNT(*) FROM activity_registrations ar
          WHERE ar.activity_id = a.id AND ar.status != 'cancelled') AS participant_count,
        (SELECT COUNT(*) FROM activity_registrations ar
          WHERE ar.activity_id = a.id AND ar.status = 'attended') AS attended_count
      FROM activities a
      INNER JOIN academic_terms at ON at.id = a.term_id
      WHERE a.id = ?
      LIMIT 1
      `
    )
    .get(activityId) as {
      id: number; status: string; is_active: number; title: string; description: string;
      audience_type: string; start_at: string; end_at: string; registration_start_at: string;
      registration_end_at: string; conduct_score: number; qr_checkin_enabled: number;
      conduct_category_id: number | null;
      term_id: number;
      has_started: number; participant_count: number; attended_count: number;
    } | undefined;

  if (!activity) {
    throw new Error("Hoạt động không tồn tại.");
  }
  if (!activity.is_active) throw new Error("Không thể chỉnh sửa hoạt động thuộc học kỳ không hiện hành.");

  if (activity.status === "closed") {
    throw new Error("Hoạt động đã đóng, không thể chỉnh sửa.");
  }

  const participantCount = Number(activity.participant_count ?? 0);
  const attendedCount = Number(activity.attended_count ?? 0);
  const editMode =
    activity.status === "draft" && participantCount === 0
      ? "full"
      : participantCount === 0 && !activity.has_started
      ? "full"
      : !activity.has_started && attendedCount === 0
        ? "limited"
        : "extension";

  const requestedTitle = String(formData.get("title") ?? activity.title).trim();
  const requestedDescription = String(formData.get("description") ?? activity.description).trim();
  const requestedAudienceType = String(formData.get("audienceType") ?? activity.audience_type).trim();

  const requestedRegistrationStartAt = toIsoOrNull(formData.get("registrationStartAt"));
  const requestedRegistrationEndAt = toIsoOrNull(formData.get("registrationEndAt"));
  const requestedStartAt = toIsoOrNull(formData.get("startAt"));
  const requestedEndAt = toIsoOrNull(formData.get("endAt"));

  const requestedConductScore = toInt(formData.get("conductScore"), activity.conduct_score);
  const requestedConductCategoryId = Number(formData.get("conductCategoryId") ?? 0) || null;
  const requestedQrCheckinEnabled = String(formData.get("qrCheckinEnabled") ?? "") === "on" ? 1 : 0;

  const title = editMode === "extension" ? activity.title : requestedTitle;
  const description = editMode === "extension" ? activity.description : requestedDescription;
  const audienceType = editMode === "full" ? requestedAudienceType : activity.audience_type;
  const registrationStartAt = editMode === "full" ? requestedRegistrationStartAt : activity.registration_start_at;
  const registrationEndAt = editMode === "extension" ? activity.registration_end_at : requestedRegistrationEndAt;
  const startAt = editMode === "full" ? requestedStartAt : activity.start_at;
  const endAt = requestedEndAt;
  const conductScore = editMode === "full" ? requestedConductScore : activity.conduct_score;
  const conductCategoryId = editMode === "full" ? requestedConductCategoryId : activity.conduct_category_id;
  const qrCheckinEnabled = editMode === "full" ? requestedQrCheckinEnabled : activity.qr_checkin_enabled;
  const attendanceMode = qrCheckinEnabled ? "qr" : "manual";

  const scopeMode = String(formData.get("scopeMode") ?? "all").trim();
  const selectedClassIds = formData
    .getAll("classIds")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  const criteriaBindings = formData
    .getAll("criteriaBindings")
    .map((value) => String(value))
    .filter(Boolean);

  if (!title) throw new Error("Vui lòng nhập tên hoạt động.");
  if (!description) throw new Error("Vui lòng nhập mô tả hoạt động.");

  if(editMode!=="extension"){
    const duplicate=db.prepare(`SELECT a.id,c.code category_code,c.name category_name,at.name term_name FROM activities a LEFT JOIN conduct_score_categories c ON c.id=a.conduct_category_id LEFT JOIN academic_terms at ON at.id=a.term_id WHERE a.term_id=(SELECT term_id FROM activities WHERE id=?) AND a.id<>? AND LOWER(TRIM(a.title))=LOWER(TRIM(?)) LIMIT 1`).get(activityId,activityId,title) as {id:number;category_code:string|null;category_name:string|null;term_name:string|null}|undefined;
    if(duplicate){const category=duplicate.category_name?`mục “${duplicate.category_code}. ${duplicate.category_name}”`:"hoạt động không thuộc mục điểm";throw new Error(`Tên hoạt động đã tồn tại trong học kỳ ${duplicate.term_name??"hiện tại"}, tại ${category}. Tên hoạt động không được trùng trong cùng học kỳ.`);}
  }

  if (!["student", "officer"].includes(audienceType)) {
    throw new Error("Đối tượng tham gia không hợp lệ.");
  }

  if (conductScore < 0) {
    throw new Error("Điểm rèn luyện không được âm.");
  }

  if (!registrationStartAt || !registrationEndAt || !startAt || !endAt) {
    throw new Error("Vui lòng nhập đầy đủ thời gian.");
  }

  validateActivityTime({
    registrationStartAt,
    registrationEndAt,
    startAt,
    endAt,
    allowPastRegistrationStart: true,
  });

  if (editMode !== "full" && new Date(registrationEndAt).getTime() < new Date(activity.registration_end_at).getTime()) {
    throw new Error("Chỉ được kéo dài thời gian đóng đăng ký, không được rút ngắn.");
  }

  if (conductCategoryId) {
    const category = db.prepare(`
      SELECT score_max
      FROM conduct_score_categories
      WHERE id = ? AND term_id = ?
    `).get(conductCategoryId, activity.term_id) as { score_max: number } | undefined;
    if (!category) throw new Error("Mục trong Khung điểm rèn luyện không hợp lệ.");
    if (conductScore > Number(category.score_max)) {
      throw new Error("Điểm của hoạt động không được lớn hơn điểm tối đa của mục đã chọn.");
    }
  }
  if (editMode !== "full" && new Date(endAt).getTime() < new Date(activity.end_at).getTime()) {
    throw new Error("Chỉ được kéo dài thời gian kết thúc hoạt động, không được rút ngắn.");
  }
  if (editMode === "extension" && new Date(endAt).getTime() === new Date(activity.end_at).getTime()) {
    throw new Error("Vui lòng chọn thời gian kết thúc mới muộn hơn thời gian hiện tại.");
  }

  if (scopeMode === "selected" && selectedClassIds.length === 0) {
    throw new Error("Bạn đã chọn áp dụng theo lớp nhưng chưa chọn lớp nào.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
      UPDATE activities
      SET
        title = ?,
        description = ?,
        audience_type = ?,
        start_at = ?,
        end_at = ?,
        registration_start_at = ?,
        registration_end_at = ?,
        conduct_score = ?,
        attendance_mode = ?,
        qr_checkin_enabled = ?,
        conduct_category_id = ?
      WHERE id = ?
      `
    ).run(
      title,
      description,
      audienceType,
      startAt,
      endAt,
      registrationStartAt,
      registrationEndAt,
      conductScore,
      attendanceMode,
      qrCheckinEnabled,
      conductCategoryId,
      activityId
    );

    if (editMode === "full") {
      db.prepare(`DELETE FROM activity_scopes WHERE activity_id = ?`).run(activityId);

    if (scopeMode === "selected" && editMode === "full") {
      const insertScope = db.prepare(
        `
        INSERT INTO activity_scopes (activity_id, class_id)
        VALUES (?, ?)
        `
      );

      for (const classId of selectedClassIds) {
        insertScope.run(activityId, classId);
      }
    }

    if (editMode === "full") {
      db.prepare(`DELETE FROM criteria_activity_rules WHERE activity_id = ?`).run(activityId);
    }

    if (criteriaBindings.length > 0 && editMode === "full") {
      const insertRule = db.prepare(
        `
        INSERT INTO criteria_activity_rules (
          template_id,
          criteria_code,
          activity_id
        )
        VALUES (?, ?, ?)
        `
      );

      for (const binding of criteriaBindings) {
        const [templateIdRaw, criteriaCode] = binding.split("::");
        const templateId = Number(templateIdRaw);

        if (!Number.isFinite(templateId) || !criteriaCode) continue;

        insertRule.run(templateId, criteriaCode, activityId);
      }
    }
    }
  });

  tx();

  revalidatePath("/dashboard/admin/activities");
  revalidatePath(`/dashboard/admin/activities/${activityId}/edit`);
  revalidatePath(`/dashboard/admin/activities/${activityId}`);
  revalidatePath("/dashboard/student/activities");
  revalidatePath("/dashboard/faculty-officer/checkin");

  return {
    ok: true,
    message: "Cập nhật hoạt động thành công.",
  };
}
