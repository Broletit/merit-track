import Link from "next/link";
import { BarChart3, ClipboardCheck, Users } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import ReportPageHeader from "@/components/admin/reports/ReportPageHeader";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import ReportProgressBar from "@/components/admin/reports/ReportProgressBar";
import StudentAwardReportFilter from "@/components/admin/reports/StudentAwardReportFilter";
import DonutChart from "@/components/admin/reports/DonutChart";
import StudentAwardExportButtons from "@/components/admin/reports/StudentAwardExportButtons";
import AwardCriteriaBottleneckChart from "@/components/admin/reports/AwardCriteriaBottleneckChart";
import ClassSubmissionRateLineChart from "@/components/admin/reports/ClassSubmissionRateLineChart";
import ClassSubmissionAnalysisTable from "@/components/admin/reports/ClassSubmissionAnalysisTable";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";

type SearchParams = Promise<{
  termId?: string;
  eventId?: string;
  classId?: string;
}>;

type EventRow = {
  id: number;
  title: string;
};

type ClassRow = {
  id: number;
  code: string;
  name: string;
};

type MissingCriteriaRow = {
  label: string;
  subLabel: string | null;
  groupTitle: string;
  value: number;
};

export default async function StudentAwardsReportPage({
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

  const eventId = Number(params.eventId ?? 0);
  const classId = Number(params.classId ?? 0);

  const events = db
    .prepare(
      `
      SELECT id, title
      FROM events
      WHERE type = 'student'
        AND term_id = ?
      ORDER BY datetime(start_at) DESC, id DESC
      `
    )
    .all(selectedTerm.id) as EventRow[];

  const classes = db
    .prepare(
      `
      SELECT id, code, name
      FROM classes
      WHERE is_active = 1
      ORDER BY code ASC, id ASC
      `
    )
    .all() as ClassRow[];

  const filterWhere: string[] = ["e.type = 'student'", "e.term_id = ?", "s.submitted_at IS NOT NULL"];
  const values: unknown[] = [selectedTerm.id];

  if (eventId > 0) {
    filterWhere.push("e.id = ?");
    values.push(eventId);
  }

  if (classId > 0) {
    filterWhere.push("s.class_id = ?");
    values.push(classId);
  }

  const whereSql = `WHERE ${filterWhere.join(" AND ")}`;

  const summary = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN s.status = 'passed' THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN s.status IN ('needs_revision_v1','needs_revision_v2') THEN 1 ELSE 0 END) AS needs_revision,
        SUM(CASE WHEN s.status IN ('submitted_v1','submitted_v2') THEN 1 ELSE 0 END) AS pending
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      ${whereSql}
      `
    )
    .get(...values) as {
    total: number;
    passed: number;
    failed: number;
    needs_revision: number;
    pending: number;
  };

  const finalized = Number(summary.passed ?? 0) + Number(summary.failed ?? 0);
  const passRate =
    finalized > 0
      ? Math.round((Number(summary.passed ?? 0) / finalized) * 100)
      : 0;

  const classParticipation = classId === 0 ? db.prepare(`
    SELECT
      c.code AS label,
      COUNT(DISTINCT u.id) AS total_students,
      COUNT(DISTINCT submitted.user_id) AS submitted_students,
      COUNT(DISTINCT submitted.id) AS submissions,
      ROUND(100.0 * COUNT(DISTINCT submitted.user_id) / NULLIF(COUNT(DISTINCT u.id), 0)) AS value
    FROM classes c
    LEFT JOIN class_members cm ON cm.class_id = c.id AND cm.left_at IS NULL
    LEFT JOIN users u ON u.id = cm.user_id AND u.is_active = 1 AND u.role IN ('student','class_officer')
    LEFT JOIN (
      SELECT s.id, s.user_id, s.class_id
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      WHERE e.type = 'student' AND e.term_id = ? AND s.submitted_at IS NOT NULL
        ${eventId > 0 ? "AND e.id = ?" : ""}
    ) submitted ON submitted.user_id = u.id AND submitted.class_id = c.id
    WHERE c.is_active = 1
      ${eventId > 0 ? "AND (NOT EXISTS (SELECT 1 FROM event_scopes es WHERE es.event_id = ?) OR EXISTS (SELECT 1 FROM event_scopes es WHERE es.event_id = ? AND es.class_id = c.id))" : ""}
    GROUP BY c.id
    HAVING total_students > 0
    ORDER BY c.code ASC
  `).all(selectedTerm.id, ...(eventId > 0 ? [eventId, eventId, eventId] : [])) as Array<{
    label: string; total_students: number; submitted_students: number; submissions: number; value: number;
  }> : [];

  const classSubmissions = classId > 0 ? db.prepare(`
    SELECT
      s.id,
      u.mssv AS student_code,
      u.full_name AS student_name,
      e.title AS event_title,
      s.status,
      s.submitted_at,
      (SELECT COUNT(*) FROM event_criteria_items i WHERE i.event_id = s.event_id) AS total_criteria,
      (SELECT COUNT(DISTINCT i.code)
       FROM event_criteria_items i
       LEFT JOIN submission_auto_results ar ON ar.submission_id = s.id AND ar.criteria_code = i.code AND ar.passed = 1
       LEFT JOIN submission_files sf ON sf.submission_id = s.id AND sf.criteria_code = i.code
       LEFT JOIN submission_items si ON si.submission_id = s.id AND si.criteria_code = i.code
       WHERE i.event_id = s.event_id AND (
         (i.evidence_type = 'auto' AND ar.id IS NOT NULL)
         OR (i.evidence_type != 'auto' AND (
           ar.id IS NOT NULL OR sf.id IS NOT NULL OR NULLIF(TRIM(COALESCE(si.content_text, '')), '') IS NOT NULL
         ))
       )) AS completed_criteria,
      (SELECT decision FROM reviews r WHERE r.submission_id = s.id AND r.round = 1 LIMIT 1) AS round_one,
      (SELECT decision FROM reviews r WHERE r.submission_id = s.id AND r.round = 2 LIMIT 1) AS round_two
    FROM submissions s
    INNER JOIN events e ON e.id = s.event_id
    INNER JOIN users u ON u.id = s.user_id
    ${whereSql}
    ORDER BY datetime(s.submitted_at) DESC, u.full_name ASC
  `).all(...values) as Array<{
    id: number; student_code: string; student_name: string; event_title: string; status: string;
    submitted_at: string; total_criteria: number; completed_criteria: number; round_one: string | null; round_two: string | null;
  }> : [];


  const missingCriteria = db
    .prepare(
      `
      SELECT
        i.title AS label,
        i.code AS subLabel,
        COALESCE(g.title, 'Chưa xác định tiêu chuẩn') AS groupTitle,
        COUNT(DISTINCT s.id) AS value
      FROM submissions s
      INNER JOIN events e ON e.id = s.event_id
      INNER JOIN event_criteria_items i ON i.event_id = s.event_id
      LEFT JOIN event_criteria_groups g
        ON g.event_id = i.event_id
       AND g.code = i.group_code
      LEFT JOIN submission_auto_results ar
        ON ar.submission_id = s.id
       AND ar.criteria_code = i.code
       AND ar.passed = 1
      LEFT JOIN submission_files sf
        ON sf.submission_id = s.id
       AND sf.criteria_code = i.code
      LEFT JOIN submission_items si
        ON si.submission_id = s.id
       AND si.criteria_code = i.code
      ${whereSql}
        AND NOT (
          (i.evidence_type = 'auto' AND ar.id IS NOT NULL)
          OR (i.evidence_type != 'auto' AND (
            ar.id IS NOT NULL
            OR sf.id IS NOT NULL
            OR NULLIF(TRIM(COALESCE(si.content_text, '')), '') IS NOT NULL
          ))
        )
      GROUP BY g.code, g.title, i.code, i.title
      ORDER BY value DESC, i.sort_order ASC
      LIMIT 10
      `
    )
    .all(...values) as MissingCriteriaRow[];

  return (
    <main className="space-y-6">
      <ReportPageHeader
        title="Báo cáo xét thưởng sinh viên"
        termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tổng hồ sơ" value={summary.total ?? 0} />
        <Stat label="Đã đạt" value={summary.passed ?? 0} />
        <Stat label="Cần chỉnh sửa" value={summary.needs_revision ?? 0} />

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-medium text-slate-500">Tỉ lệ đạt trên hồ sơ đã kết luận</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{passRate}%</div>
          <div className="mt-4">
            <ReportProgressBar value={passRate} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Bộ lọc báo cáo</h2>
        <div className="mt-5">
          <StudentAwardReportFilter events={events} classes={classes} />
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <ReportCard icon={<BarChart3 size={20} />} title="10 tiêu chí còn thiếu nhiều nhất">
            <AwardCriteriaBottleneckChart
              totalSubmissions={Number(summary.total ?? 0)}
              items={missingCriteria.map((item) => ({
              code: item.subLabel ?? "-",
              label: item.label,
              groupLabel: item.groupTitle,
              value: Number(item.value ?? 0),
              }))}
            />
          </ReportCard>

          <ReportCard icon={<ClipboardCheck size={20} />} title="Cơ cấu trạng thái hồ sơ">
            <DonutChart
              centerLabel="hồ sơ"
              items={[
                { label: "Đạt", value: Number(summary.passed ?? 0), className: "#16a34a" },
                { label: "Chờ duyệt", value: Number(summary.pending ?? 0), className: "#2563eb" },
                { label: "Cần chỉnh sửa", value: Number(summary.needs_revision ?? 0), className: "#f59e0b" },
                { label: "Không đạt", value: Number(summary.failed ?? 0), className: "#e11d48" },
              ]}
            />
          </ReportCard>
        </div>

        <ReportCard
          icon={<Users size={20} />}
          title={classId > 0 ? "Phân tích hồ sơ của lớp đã chọn" : "Tỷ lệ sinh viên tham gia xét theo lớp"}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <StudentAwardExportButtons termId={selectedTerm.id} eventId={eventId} classId={classId} />
              <Link href="/dashboard/admin/submissions" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Xem chi tiết
              </Link>
            </div>
          )}
        >
          {classId > 0 ? (
            <ClassSubmissionAnalysisTable
              items={classSubmissions.map((item) => ({
                id: Number(item.id),
                studentCode: item.student_code,
                studentName: item.student_name,
                eventTitle: item.event_title,
                status: item.status,
                submittedAt: item.submitted_at,
                completedCriteria: Number(item.completed_criteria ?? 0),
                totalCriteria: Number(item.total_criteria ?? 0),
                missingCriteria: Math.max(0, Number(item.total_criteria ?? 0) - Number(item.completed_criteria ?? 0)),
                roundOne: item.round_one,
                roundTwo: item.round_two,
              }))}
            />
          ) : (
            <ClassSubmissionRateLineChart
              items={classParticipation.map((item) => ({
                label: item.label,
                value: Number(item.value ?? 0),
                submittedStudents: Number(item.submitted_students ?? 0),
                totalStudents: Number(item.total_students ?? 0),
                submissions: Number(item.submissions ?? 0),
              }))}
            />
          )}
        </ReportCard>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
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
  actions,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
        </div>
        {actions}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
