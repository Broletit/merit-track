import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import { cohortClause } from "@/server/cohorts/sql";
import { Activity, PieChart, Users } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";
import ReportPageHeader from "@/components/admin/reports/ReportPageHeader";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ReportProgressBar from "@/components/admin/reports/ReportProgressBar";
import StudentActivityReportFilter from "@/components/admin/reports/StudentActivityReportFilter";
import ActivityAttendanceRateChart from "@/components/admin/reports/ActivityAttendanceRateChart";
import ClassParticipationLineChart from "@/components/admin/reports/ClassParticipationLineChart";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";

type SearchParams = Promise<{ cohort?: string;
  termId?: string;
  activityId?: string;
  classId?: string;
}>;

type ActivityRow = {
  id: number;
  title: string;
};

type ClassRow = {
  id: number;
  code: string;
  name: string;
};

export default async function StudentActivitiesReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDatabase();
  (await ensureActivityConductScores());
  
  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));

  const activityId = Number(params.activityId ?? 0);
  const classId = Number(params.classId ?? 0);

  const classes = (await db.rows(`
      SELECT id, code, name
      FROM classes
      WHERE is_active = 1 AND ${cohortClause(params.cohort, "cohort")}
      ORDER BY code ASC
      `, [])) as ClassRow[];

  const activities = (await db.rows(`
      SELECT id, title
      FROM activities
      WHERE term_id = ? AND audience_type = 'student' AND status = 'published'
      ORDER BY CAST(start_at AS DATETIME(3)) DESC, id DESC
      `, [selectedTerm.id])) as ActivityRow[];

  const activityFilter = activityId > 0 ? "AND a.id = ?" : "";
  const classFilter = classId > 0 ? "AND cm.class_id = ?" : "";
  const filterValues = [
    selectedTerm.id,
    ...(activityId > 0 ? [activityId] : []),
    ...(classId > 0 ? [classId] : []),
  ];

  const summary = (await db.first(`
      SELECT
        COUNT(ar.id) AS registrations,
        SUM(CASE WHEN ar.status = 'attended' THEN 1 ELSE 0 END) AS attended,
        COUNT(DISTINCT a.id) AS activities,
        COUNT(DISTINCT u.id) AS students
      FROM activities a
      LEFT JOIN activity_registrations ar ON ar.activity_id = a.id
      LEFT JOIN users u ON u.id = ar.user_id
      LEFT JOIN class_members cm ON cm.user_id = u.id AND cm.left_at IS NULL
      WHERE a.term_id = ?
        AND a.audience_type = 'student'
        AND a.status = 'published'
        AND (u.role IN ('student', 'class_officer') OR u.id IS NULL)
        AND (ar.id IS NULL OR ar.status != 'cancelled')
        ${activityFilter}
        ${classFilter}
        AND ${cohortClause(params.cohort,"u.cohort")}
      `, [...filterValues])) as {
    registrations: number;
    attended: number;
    activities: number;
    students: number;
  };

  const classChart = (await db.rows(`
      SELECT
        c.code AS label,
        COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN u.id END) AS attended,
        COUNT(DISTINCT CASE WHEN u.is_active=1 THEN u.id END) AS total,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN u.id END) /
          NULLIF(COUNT(DISTINCT CASE WHEN u.is_active=1 THEN u.id END), 0)) AS value
      FROM classes c
      LEFT JOIN class_members cm ON cm.class_id = c.id AND cm.left_at IS NULL
      LEFT JOIN users u ON u.id = cm.user_id AND u.role IN ('student','class_officer') AND u.is_active=1
      LEFT JOIN activity_registrations ar
        ON ar.user_id = u.id
       AND ar.status = 'attended'
      LEFT JOIN activities a
        ON a.id = ar.activity_id
       AND a.term_id = ? AND a.audience_type='student' AND a.status='published'
       ${activityId > 0 ? "AND a.id = ?" : ""}
      WHERE c.is_active = 1
        AND ${cohortClause(params.cohort,"u.cohort")}
        ${classId > 0 ? "AND c.id = ?" : ""}
      GROUP BY c.id
      HAVING total > 0
      ORDER BY c.code ASC
      `, [selectedTerm.id, ...(activityId > 0 ? [activityId] : []), ...(classId > 0 ? [classId] : [])])) as Array<{ label: string; attended: number; total: number; value: number }>;

  const activityComparison = (await db.rows(`
      SELECT
        a.title AS label,
        COUNT(CASE WHEN ar.status != 'cancelled' THEN 1 END) AS registrations,
        SUM(CASE WHEN ar.status='attended' THEN 1 ELSE 0 END) AS attended
      FROM activities a
      LEFT JOIN activity_registrations ar
        ON ar.activity_id = a.id
      WHERE a.term_id = ?
        AND a.audience_type='student'
        AND a.status='published'
        AND ${cohortClause(params.cohort,"(SELECT cohort FROM users WHERE id=ar.user_id)")}
        ${activityId > 0 ? "AND a.id = ?" : ""}
        ${classId > 0 ? "AND EXISTS (SELECT 1 FROM class_members cm WHERE cm.user_id=ar.user_id AND cm.class_id=? AND cm.left_at IS NULL)" : ""}
      GROUP BY a.id
      HAVING registrations > 0
      ORDER BY registrations DESC, a.title ASC
      `, [selectedTerm.id, ...(activityId > 0 ? [activityId] : []), ...(classId > 0 ? [classId] : [])])) as Array<{ label: string; registrations: number; attended: number }>;

  const organizerDistribution = (await db.rows(`
    SELECT
      CASE WHEN a.organizer_level = 'class' THEN 'Cấp lớp' ELSE 'Cấp khoa' END AS label,
      COUNT(DISTINCT a.id) AS value
    FROM activities a
    WHERE a.term_id = ?
      AND a.audience_type = 'student'
      AND a.status = 'published'
      ${activityId > 0 ? "AND a.id = ?" : ""}
      ${classId > 0 ? "AND EXISTS (SELECT 1 FROM activity_registrations ar INNER JOIN class_members cm ON cm.user_id = ar.user_id AND cm.left_at IS NULL WHERE ar.activity_id = a.id AND ar.status != 'cancelled' AND cm.class_id = ?)" : ""}
      AND ${params.cohort ? `EXISTS(SELECT 1 FROM activity_registrations cohort_ar JOIN users cohort_u ON cohort_u.id=cohort_ar.user_id WHERE cohort_ar.activity_id=a.id AND ${cohortClause(params.cohort,"cohort_u.cohort")})` : "1=1"}
    GROUP BY a.organizer_level
    ORDER BY a.organizer_level ASC
  `, [selectedTerm.id, ...(activityId > 0 ? [activityId] : []), ...(classId > 0 ? [classId] : [])])) as Array<{ label: string; value: number }>;

  const attendedRate =
    Number(summary.registrations ?? 0) > 0
      ? Math.round(
          (Number(summary.attended ?? 0) / Number(summary.registrations ?? 0)) *
            100
        )
      : 0;

  return (
    <main className="space-y-6">
      <ReportPageHeader
        title="Báo cáo hoạt động sinh viên"
        termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Activity size={20} />} label="Hoạt động trong kỳ" value={summary.activities ?? 0} />
        <Stat icon={<Users size={20} />} label="Sinh viên có dữ liệu" value={summary.students ?? 0} />
        <Stat icon={<PieChart size={20} />} label="Lượt đăng ký" value={summary.registrations ?? 0} />

        <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
          <div className="flex items-center justify-between gap-3"><div className={statCardStyles.label}>Tỉ lệ điểm danh</div><div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}><PieChart size={20} /></div></div>
          <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>
            {attendedRate}%
          </div>
          <div className="mt-4">
            <ReportProgressBar value={attendedRate} />
          </div>
        </div>
      </section>

      <section className="space-y-6">
          <ReportCard icon={<Activity size={20} />} title="Hiệu quả tham dự theo hoạt động">
            <div className="mb-6"><StudentActivityReportFilter activities={activities} classes={classes} /></div>
            <ActivityAttendanceRateChart items={activityComparison.map((item)=>({label:item.label,registrations:Number(item.registrations??0),attended:Number(item.attended??0)}))} />
          </ReportCard>
        <ReportCard
          icon={<Users size={20} />}
          title="Tỷ lệ sinh viên tham gia theo lớp"
        >
          <ClassParticipationLineChart items={classChart.map((item)=>({label:item.label,value:Number(item.value??0),attended:Number(item.attended??0),total:Number(item.total??0)}))}/>
        </ReportCard>
      </section>
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
  value: string | number;
}) {
  return (
    <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className="flex items-center justify-between gap-3"><div className={statCardStyles.label}>{label}</div><div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</div></div>
      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>
    </div>
  );
}

function ReportCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
