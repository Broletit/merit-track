import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { cohortClause } from "@/server/cohorts/sql";
import { addCohortFilter } from "@/server/cohorts/sql";
import { notFound } from "next/navigation";
import { Percent, UserCheck, Users } from "lucide-react";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import Pagination from "@/components/common/Pagination";
import FacultyOfficerActivityDetailHeader from "@/components/faculty-officer/activities/FacultyOfficerActivityDetailHeader";
import FacultyOfficerActivityDetailCard from "@/components/faculty-officer/activities/FacultyOfficerActivityDetailCard";
import FacultyOfficerActivityRegistrationsTable from "@/components/faculty-officer/activities/FacultyOfficerActivityRegistrationsTable";
import type {
  FacultyOfficerActivityClassOption,
  FacultyOfficerActivityDetail,
  FacultyOfficerActivityRegistrationItem,
} from "@/components/faculty-officer/activities/types";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";

type SearchParams = Promise<{ cohort?: string;
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
  params: Promise<{ cohort?: string; id: string }>;
  searchParams: SearchParams;
}) {
  await requireFacultyOfficerContext();

  const { id } = await params;
  const activityId = await getDatabase().resolveRouteRecordId(id);

  if (!Number.isFinite(activityId) || activityId <= 0) {
    notFound();
  }

  const sp = await searchParams;
  const db = getDatabase();
  (await ensureActivityConductScores());

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const keyword = String(sp.keyword ?? "").trim();
  const status = String(sp.status ?? "").trim();
  const classId = Number(sp.classId ?? 0);

  const activityRow = (await db.first(`
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
      WHERE a.id = ?
        AND a.audience_type = 'student'
      LIMIT 1
      `, [activityId])) as ActivityRow | undefined;

  if (!activityRow) {
    notFound();
  }

  const classRows = (await db.rows(`
      SELECT DISTINCT
        c.id,
        c.code,
        c.name
      FROM activity_registrations ar
      INNER JOIN classes c ON c.id = COALESCE(
        ar.class_id,
        (SELECT membership.class_id FROM class_members membership WHERE membership.user_id=ar.user_id AND membership.left_at IS NULL ORDER BY CAST(membership.joined_at AS DATETIME(3)) DESC,membership.id DESC LIMIT 1)
      )
      WHERE ar.activity_id = ? AND ar.status != 'cancelled' AND ${cohortClause(sp.cohort, 'c.cohort')}
      ORDER BY c.code ASC, c.name ASC
      `, [activityId])) as ClassRow[];

  const where: string[] = [`ar.activity_id = ?`, `ar.status != 'cancelled'`];
  const values: unknown[] = [activityId];
  addCohortFilter(where,values,sp.cohort,"u.cohort");

  if (keyword) {
    where.push(`(u.full_name LIKE ? OR u.mssv LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    where.push(`ar.status = ?`);
    values.push(status);
  }

  if (Number.isFinite(classId) && classId > 0) {
    where.push(`COALESCE(ar.class_id,(SELECT membership.class_id FROM class_members membership WHERE membership.user_id=ar.user_id AND membership.left_at IS NULL ORDER BY CAST(membership.joined_at AS DATETIME(3)) DESC,membership.id DESC LIMIT 1)) = ?`);
    values.push(classId);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = (await db.first(`
      SELECT COUNT(*) AS total
      FROM activity_registrations ar
      INNER JOIN users u ON u.id = ar.user_id
      LEFT JOIN classes c ON c.id = COALESCE(
        ar.class_id,
        (SELECT membership.class_id FROM class_members membership WHERE membership.user_id=ar.user_id AND membership.left_at IS NULL ORDER BY CAST(membership.joined_at AS DATETIME(3)) DESC,membership.id DESC LIMIT 1)
      )
      ${whereSql}
      `, [...values])) as { total: number };

  const registrationRows = (await db.rows(`
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
      LEFT JOIN classes c ON c.id = COALESCE(
        ar.class_id,
        (SELECT membership.class_id FROM class_members membership WHERE membership.user_id=ar.user_id AND membership.left_at IS NULL ORDER BY CAST(membership.joined_at AS DATETIME(3)) DESC,membership.id DESC LIMIT 1)
      )
      ${whereSql}
      ORDER BY
        CASE ar.status
          WHEN 'registered' THEN 1
          WHEN 'attended' THEN 2
          WHEN 'absent' THEN 3
          ELSE 3
        END ASC,
        CAST(ar.registered_at AS DATETIME(3)) DESC,
        ar.id DESC
      LIMIT ? OFFSET ?
      `, [...values, pageSize, offset])) as RegistrationRow[];

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
        <Metric icon={<Users size={20} />} label="Sinh viên đăng ký" value={activity.participants} />
        <Metric icon={<UserCheck size={20} />} label="Đã tham gia" value={activity.attended} />
        <Metric icon={<Percent size={20} />} label="Tỷ lệ tham gia" value={`${activity.participants ? Math.round(activity.attended / activity.participants * 100) : 0}%`} />
      </section>

      <FacultyOfficerActivityDetailCard activity={activity} />

      <div data-table-frame className="min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<FacultyOfficerActivityRegistrationsTable page={page}
        items={registrations}
        classes={classes}
      />
<Pagination totalResults={total} resultLabel="lượt đăng ký"
        page={page}
        totalPages={totalPages}
        searchParams={{ cohort: sp.cohort,
          keyword,
          status,
          classId: classId || undefined,
        }}
      />
</div>
    </main>
  );
}

function Metric({icon,label,value }:{icon:React.ReactNode;label:string;value:number|string;}){return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div></div>}
