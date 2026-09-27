import { Activity, CalendarClock, CheckCircle2, Users } from "lucide-react";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import FacultyOfficerActivitiesTable from "@/components/faculty-officer/activities/FacultyOfficerActivitiesTable";
import type { FacultyOfficerActivityItem } from "@/components/faculty-officer/activities/types";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
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
  const officer = await requireFacultyOfficerContext();

  const params = await searchParams;
  const keyword = String(params.keyword ?? "").trim();
  const status = String(params.status ?? "").trim();
  const time = String(params.time ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const db = getDb();

  const where: string[] = [
    "a.term_id = ?",
    "a.audience_type = 'student'",
    `(NOT EXISTS (SELECT 1 FROM activity_scopes axs WHERE axs.activity_id=a.id)
      OR EXISTS (
        SELECT 1 FROM activity_scopes axs
        INNER JOIN faculty_class_assignments fca ON fca.class_id=axs.class_id
        WHERE axs.activity_id=a.id AND fca.faculty_officer_id=?
      ))`,
  ];
  const values: unknown[] = [selectedTerm.id, officer.id];

  if (keyword) {
    where.push("(a.title LIKE ? OR a.description LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    where.push("a.status = ?");
    values.push(status);
  }

  if (time === "upcoming") {
    where.push("datetime(a.start_at) > datetime('now')");
  }

  if (time === "ongoing") {
    where.push(
      "datetime(a.start_at) <= datetime('now') AND datetime(a.end_at) >= datetime('now')"
    );
  }

  if (time === "ended") {
    where.push("datetime(a.end_at) < datetime('now')");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM activities a
      ${whereSql}
      `
    )
    .get(...values) as { total: number };

  const rows = db
    .prepare(
      `
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
          INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL
          INNER JOIN faculty_class_assignments fca ON fca.class_id=cm.class_id
          WHERE ar.activity_id = a.id AND fca.faculty_officer_id = ?
        ) AS participants,

        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL
          INNER JOIN faculty_class_assignments fca ON fca.class_id=cm.class_id
          WHERE ar.activity_id = a.id AND fca.faculty_officer_id = ?
            AND ar.status = 'attended'
        ) AS attended

      FROM activities a
      ${whereSql}
      ORDER BY datetime(a.start_at) DESC, a.id DESC
      LIMIT ?
      OFFSET ?
      `
    )
    .all(officer.id, officer.id, ...values, PAGE_SIZE, offset) as Row[];

  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));
  const upcoming = db.prepare(`SELECT COUNT(*) total FROM activities a ${whereSql} AND datetime(a.start_at)>datetime('now')`).get(...values) as {total:number};
  const participation = db.prepare(`SELECT COUNT(DISTINCT CASE WHEN ar.status IN ('registered','attended') THEN ar.user_id END) registered,COUNT(DISTINCT CASE WHEN ar.status='attended' THEN ar.user_id END) attended FROM activity_registrations ar INNER JOIN activities a ON a.id=ar.activity_id INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL INNER JOIN faculty_class_assignments fca ON fca.class_id=cm.class_id WHERE fca.faculty_officer_id=? AND a.term_id=? AND a.audience_type='student'`).get(officer.id,selectedTerm.id) as {registered:number;attended:number};
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
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Activity size={22}/></div><h1 className="text-2xl font-semibold">Hoạt động</h1></div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Activity size={20}/>} label="Tất cả hoạt động" value={Number(total.total??0)} tone="blue"/>
        <SummaryCard icon={<CalendarClock size={20}/>} label="Hoạt động sắp diễn ra" value={Number(upcoming.total??0)} tone="amber"/>
        <SummaryCard icon={<Users size={20}/>} label="Sinh viên đã đăng ký" value={Number(participation.registered??0)} tone="sky"/>
        <SummaryCard icon={<CheckCircle2 size={20}/>} label="Tham gia trên đăng ký" value={`${attendanceRate}%`} tone="emerald"/>
      </section>

      <FacultyOfficerActivitiesTable
        items={items}
        page={page}
        totalPages={totalPages}
        totalResults={Number(total.total ?? 0)}
        searchParams={{
          keyword,
          status,
          time,
          termId: String(selectedTerm.id),
        }}
      />
    </main>
  );
}

function SummaryCard({icon,label,value,tone}:{icon:React.ReactNode;label:string;value:number|string;tone:"blue"|"amber"|"sky"|"emerald"}){const tones={blue:"bg-blue-50 text-blue-700 ring-blue-100",amber:"bg-amber-50 text-amber-700 ring-amber-100",sky:"bg-sky-50 text-sky-700 ring-sky-100",emerald:"bg-emerald-50 text-emerald-700 ring-emerald-100"};return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>{icon}</div><div className="mt-4 text-2xl font-semibold text-slate-900">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>}
