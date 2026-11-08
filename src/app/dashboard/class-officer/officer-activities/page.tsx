import { activityCohortSql } from "@/server/cohorts/sql";
import { parseCohort } from "@/lib/cohorts/cohorts";
import { activityVisibleSql } from "@/server/cohorts/sql";
import { requireOfficerParticipantContext } from "@/server/auth/requireOfficerParticipantContext";
import { getDatabase } from "@/server/db/mysql";
import OfficerActivitiesTable from "@/components/faculty-officer/officer-activities/OfficerActivitiesTable";
import type { OfficerActivityItem } from "@/components/faculty-officer/officer-activities/types";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import OfficerActivityStatsCards from "@/components/faculty-officer/officer-activities/OfficerActivityStatsCards";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ cohort?: string;
  keyword?: string;
  status?: string;
  time?: string;
  termId?: string;
  page?: string;
}>;

type Row = {
  id: number;
  title: string;
  description: string | null;
  audience_type: string;
  status: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  registration_status: string | null;
};
type SummaryRow = { total: number; upcoming: number; registered: number; attended: number };

const PAGE_SIZE = 10;

export default async function ClassOfficerOfficerActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireOfficerParticipantContext();
  const params = await searchParams;
  const db = getDatabase();
  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const time = String(params.time ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: string[] = [
    "a.audience_type = 'officer'",
    activityVisibleSql("a", String(user.id)),
    "a.status = 'published'",
    "a.term_id = ?",
  ];
  const values: unknown[] = [selectedTerm.id];
  const cohort = parseCohort(params.cohort);
  if (params.cohort && !cohort) where.push("0=1");
  if (cohort) { where.push(`(${activityCohortSql("a")})`); values.push(cohort,cohort); }

  const summary = (await db.first(`
    SELECT COUNT(*) AS total,
      COUNT(CASE WHEN a.start_at>CURRENT_TIMESTAMP(3) THEN 1 END) AS upcoming,
      COUNT(CASE WHEN ar.status='registered' THEN 1 END) AS registered,
      COUNT(CASE WHEN ar.status='attended' THEN 1 END) AS attended
    FROM activities a LEFT JOIN activity_registrations ar ON ar.activity_id=a.id AND ar.user_id=?
    WHERE a.audience_type='officer' AND a.status='published' AND a.term_id=?
      AND ${activityVisibleSql("a", String(user.id))}
  `, [user.id, selectedTerm.id])) as SummaryRow;

  if (keyword) {
    where.push("a.title LIKE ?");
    values.push(`%${keyword}%`);
  }

  if (status === "registered") where.push("ar.status IS NOT NULL");

  if (status === "open") {
    where.push("ar.status IS NULL");
    where.push("a.registration_start_at <= CURRENT_TIMESTAMP(3)");
    where.push("a.registration_end_at >= CURRENT_TIMESTAMP(3)");
  }

  if (status === "attended") where.push("ar.status = 'attended'");
  if (status === "expired") where.push("a.registration_end_at < CURRENT_TIMESTAMP(3)");
  if (time === "upcoming") where.push("a.start_at > CURRENT_TIMESTAMP(3)");
  if (time === "ongoing") {
    where.push("a.start_at <= CURRENT_TIMESTAMP(3) AND a.end_at >= CURRENT_TIMESTAMP(3)");
  }
  if (time === "ended") where.push("a.end_at < CURRENT_TIMESTAMP(3)");

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = (await db.first(`
      SELECT COUNT(*) AS total
      FROM activities a
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
       AND ar.user_id = ?
      ${whereSql}
      `, [user.id, ...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        a.id,
        a.title,
        a.description,
        a.audience_type,
        a.status,
        a.start_at,
        a.end_at,
        a.registration_start_at,
        a.registration_end_at,
        a.conduct_score,
        ar.status AS registration_status
      FROM activities a
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
       AND ar.user_id = ?
      ${whereSql}
      ORDER BY a.start_at DESC, a.id DESC
      LIMIT ?
      OFFSET ?
      `, [user.id, ...values, PAGE_SIZE, offset])) as Row[];

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));
  const now = new Date();

  const items: OfficerActivityItem[] = rows.map((item) => {
    const regStart = new Date(item.registration_start_at);
    const regEnd = new Date(item.registration_end_at);

    return {
      id: Number(item.id),
      title: String(item.title ?? ""),
      description: item.description ? String(item.description) : "",
      audienceType: String(item.audience_type ?? ""),
      status: String(item.status ?? ""),
      startAt: String(item.start_at ?? ""),
      endAt: String(item.end_at ?? ""),
      registrationStartAt: String(item.registration_start_at ?? ""),
      registrationEndAt: String(item.registration_end_at ?? ""),
      conductScore: Number(item.conduct_score ?? 0),
      registrationStatus: item.registration_status ? String(item.registration_status) : null,
      canRegister: now >= regStart && now <= regEnd && !item.registration_status,
    };
  });

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Hoạt động cán bộ</h1>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <OfficerActivityStatsCards total={summary.total} upcoming={summary.upcoming} registered={summary.registered} attended={summary.attended} />

      <OfficerActivitiesTable
        items={items}
        page={page}
        totalPages={totalPages}
        totalResults={Number(total.total ?? 0)}
        basePath="/dashboard/class-officer/officer-activities"
        searchParams={{ cohort: params.cohort, keyword, status, time, termId: String(selectedTerm.id) }}
      />
    </main>
  );
}
