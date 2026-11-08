import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { activityCohortSql } from "@/server/cohorts/sql";
import { parseCohort } from "@/lib/cohorts/cohorts";
import { Activity, CalendarClock, CheckCircle2, Users } from "lucide-react";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import FacultyOfficerActivitiesTable from "@/components/faculty-officer/activities/FacultyOfficerActivitiesTable";
import type { FacultyOfficerActivityItem } from "@/components/faculty-officer/activities/types";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
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
  organizer_level: string;
  audience_type: string;
  status: string;
  start_at: string;
  end_at: string;
  registration_start_at: string;
  registration_end_at: string;
  conduct_score: number;
  qr_checkin_enabled: number;
  participants: number;
  attended: number;
};

const PAGE_SIZE = 10;

export default async function FacultyOfficerActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireFacultyOfficerContext();

  const params = await searchParams;
  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const time = String(params.time ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

  const db = getDatabase();

  const where: string[] = [
    "a.term_id = ?",
    "a.audience_type = 'student'",
  ];
  const values: unknown[] = [selectedTerm.id];
  const cohort = parseCohort(params.cohort);
  if (params.cohort && !cohort) where.push("0=1");
  if (cohort) { where.push(`(${activityCohortSql("a")})`); values.push(cohort,cohort); }

  if (keyword) {
    where.push("a.title LIKE ?");
    values.push(`%${keyword}%`);
  }

  if (status) {
    where.push("a.status = ?");
    values.push(status);
  }

  if (time === "upcoming") {
    where.push("a.start_at > CURRENT_TIMESTAMP(3)");
  }

  if (time === "ongoing") {
    where.push(
      "a.start_at <= CURRENT_TIMESTAMP(3) AND a.end_at >= CURRENT_TIMESTAMP(3)"
    );
  }

  if (time === "ended") {
    where.push("a.end_at < CURRENT_TIMESTAMP(3)");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = (await db.first(`
      SELECT COUNT(*) AS total
      FROM activities a
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        a.id,
        a.title,
        a.description,
        a.organizer_level,
        a.audience_type,
        a.status,
        a.start_at,
        a.end_at,
        a.registration_start_at,
        a.registration_end_at,
        a.conduct_score,
        a.qr_checkin_enabled,

        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id AND ar.status != 'cancelled'
        ) AS participants,

        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          WHERE ar.activity_id = a.id AND ar.status = 'attended'
        ) AS attended

      FROM activities a
      ${whereSql}
      ORDER BY a.start_at DESC, a.id DESC
      LIMIT ?
      OFFSET ?
      `, [...values, PAGE_SIZE, offset])) as Row[];

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));
  const upcoming = (await db.first(`SELECT COUNT(*) total FROM activities a ${whereSql} AND a.start_at>CURRENT_TIMESTAMP(3)`, [...values])) as {total:number};
  const participation = (await db.first(`SELECT COUNT(DISTINCT CASE WHEN ar.status IN ('registered','attended','absent') THEN ar.user_id END) registered,COUNT(DISTINCT CASE WHEN ar.status='attended' THEN ar.user_id END) attended FROM activity_registrations ar INNER JOIN activities a ON a.id=ar.activity_id WHERE a.term_id=? AND a.audience_type='student'`, [selectedTerm.id])) as {registered:number;attended:number};
  const attendanceRate=participation.registered?Math.round(participation.attended/participation.registered*100):0;

  const items: FacultyOfficerActivityItem[] = rows.map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? ""),
    description: item.description ? String(item.description) : "",
    organizerLevel: String(item.organizer_level ?? "faculty"),
    audienceType: String(item.audience_type ?? ""),
    status: String(item.status ?? ""),
    startAt: String(item.start_at ?? ""),
    endAt: String(item.end_at ?? ""),
    registrationStartAt: String(item.registration_start_at ?? ""),
    registrationEndAt: String(item.registration_end_at ?? ""),
    conductScore: Number(item.conduct_score ?? 0),
    qrCheckinEnabled: Number(item.qr_checkin_enabled ?? 0) === 1,
    participants: Number(item.participants ?? 0),
    attended: Number(item.attended ?? 0),
  }));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Activity size={22}/></div><h1 className="text-2xl font-semibold">Hoạt động</h1></div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Activity size={20}/>} label="Tất cả hoạt động" value={Number(total.total??0)}/>
        <SummaryCard icon={<CalendarClock size={20}/>} label="Hoạt động sắp diễn ra" value={Number(upcoming.total??0)}/>
        <SummaryCard icon={<Users size={20}/>} label="Sinh viên đã đăng ký" value={Number(participation.registered??0)}/>
        <SummaryCard icon={<CheckCircle2 size={20}/>} label="Tham gia trên đăng ký" value={`${attendanceRate}%`}/>
      </section>

      <FacultyOfficerActivitiesTable
        items={items}
        page={page}
        totalPages={totalPages}
        totalResults={Number(total.total ?? 0)}
        searchParams={{ cohort: params.cohort,
          keyword,
          status,
          time,
          termId: String(selectedTerm.id),
        }}
      />
    </main>
  );
}

function SummaryCard({icon,label,value }:{icon:React.ReactNode;label:string;value:number|string;}){return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div></div>}
