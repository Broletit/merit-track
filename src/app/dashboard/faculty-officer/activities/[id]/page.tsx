import { notFound } from "next/navigation";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import FacultyOfficerActivityDetailHeader from "@/components/faculty-officer/activities/FacultyOfficerActivityDetailHeader";
import FacultyOfficerActivityDetailCard from "@/components/faculty-officer/activities/FacultyOfficerActivityDetailCard";
import FacultyOfficerActivityRegistrationsTable from "@/components/faculty-officer/activities/FacultyOfficerActivityRegistrationsTable";
import type {
  FacultyOfficerActivityClassOption,
  FacultyOfficerActivityDetail,
  FacultyOfficerActivityRegistrationItem,
} from "@/components/faculty-officer/activities/types";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  status?: string;
  classId?: string;
}>;

type ActivityRow = {
  id: number;
  title: string;
  description: string;
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

type RegistrationRow = {
  id: number;
  user_id: number;
  full_name: string;
  mssv: string;
  class_code: string | null;
  class_name: string | null;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
};

type ClassRow = {
  id: number;
  code: string;
  name: string;
};

export default async function FacultyOfficerActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const officer = await requireFacultyOfficerContext();

  const { id } = await params;
  const activityId = Number(id);

  if (!Number.isFinite(activityId) || activityId <= 0) {
    notFound();
  }

  const sp = await searchParams;
  const db = getDb();

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const keyword = String(sp.keyword ?? "").trim();
  const status = String(sp.status ?? "").trim();
  const classId = Number(sp.classId ?? 0);

  const activityRow = db
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
          INNER JOIN faculty_class_assignments fca ON fca.class_id=ar.class_id
          WHERE ar.activity_id = a.id AND fca.faculty_officer_id=?
        ) AS participants,
        (
          SELECT COUNT(*)
          FROM activity_registrations ar
          INNER JOIN faculty_class_assignments fca ON fca.class_id=ar.class_id
          WHERE ar.activity_id = a.id AND fca.faculty_officer_id=?
            AND ar.status = 'attended'
        ) AS attended
      FROM activities a
      WHERE a.id = ?
        AND a.audience_type = 'student'
        AND EXISTS (SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=?)
        AND (NOT EXISTS (SELECT 1 FROM activity_scopes axs WHERE axs.activity_id=a.id)
          OR EXISTS (SELECT 1 FROM activity_scopes axs INNER JOIN faculty_class_assignments fca ON fca.class_id=axs.class_id WHERE axs.activity_id=a.id AND fca.faculty_officer_id=?))
      LIMIT 1
      `
    )
    .get(officer.id, officer.id, activityId, officer.id, officer.id) as ActivityRow | undefined;

  if (!activityRow) {
    notFound();
  }

  const classRows = db
    .prepare(
      `
      SELECT DISTINCT
        c.id,
        c.code,
        c.name
      FROM activity_registrations ar
      INNER JOIN classes c ON c.id = ar.class_id
      INNER JOIN faculty_class_assignments fca ON fca.class_id=c.id
      WHERE ar.activity_id = ? AND fca.faculty_officer_id=?
      ORDER BY c.code ASC, c.name ASC
      `
    )
    .all(activityId, officer.id) as ClassRow[];

  const where: string[] = [`ar.activity_id = ?`, `EXISTS (SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=? AND fca.class_id=ar.class_id)`];
  const values: unknown[] = [activityId, officer.id];

  if (keyword) {
    where.push(`(u.full_name LIKE ? OR u.mssv LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    where.push(`ar.status = ?`);
    values.push(status);
  }

  if (Number.isFinite(classId) && classId > 0) {
    where.push(`ar.class_id = ?`);
    values.push(classId);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM activity_registrations ar
      INNER JOIN users u ON u.id = ar.user_id
      LEFT JOIN classes c ON c.id = ar.class_id
      ${whereSql}
      `
    )
    .get(...values) as { total: number };

  const registrationRows = db
    .prepare(
      `
      SELECT
        ar.id,
        ar.user_id,
        u.full_name,
        u.mssv,
        c.code AS class_code,
        c.name AS class_name,
        ar.status,
        ar.registered_at,
        ar.checked_in_at
      FROM activity_registrations ar
      INNER JOIN users u ON u.id = ar.user_id
      LEFT JOIN classes c ON c.id = ar.class_id
      ${whereSql}
      ORDER BY
        CASE ar.status
          WHEN 'registered' THEN 1
          WHEN 'attended' THEN 2
          ELSE 3
        END ASC,
        datetime(ar.registered_at) DESC,
        ar.id DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...values, pageSize, offset) as RegistrationRow[];

  const activity: FacultyOfficerActivityDetail = {
    id: Number(activityRow.id),
    title: String(activityRow.title ?? ""),
    description: String(activityRow.description ?? ""),
    organizerLevel: String(activityRow.organizer_level ?? "faculty"),
    audienceType: String(activityRow.audience_type ?? ""),
    status: String(activityRow.status ?? ""),
    startAt: String(activityRow.start_at ?? ""),
    endAt: String(activityRow.end_at ?? ""),
    registrationStartAt: String(activityRow.registration_start_at ?? ""),
    registrationEndAt: String(activityRow.registration_end_at ?? ""),
    conductScore: Number(activityRow.conduct_score ?? 0),
    qrCheckinEnabled: Number(activityRow.qr_checkin_enabled ?? 0) === 1,
    participants: Number(activityRow.participants ?? 0),
    attended: Number(activityRow.attended ?? 0),
  };

  const classes: FacultyOfficerActivityClassOption[] = classRows.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
  }));

  const registrations: FacultyOfficerActivityRegistrationItem[] =
    registrationRows.map((item) => ({
      id: Number(item.id),
      userId: Number(item.user_id),
      fullName: String(item.full_name ?? ""),
      mssv: String(item.mssv ?? ""),
      classCode: item.class_code ? String(item.class_code) : null,
      className: item.class_name ? String(item.class_name) : null,
      status: String(item.status ?? ""),
      registeredAt: String(item.registered_at ?? ""),
      checkedInAt: item.checked_in_at ? String(item.checked_in_at) : null,
    }));

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6">
      <FacultyOfficerActivityDetailHeader item={activity} />

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Sinh viên đăng ký" value={activity.participants} tone="blue" />
        <Metric label="Đã tham gia" value={activity.attended} tone="emerald" />
        <Metric label="Tỷ lệ tham gia" value={`${activity.participants ? Math.round(activity.attended / activity.participants * 100) : 0}%`} tone="amber" />
      </section>

      <FacultyOfficerActivityDetailCard activity={activity} assignedClassCount={classes.length} />

      <FacultyOfficerActivityRegistrationsTable
        items={registrations}
        classes={classes}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        searchParams={{
          keyword,
          status,
          classId: classId || undefined,
        }}
      />
    </main>
  );
}

function Metric({label,value,tone}:{label:string;value:number|string;tone:"blue"|"emerald"|"amber"}){const colors={blue:"text-blue-700",emerald:"text-emerald-700",amber:"text-amber-700"};return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="text-sm font-medium text-slate-500">{label}</div><div className={`mt-2 text-3xl font-semibold ${colors[tone]}`}>{value}</div></div>}
