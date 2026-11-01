import { activityCohortSql } from "@/server/cohorts/sql";
import { parseCohort } from "@/lib/cohorts/cohorts";
import { activityVisibleSql } from "@/server/cohorts/sql";
import { requireStudentContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import StudentActivitiesHeader from "@/components/student/activities/StudentActivitiesHeader";
import StudentActivitiesTable from "@/components/student/activities/StudentActivitiesTable";
import type { StudentActivityItem } from "@/components/student/activities/types";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ cohort?: string;
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
  absence_penalty: number;
  max_registrations:number|null;
  registration_count:number;
  registration_status: string | null;
  participation_source: string; category_label: string | null; category_parent_label: string | null; category_max: number | null; category_score: number;
  registration_locked: number;
};

export default async function StudentActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStudentContext();
  const params = await searchParams;

  const db = getDatabase();
  (await ensureActivityConductScores());
  
  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));
  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const time = String(params.time ?? "").trim();
  const where: string[] = [
    "a.status = 'published'",
    "a.term_id = ?",
    "a.audience_type = 'student'",
    activityVisibleSql("a", String(user.id)),  ];
  const values: unknown[] = [selectedTerm.id];
  const cohort = parseCohort(params.cohort);
  if (params.cohort && !cohort) where.push("0=1");
  if (cohort) { where.push(`(${activityCohortSql("a")})`); values.push(cohort,cohort); }

  if (keyword) {
    where.push("a.title LIKE ?");
    values.push(`%${keyword}%`);
  }
  if (status === "open") where.push("a.registration_locked=0 AND CAST(a.registration_start_at AS DATETIME(3)) <= CURRENT_TIMESTAMP(3) AND CAST(a.registration_end_at AS DATETIME(3)) >= CURRENT_TIMESTAMP(3)");
  if (status === "registered") where.push("ar.status = 'registered'");
  if (status === "attended") where.push("ar.status = 'attended'");
  if (status === "expired") where.push("CAST(a.registration_end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)");
  if (time === "upcoming") where.push("CAST(a.start_at AS DATETIME(3)) > CURRENT_TIMESTAMP(3)");
  if (time === "ongoing") where.push("CAST(a.start_at AS DATETIME(3)) <= CURRENT_TIMESTAMP(3) AND CAST(a.end_at AS DATETIME(3)) >= CURRENT_TIMESTAMP(3)");
  if (time === "ended") where.push("CAST(a.end_at AS DATETIME(3)) < CURRENT_TIMESTAMP(3)");

  const rows = (await db.rows(`
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
        a.absence_penalty,
        a.max_registrations,
        (SELECT COUNT(*) FROM activity_registrations capacity_ar WHERE capacity_ar.activity_id=a.id AND capacity_ar.status<>'cancelled') registration_count,
        a.participation_source,
        a.registration_locked,
        CASE WHEN category.id IS NULL THEN NULL ELSE CONCAT(CONCAT(category.code, ' · '), category.name) END AS category_label,
        CASE WHEN category_parent.id IS NULL THEN NULL ELSE CONCAT(CONCAT(category_parent.code, ' · '), category_parent.name) END AS category_parent_label,
        category.score_max AS category_max,
        COALESCE((SELECT GREATEST(0, LEAST(category.score_max, SUM(cs.score_value))) FROM conduct_scores cs INNER JOIN activities source_activity ON source_activity.id=cs.source_id WHERE cs.user_id=? AND cs.source_type='activity' AND source_activity.conduct_category_id=category.id),0) AS category_score,
        ar.status AS registration_status
      FROM activities a
      LEFT JOIN conduct_score_categories category ON category.id=a.conduct_category_id
      LEFT JOIN conduct_score_categories category_parent ON category_parent.id=category.parent_id
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
       AND ar.user_id = ?
      WHERE ${where.join(" AND ")}
      ORDER BY CAST(a.start_at AS DATETIME(3)) DESC, a.id DESC
      `, [user.id, user.id, ...values])) as Row[];

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
      absencePenalty: Number(item.conduct_score ?? 0),
      registrationStatus: item.registration_status
        ? String(item.registration_status)
        : null,
      participationSource: String(item.participation_source ?? "internal"),
      categoryLabel: item.category_label ? String(item.category_label) : null,
      categoryParentLabel: item.category_parent_label ? String(item.category_parent_label) : null,
      categoryScore: Number(item.category_score ?? 0),
      categoryMax: Number(item.category_max ?? 0),
      projectedScore: Math.max(0, Math.min(Number(item.conduct_score ?? 0), Number(item.category_max ?? 0) - Number(item.category_score ?? 0))),
      capacityFull: item.max_registrations!==null&&item.registration_count>=item.max_registrations,
      canRegister:
        (item.max_registrations===null||item.registration_count<item.max_registrations) &&
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
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100 shadow-md shadow-slate-200/60">
          Bạn đang xem học kỳ cũ. Chỉ xem lại hoạt động, không đăng ký mới.
        </section>
      ) : null}

      <StudentActivitiesTable items={items} />
    </main>
  );
}
