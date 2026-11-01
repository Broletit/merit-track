import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { classActivityVisibleSql } from "@/server/cohorts/sql";
import Link from "next/link";
import {
  CalendarCheck,
  ClipboardList,
  FileStack,
  Users,
} from "lucide-react";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ActivityAttendanceRateChart from "@/components/admin/reports/ActivityAttendanceRateChart";
import DonutChart from "@/components/admin/reports/DonutChart";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{
  termId?: string;
}>;

type Summary = {
  assigned_classes: number;
  students: number;
  activities: number;
  activity_registrations: number;
  activity_attended: number;
  submissions: number;
  pending_reviews: number;
  passed: number;
};

type PendingReviewRow = {
  id: number;
  event_title: string;
  student_name: string;
  mssv: string;
  class_code: string;
  updated_at: string;
};

type ClassRow = {
  id: number;
  code: string;
  name: string;
};
type CountRow = { label: string; value: number };

export default async function FacultyOfficerDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireFacultyOfficerContext();

  const params = await searchParams;
  const db = getDatabase();

  const terms = (await getAcademicTermsForSelect());
  const term = (await getAcademicTermForView(params.termId));

  const classRows = (await db.rows(`
      SELECT DISTINCT c.id, c.code, c.name
      FROM faculty_class_assignments fca
      INNER JOIN classes c ON c.id = fca.class_id
      WHERE fca.faculty_officer_id = ?
        AND c.is_active = 1
      ORDER BY c.code ASC
      `, [user.id])) as ClassRow[];

  const classIds = classRows.map((item) => Number(item.id));
  const classPlaceholders = classIds.length
    ? classIds.map(() => "?").join(",")
    : "NULL";

  const activityHasTermId = (
    (await db.rows(`SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='activities'`, [])) as { name: string }[]
  ).some((item) => item.name === "term_id");

  const activityTermFilter = activityHasTermId ? "AND a.term_id = ?" : "";
  const activityTermValues = activityHasTermId ? [term.id] : [];

  const summary = classIds.length
    ? ((await db.first(`
          SELECT
            (
              SELECT COUNT(DISTINCT c.id)
              FROM classes c
              WHERE c.id IN (${classPlaceholders})
            ) AS assigned_classes,

            (
              SELECT COUNT(DISTINCT u.id)
              FROM users u
              INNER JOIN class_members cm ON cm.user_id = u.id
              WHERE cm.class_id IN (${classPlaceholders})
                AND u.role = 'student'
                AND u.is_active = 1
            ) AS students,

            (
              SELECT COUNT(*)
              FROM activities a
              WHERE a.status = 'published'
                AND a.audience_type = 'student'
              ${activityTermFilter}
                AND EXISTS (SELECT 1 FROM faculty_class_assignments fca WHERE fca.faculty_officer_id=? AND ${classActivityVisibleSql("a","fca.class_id")})
            ) AS activities,

            (
              SELECT COUNT(*)
              FROM activity_registrations ar
              INNER JOIN activities a ON a.id = ar.activity_id
              INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL
              WHERE cm.class_id IN (${classPlaceholders})
              ${activityTermFilter}
            ) AS activity_registrations,

            (
              SELECT COUNT(*)
              FROM activity_registrations ar
              INNER JOIN activities a ON a.id = ar.activity_id
              INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL
              WHERE ar.status = 'attended' AND cm.class_id IN (${classPlaceholders})
              ${activityTermFilter}
            ) AS activity_attended,

            (
              SELECT COUNT(*)
              FROM submissions s
              INNER JOIN events e ON e.id = s.event_id
              WHERE s.class_id IN (${classPlaceholders})
                AND e.type = 'student'
                AND e.term_id = ?
                AND s.submitted_at IS NOT NULL
            ) AS submissions,

            (
              SELECT COUNT(*)
              FROM submissions s
              INNER JOIN events e ON e.id = s.event_id
              WHERE s.class_id IN (${classPlaceholders})
                AND e.type = 'student'
                AND e.term_id = ?
                AND s.status IN ('submitted_v1','submitted_v2')
            ) AS pending_reviews,

            (
              SELECT COUNT(*)
              FROM submissions s
              INNER JOIN events e ON e.id = s.event_id
              WHERE s.class_id IN (${classPlaceholders})
                AND e.type = 'student'
                AND e.term_id = ?
                AND s.status = 'passed'
            ) AS passed
          `, [...classIds, ...classIds, ...activityTermValues, user.id, ...classIds, ...activityTermValues, ...classIds, ...activityTermValues, ...classIds, term.id, ...classIds, term.id, ...classIds, term.id])) as Summary)
    : {
        assigned_classes: 0,
        students: 0,
        activities: 0,
        activity_registrations: 0,
        activity_attended: 0,
        submissions: 0,
        pending_reviews: 0,
        passed: 0,
      };

  const pendingReviews = classIds.length
    ? ((await db.rows(`
          SELECT
            s.id,
            e.title AS event_title,
            u.full_name AS student_name,
            u.mssv,
            c.code AS class_code,
            s.updated_at
          FROM submissions s
          INNER JOIN events e ON e.id = s.event_id
          INNER JOIN users u ON u.id = s.user_id
          LEFT JOIN classes c ON c.id = s.class_id
          WHERE s.class_id IN (${classPlaceholders})
            AND e.type = 'student'
            AND e.term_id = ?
            AND s.status IN ('submitted_v1','submitted_v2')
          ORDER BY CAST(s.updated_at AS DATETIME(3)) ASC, s.id ASC
          LIMIT 5
          `, [...classIds, term.id])) as PendingReviewRow[])
    : [];

  const facultyActivitySummary = (await db.first(`
    SELECT COUNT(DISTINCT a.id) activities,
      COUNT(CASE WHEN ar.status!='cancelled' THEN 1 END) registrations,
      COUNT(CASE WHEN ar.status='attended' THEN 1 END) attended
    FROM activities a
    LEFT JOIN activity_registrations ar ON ar.activity_id=a.id
    WHERE a.term_id=? AND a.audience_type='student' AND a.status IN ('published','closed')
  `, [term.id])) as { activities: number; registrations: number; attended: number };
  const activityComparison = (await db.rows(`
    SELECT a.title AS label,
      COUNT(CASE WHEN ar.status != 'cancelled' THEN 1 END) AS registrations,
      COUNT(CASE WHEN ar.status = 'attended' THEN 1 END) AS attended
    FROM activities a
    LEFT JOIN activity_registrations ar ON ar.activity_id = a.id
    WHERE a.term_id = ? AND a.audience_type = 'student' AND a.status IN ('published','closed')
    GROUP BY a.id, a.title
    ORDER BY attended DESC, registrations DESC, CAST(a.start_at AS DATETIME(3)) DESC
    LIMIT 10
  `, [term.id])) as Array<{ label: string; registrations: number; attended: number }>;
  const submissionProgress = classIds.length ? (await db.rows(`
    SELECT CASE
      WHEN s.status = 'passed' THEN 'Đạt'
      WHEN s.status = 'failed' THEN 'Không đạt'
      WHEN s.status LIKE 'needs_revision%' THEN 'Cần bổ sung'
      ELSE 'Chờ duyệt'
    END AS label, COUNT(*) AS value
    FROM submissions s
    INNER JOIN events e ON e.id = s.event_id
    WHERE s.class_id IN (${classPlaceholders}) AND e.type = 'student' AND e.term_id = ? AND s.submitted_at IS NOT NULL
    GROUP BY CASE
      WHEN s.status = 'passed' THEN 'Đạt'
      WHEN s.status = 'failed' THEN 'Không đạt'
      WHEN s.status LIKE 'needs_revision%' THEN 'Cần bổ sung'
      ELSE 'Chờ duyệt'
    END
  `, [...classIds, term.id])) as CountRow[] : [];
  const activityLevels = (await db.rows(`
    SELECT CASE WHEN a.organizer_level = 'class' THEN 'Cấp chi đoàn' ELSE 'Cấp khoa' END AS label, COUNT(*) AS value
    FROM activities a
    WHERE a.term_id = ? AND a.audience_type = 'student' AND a.status IN ('published','closed')
    GROUP BY CASE WHEN a.organizer_level = 'class' THEN 'Cấp chi đoàn' ELSE 'Cấp khoa' END
  `, [term.id])) as CountRow[];
  summary.activities = Number(facultyActivitySummary.activities ?? 0);
  summary.activity_registrations = Number(facultyActivitySummary.registrations ?? 0);
  summary.activity_attended = Number(facultyActivitySummary.attended ?? 0);

  const attendedRate =
    Number(summary.activity_registrations ?? 0) > 0
      ? Math.round(
          (Number(summary.activity_attended ?? 0) /
            Number(summary.activity_registrations ?? 0)) *
            100
        )
      : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard cán bộ khoa</h1>
          </div>

          <AcademicTermSelect variant="header" terms={terms} selectedTermId={term.id} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Users size={20} />}
          label="Lớp phụ trách"
          value={summary.assigned_classes ?? 0}
        />

        <Stat
          icon={<CalendarCheck size={20} />}
          label="Tỉ lệ điểm danh hoạt động"
          value={`${attendedRate}%`}
        />

        <Stat
          icon={<FileStack size={20} />}
          label="Hồ sơ các lớp phụ trách"
          value={summary.submissions ?? 0}
        />

        <Stat
          icon={<ClipboardList size={20} />}
          label="Hồ sơ chờ duyệt"
          value={summary.pending_reviews ?? 0}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60 xl:col-span-2">
          <div className="flex items-center gap-2 text-slate-900"><span className="text-blue-700"><CalendarCheck size={20} /></span><h2 className="text-xl font-semibold">Hiệu quả tham gia hoạt động</h2></div>
          <div className="mt-5"><ActivityAttendanceRateChart items={activityComparison.map((item) => ({ label: item.label, registrations: Number(item.registrations ?? 0), attended: Number(item.attended ?? 0) }))} /></div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><h2 className="text-xl font-semibold text-slate-900">Tiến độ xét duyệt hồ sơ</h2><div className="mt-5"><DonutChart items={submissionProgress.map((item) => ({label:item.label,value:Number(item.value ?? 0),className:item.label === "Đạt" ? "#16a34a" : item.label === "Không đạt" ? "#ef4444" : item.label === "Cần bổ sung" ? "#f59e0b" : "#2563eb"}))} /></div></div>
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><h2 className="text-xl font-semibold text-slate-900">Cơ cấu hoạt động theo cấp</h2><div className="mt-5"><DonutChart items={activityLevels.map((item) => ({label:item.label,value:Number(item.value ?? 0),className:item.label === "Cấp chi đoàn" ? "#2563eb" : "#16a34a"}))} centerLabel="hoạt động" /></div></div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
          <h2 className="text-xl font-semibold text-slate-900">
            Hồ sơ cần duyệt
          </h2>

          <div className="mt-5 space-y-3">
            {pendingReviews.length > 0 ? (
              pendingReviews.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/faculty-officer/reviews/${item.id}`}
                  className="block rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {item.student_name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.mssv} · {item.class_code} · {item.event_title}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 shadow-md shadow-slate-200/60">
                Không có hồ sơ chờ duyệt vòng 2.
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-900">Lớp được phân công</h2><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Users size={18} /></div></div>
          <div className="mt-3 text-sm leading-7 text-slate-700">{classRows.length > 0 ? classRows.map((item) => item.code).join(", ") : "Chưa được phân công lớp"}</div>
        </div>
      </section>

      {!classIds.length ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100 shadow-md shadow-slate-200/60">
          Tài khoản chưa được phân công lớp để theo dõi đợt xét và duyệt hồ sơ.
        </section>
      ) : null}

    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className={statCardStyles.label}>{label}</div>
        <div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>
          {icon}
        </div>
      </div>

      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>
    </div>
  );
}

