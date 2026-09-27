import { requireStudentContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import StudentActivitiesHeader from "@/components/student/activities/StudentActivitiesHeader";
import StudentActivitiesTable from "@/components/student/activities/StudentActivitiesTable";
import type { StudentActivityItem } from "@/components/student/activities/types";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  termId?: string;
  keyword?: string;
  status?: string;
  time?: string;
}>;

type Row = {
  id: number;
  title: string;
  description: string;
  audience_type: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  registration_status: string | null;
  participation_source: string; category_label: string | null; category_max: number | null; category_score: number;
  registration_locked: number;
};

export default async function StudentActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStudentContext();
  const params = await searchParams;

  const db = getDb();
  ensureActivityConductScores();
  
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);
  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const time = String(params.time ?? "").trim();
  const where: string[] = [
    "a.status = 'published'",
    "a.term_id = ?",
    "a.audience_type = 'student'",
    `(a.organizer_level = 'faculty' OR EXISTS (
      SELECT 1 FROM activity_scopes scope
      INNER JOIN class_members member ON member.class_id = scope.class_id
      WHERE scope.activity_id = a.id AND member.user_id = ? AND member.left_at IS NULL
    ))`,
  ];
  const values: unknown[] = [selectedTerm.id, user.id];

  if (keyword) {
    where.push("(a.title LIKE ? OR a.description LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status === "open") where.push("a.registration_locked=0 AND datetime(a.registration_start_at) <= datetime('now') AND datetime(a.registration_end_at) >= datetime('now')");
  if (status === "registered") where.push("ar.status = 'registered'");
  if (status === "attended") where.push("ar.status = 'attended'");
  if (status === "expired") where.push("datetime(a.registration_end_at) < datetime('now')");
  if (time === "upcoming") where.push("datetime(a.start_at) > datetime('now')");
  if (time === "ongoing") where.push("datetime(a.start_at) <= datetime('now') AND datetime(a.end_at) >= datetime('now')");
  if (time === "ended") where.push("datetime(a.end_at) < datetime('now')");

  const rows = db
    .prepare(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.audience_type,
        a.start_at,
        a.end_at,
        a.registration_start_at,
        a.registration_end_at,
        a.conduct_score,
        a.participation_source,
        a.registration_locked,
        CASE WHEN category.id IS NULL THEN NULL ELSE category.code || ' · ' || category.name END AS category_label,
        category.score_max AS category_max,
        COALESCE((SELECT MIN(category.score_max, SUM(cs.score_value)) FROM conduct_scores cs INNER JOIN activities source_activity ON source_activity.id=cs.source_id WHERE cs.user_id=? AND cs.source_type='activity' AND source_activity.conduct_category_id=category.id),0) AS category_score,
        ar.status AS registration_status
      FROM activities a
      LEFT JOIN conduct_score_categories category ON category.id=a.conduct_category_id
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
       AND ar.user_id = ?
      WHERE ${where.join(" AND ")}
      ORDER BY datetime(a.start_at) DESC, a.id DESC
      `
    )
    .all(user.id, user.id, ...values) as Row[];

  const now = new Date();

  const items: StudentActivityItem[] = rows.map((item) => {
    const regStart = new Date(item.registration_start_at);
    const regEnd = new Date(item.registration_end_at);

    return {
      id: Number(item.id),
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      audienceType: String(item.audience_type ?? ""),
      startAt: String(item.start_at ?? ""),
      endAt: String(item.end_at ?? ""),
      registrationStartAt: String(item.registration_start_at ?? ""),
      registrationEndAt: String(item.registration_end_at ?? ""),
      conductScore: Number(item.conduct_score ?? 0),
      registrationStatus: item.registration_status
        ? String(item.registration_status)
        : null,
      participationSource: String(item.participation_source ?? "internal"),
      categoryLabel: item.category_label ? String(item.category_label) : null,
      categoryScore: Number(item.category_score ?? 0),
      categoryMax: Number(item.category_max ?? 0),
      projectedScore: Math.max(0, Math.min(Number(item.conduct_score ?? 0), Number(item.category_max ?? 0) - Number(item.category_score ?? 0))),
      canCancel: selectedTerm.isActive && item.registration_status === "registered" && now <= regEnd && now < new Date(item.start_at) && !item.registration_locked,
      canRegister:
        selectedTerm.isActive &&
        now >= regStart &&
        now <= regEnd &&
        (!item.registration_status || item.registration_status === "cancelled") && item.participation_source !== "external" && !item.registration_locked,
    };
  });

  return (
    <main className="space-y-6">
      <StudentActivitiesHeader termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />} />

      {!selectedTerm.isActive ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Bạn đang xem học kỳ cũ. Chỉ xem lại hoạt động, không đăng ký mới.
        </section>
      ) : null}

      <StudentActivitiesTable items={items} />
    </main>
  );
}
