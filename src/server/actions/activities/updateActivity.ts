"use server";

import { readActivityScopes, saveActivityScopes } from "@/server/activities/scopes";
import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { validateActivityTime } from "@/server/actions/validators/activityValidator";
import { parseRegistrationCapacity } from "@/server/activities/registrationCapacity";

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
  const db = getDatabase();

  const activity = (await db.first(`
      SELECT a.*, at.is_active,
        CASE WHEN CAST(a.start_at AS DATETIME(3)) <= CURRENT_TIMESTAMP(3) THEN 1 ELSE 0 END AS has_started,
        (SELECT COUNT(*) FROM activity_registrations ar
          WHERE ar.activity_id = a.id AND ar.status != 'cancelled') AS participant_count,
        (SELECT COUNT(*) FROM activity_registrations ar
          WHERE ar.activity_id = a.id AND ar.status = 'attended') AS attended_count
      FROM activities a
      INNER JOIN academic_terms at ON at.id = a.term_id
      WHERE a.id = ?
      LIMIT 1
      `, [activityId])) as {
      id: number; status: string; is_active: number; title: string; description: string;
      audience_type: string; start_at: string; end_at: string; registration_start_at: string;
      registration_end_at: string; conduct_score: number; absence_penalty: number; qr_checkin_enabled: number;
      conduct_category_id: number | null;
      max_registrations: number | null;
      term_id: number;
      organizer_level: string;
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
  const description = requestedDescription;
  const audienceType = editMode === "full" ? requestedAudienceType : activity.audience_type;
  const registrationStartAt = editMode === "full" ? requestedRegistrationStartAt : activity.registration_start_at;
  const registrationEndAt = editMode === "full" ? requestedRegistrationEndAt : activity.registration_end_at;
  const startAt = editMode === "full" ? requestedStartAt : activity.start_at;
  const endAt = requestedEndAt;
  const conductScore = editMode === "full" ? requestedConductScore : activity.conduct_score;
  const absencePenalty = conductScore;
  const conductCategoryId = editMode === "full" ? requestedConductCategoryId : activity.conduct_category_id;
  const qrCheckinEnabled = editMode === "full" ? requestedQrCheckinEnabled : activity.qr_checkin_enabled;
  const attendanceMode = qrCheckinEnabled ? "qr" : "manual";
  const maxRegistrations = editMode === "full" && formData.has("maxRegistrations") ? parseRegistrationCapacity(formData.get("maxRegistrations")) : activity.max_registrations;
  const status = editMode === "full" ? String(formData.get("status") ?? activity.status) : activity.status;
  if (!["draft", "published"].includes(status)) throw new Error("Trạng thái hoạt động không hợp lệ.");

  const {classIds: selectedClassIds, cohorts: selectedCohorts} = editMode === "full" ? (await readActivityScopes(formData)) : {classIds:[],cohorts:[]};
  const organizerLevel = editMode === "full" ? String(formData.get("organizerLevel") ?? activity.organizer_level) : activity.organizer_level;
  if (!["class","faculty"].includes(organizerLevel)) throw new Error("Cấp tổ chức không hợp lệ.");

  const criteriaBindings = formData
    .getAll("criteriaBindings")
    .map((value) => String(value))
    .filter(Boolean);

  const sameTime = (left: string | null, right: string | null) => new Date(left ?? "").getTime() === new Date(right ?? "").getTime();
  const sameValues = title === activity.title && description === (activity.description ?? "").trim()
    && status === activity.status && maxRegistrations === activity.max_registrations
    && audienceType === activity.audience_type && conductScore === Number(activity.conduct_score)
    && conductCategoryId === activity.conduct_category_id && qrCheckinEnabled === activity.qr_checkin_enabled
    && organizerLevel === activity.organizer_level && sameTime(registrationStartAt,activity.registration_start_at)
    && sameTime(registrationEndAt,activity.registration_end_at) && sameTime(startAt,activity.start_at) && sameTime(endAt,activity.end_at);
  const sameIds = (left:number[],right:number[]) => JSON.stringify([...left].sort((a,b)=>a-b)) === JSON.stringify([...right].sort((a,b)=>a-b));
  const oldClasses = editMode === "full" ? ((await db.rows("SELECT class_id FROM activity_scopes WHERE activity_id=?", [activityId])) as Array<{class_id:number}>).map(row=>row.class_id) : [];
  const oldCohorts = editMode === "full" ? ((await db.rows("SELECT cohort FROM activity_cohort_scopes WHERE activity_id=?", [activityId])) as Array<{cohort:number}>).map(row=>row.cohort) : [];
  if (sameValues && sameIds(selectedClassIds,oldClasses) && sameIds(selectedCohorts,oldCohorts)) {
    throw new Error("Chưa có thông tin nào được thay đổi.");
  }

  if (!title) throw new Error("Vui lòng nhập tên hoạt động.");
  if (!description) throw new Error("Vui lòng nhập mô tả hoạt động.");

  if(editMode!=="extension"){
    const duplicate=(await db.first(`SELECT a.id,c.code category_code,c.name category_name,at.name term_name FROM activities a LEFT JOIN conduct_score_categories c ON c.id=a.conduct_category_id LEFT JOIN academic_terms at ON at.id=a.term_id WHERE a.term_id=(SELECT term_id FROM activities WHERE id=?) AND a.id<>? AND LOWER(TRIM(a.title))=LOWER(TRIM(?)) LIMIT 1`, [activityId, activityId, title])) as {id:number;category_code:string|null;category_name:string|null;term_name:string|null}|undefined;
    if(duplicate){const category=duplicate.category_name?`mục “${duplicate.category_code}. ${duplicate.category_name}”`:"hoạt động không thuộc mục điểm";throw new Error(`Tên hoạt động đã tồn tại trong học kỳ ${duplicate.term_name??"hiện tại"}, tại ${category}. Tên hoạt động không được trùng trong cùng học kỳ.`);}
  }

  if (!["student", "officer"].includes(audienceType)) {
    throw new Error("Đối tượng tham gia không hợp lệ.");
  }

  if (conductScore < 0) {
    throw new Error("Điểm rèn luyện không được âm.");
  }
  if (audienceType === "student" && !conductCategoryId) {
    throw new Error("Vui lòng chọn một mục cấp cuối trong Khung điểm rèn luyện.");
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
    allowRegistrationDuringActivity: editMode === "extension",
  });

  if (editMode !== "full" && new Date(registrationEndAt).getTime() < new Date(activity.registration_end_at).getTime()) {
    throw new Error("Chỉ được kéo dài thời gian đóng đăng ký, không được rút ngắn.");
  }

  if (conductCategoryId) {
    const category = (await db.first(`
      SELECT score_max,
        EXISTS(SELECT 1 FROM conduct_score_categories child WHERE child.parent_id=conduct_score_categories.id) AS has_children
      FROM conduct_score_categories
      WHERE id = ? AND term_id = ?
    `, [conductCategoryId, activity.term_id])) as { score_max: number; has_children: number } | undefined;
    if (!category) throw new Error("Mục trong Khung điểm rèn luyện không hợp lệ.");
    if (Number(category.has_children) === 1) throw new Error("Không thể gắn hoạt động vào mục cha. Vui lòng chọn một mục cấp cuối cụ thể trong Khung điểm rèn luyện.");
    if (conductScore > Number(category.score_max)) {
      throw new Error("Điểm của hoạt động không được lớn hơn điểm tối đa của mục đã chọn.");
    }
  }
  if (editMode !== "full" && new Date(endAt).getTime() < new Date(activity.end_at).getTime()) {
    throw new Error("Chỉ được kéo dài thời gian kết thúc hoạt động, không được rút ngắn.");
  }

  if (editMode === "full" && organizerLevel === "class" && selectedClassIds.length + selectedCohorts.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một lớp hoặc khóa tham gia.");
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`
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
        absence_penalty = ?,
        attendance_mode = ?,
        qr_checkin_enabled = ?,
        conduct_category_id = ?,
        max_registrations = ?,
        status = ?,
        published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP(3)) ELSE published_at END
      WHERE id = ?
      `, [title, description, audienceType, startAt, endAt, registrationStartAt, registrationEndAt, conductScore, absencePenalty, attendanceMode, qrCheckinEnabled, conductCategoryId, maxRegistrations, status, status, activityId]));

    if (editMode === "full") {
      (await saveActivityScopes(activityId, organizerLevel === "class" ? selectedClassIds : [], organizerLevel === "class" ? selectedCohorts : []));
      (await db.execute("UPDATE activities SET organizer_level=?,participation_source=? WHERE id=?", [organizerLevel, organizerLevel === "class" ? "internal" : "external", activityId]));

    if (editMode === "full") {
      (await db.execute(`DELETE FROM criteria_activity_rules WHERE activity_id = ?`, [activityId]));
    }

    if (criteriaBindings.length > 0 && editMode === "full") {
      

      for (const binding of criteriaBindings) {
        const [templateIdRaw, criteriaCode] = binding.split("::");
        const templateId = Number(templateIdRaw);

        if (!Number.isFinite(templateId) || !criteriaCode) continue;

        (await db.execute(`
        INSERT INTO criteria_activity_rules (
          template_id,
          criteria_code,
          activity_id
        )
        VALUES (?, ?, ?)
        `, [templateId, criteriaCode, activityId]));
      }
    }
    }
  })));

  (await tx());

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
