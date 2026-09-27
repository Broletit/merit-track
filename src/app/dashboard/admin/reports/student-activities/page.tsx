import { Activity, PieChart, Users } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
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
import DonutChart from "@/components/admin/reports/DonutChart";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";

type SearchParams = Promise<{
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
  const db = getDb();
  ensureActivityConductScores();
  
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);

  const activityId = Number(params.activityId ?? 0);
  const classId = Number(params.classId ?? 0);

  const classes = db
    .prepare(
      `
      SELECT id, code, name
      FROM classes
      WHERE is_active = 1
      ORDER BY code ASC
      `
    )
    .all() as ClassRow[];

  const activities = db
    .prepare(
      `
      SELECT id, title
      FROM activities
      WHERE term_id = ? AND audience_type = 'student' AND status = 'published'
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(selectedTerm.id) as ActivityRow[];

  const activityFilter = activityId > 0 ? "AND a.id = ?" : "";
  const classFilter = classId > 0 ? "AND cm.class_id = ?" : "";
  const filterValues = [
    selectedTerm.id,
    ...(activityId > 0 ? [activityId] : []),
    ...(classId > 0 ? [classId] : []),
  ];

  const summary = db
    .prepare(
      `
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
      `
    )
    .get(...filterValues) as {
    registrations: number;
    attended: number;
    activities: number;
    students: number;
  };

  const classChart = db
    .prepare(
      `
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
        ${classId > 0 ? "AND c.id = ?" : ""}
      GROUP BY c.id
      HAVING total > 0
      ORDER BY c.code ASC
      `
    )
    .all(
      selectedTerm.id,
      ...(activityId > 0 ? [activityId] : []),
      ...(classId > 0 ? [classId] : [])
    ) as Array<{ label: string; attended: number; total: number; value: number }>;

  const activityComparison = db
    .prepare(
      `
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
        ${activityId > 0 ? "AND a.id = ?" : ""}
        ${classId > 0 ? "AND EXISTS (SELECT 1 FROM class_members cm WHERE cm.user_id=ar.user_id AND cm.class_id=? AND cm.left_at IS NULL)" : ""}
      GROUP BY a.id
      HAVING registrations > 0
      ORDER BY registrations DESC, a.title ASC
      `
    )
    .all(
      selectedTerm.id,
      ...(activityId > 0 ? [activityId] : []),
      ...(classId > 0 ? [classId] : [])
    ) as Array<{ label: string; registrations: number; attended: number }>;

  const organizerDistribution = db.prepare(`
    SELECT
      CASE WHEN a.organizer_level = 'class' THEN 'Cấp lớp' ELSE 'Cấp khoa' END AS label,
      COUNT(DISTINCT a.id) AS value
    FROM activities a
    WHERE a.term_id = ?
      AND a.audience_type = 'student'
      AND a.status = 'published'
      ${activityId > 0 ? "AND a.id = ?" : ""}
      ${classId > 0 ? "AND EXISTS (SELECT 1 FROM activity_registrations ar INNER JOIN class_members cm ON cm.user_id = ar.user_id AND cm.left_at IS NULL WHERE ar.activity_id = a.id AND ar.status != 'cancelled' AND cm.class_id = ?)" : ""}
    GROUP BY a.organizer_level
    ORDER BY a.organizer_level ASC
  `).all(
    selectedTerm.id,
    ...(activityId > 0 ? [activityId] : []),
    ...(classId > 0 ? [classId] : [])
  ) as Array<{ label: string; value: number }>;

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
        <Stat label="Hoạt động trong kỳ" value={summary.activities ?? 0} />
        <Stat label="Sinh viên có dữ liệu" value={summary.students ?? 0} />
        <Stat label="Lượt đăng ký" value={summary.registrations ?? 0} />

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-medium text-slate-500">
            Tỉ lệ điểm danh
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">
            {attendedRate}%
          </div>
          <div className="mt-4">
            <ReportProgressBar value={attendedRate} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Bộ lọc báo cáo</h2>
        <div className="mt-5"><StudentActivityReportFilter activities={activities} classes={classes} /></div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <ReportCard icon={<Activity size={20} />} title="Hiệu quả tham dự theo hoạt động">
            <ActivityAttendanceRateChart items={activityComparison.map((item)=>({label:item.label,registrations:Number(item.registrations??0),attended:Number(item.attended??0)}))} />
          </ReportCard>
          <ReportCard icon={<PieChart size={20} />} title="Cơ cấu cấp tổ chức">
            <DonutChart centerLabel="hoạt động" items={organizerDistribution.map((item) => ({
              label: item.label,
              value: Number(item.value ?? 0),
              className: item.label === "Cấp khoa" ? "#2563eb" : "#16a34a",
            }))} />
          </ReportCard>
        </div>
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
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
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
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
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
