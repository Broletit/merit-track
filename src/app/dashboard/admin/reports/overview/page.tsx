import {
  Activity,
  Award,
  BarChart3,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import ReportPageHeader from "@/components/admin/reports/ReportPageHeader";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import OverviewStatCard from "@/components/admin/reports/OverviewStatCard";
import OverviewReportCard from "@/components/admin/reports/OverviewReportCard";
import DonutChart from "@/components/admin/reports/DonutChart";
import HorizontalBarChart from "@/components/admin/reports/HorizontalBarChart";
import TrendLineChart from "@/components/admin/reports/TrendLineChart";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";
import {
  calculateOverviewRates,
  getAdminOverviewSummary,
} from "@/server/reports/getAdminOverviewSummary";

type SearchParams = Promise<{ termId?: string }>;
type ChartRow = { label: string; subLabel?: string; value: number };

export default async function AdminOverviewReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);
  const summary = getAdminOverviewSummary(selectedTerm.id);
  const rates = calculateOverviewRates(summary);

  const classParticipationChart = db
    .prepare(
      `
      WITH class_stats AS (
        SELECT
          c.id,
          c.code,
          c.name,
          COUNT(DISTINCT CASE
            WHEN u.role IN ('student', 'class_officer') AND u.is_active = 1
            THEN u.id END
          ) AS student_count,
          COUNT(DISTINCT CASE
            WHEN a.id IS NOT NULL THEN u.id END
          ) AS participant_count
        FROM classes c
        LEFT JOIN class_members cm ON cm.class_id = c.id
        LEFT JOIN users u ON u.id = cm.user_id
        LEFT JOIN activity_registrations ar
          ON ar.user_id = u.id AND ar.status = 'attended'
        LEFT JOIN activities a
          ON a.id = ar.activity_id AND a.term_id = ?
        WHERE c.is_active = 1
        GROUP BY c.id
      )
      SELECT
        code AS label,
        participant_count || '/' || student_count || ' sinh viên' AS subLabel,
        ROUND(100.0 * participant_count / NULLIF(student_count, 0)) AS value
      FROM class_stats
      WHERE student_count > 0
      ORDER BY value ASC, participant_count ASC, code ASC
      LIMIT 8
      `
    )
    .all(selectedTerm.id) as ChartRow[];

  const studentResultByClass = db
    .prepare(
      `
      WITH class_results AS (
        SELECT
          COALESCE(c.code, 'Chưa gán lớp') AS class_code,
          SUM(CASE WHEN s.status = 'passed' THEN 1 ELSE 0 END) AS passed_count,
          SUM(CASE WHEN s.status IN ('passed', 'failed') THEN 1 ELSE 0 END)
            AS finalized_count
        FROM submissions s
        INNER JOIN events e ON e.id = s.event_id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE e.type = 'student' AND e.term_id = ?
        GROUP BY c.id
      )
      SELECT
        class_code AS label,
        passed_count || '/' || finalized_count || ' hồ sơ có kết quả' AS subLabel,
        ROUND(100.0 * passed_count / NULLIF(finalized_count, 0)) AS value
      FROM class_results
      WHERE finalized_count > 0
      ORDER BY value ASC, finalized_count DESC, class_code ASC
      LIMIT 8
      `
    )
    .all(selectedTerm.id) as ChartRow[];

  const activityTrend = db.prepare(`
    SELECT strftime('%m/%Y', a.start_at) AS label,
      COUNT(CASE WHEN ar.status!='cancelled' THEN 1 END) AS primary_value,
      SUM(CASE WHEN ar.status='attended' THEN 1 ELSE 0 END) AS secondary_value
    FROM activities a
    LEFT JOIN activity_registrations ar ON ar.activity_id=a.id
    WHERE a.term_id=? AND a.audience_type='student' AND a.status='published'
    GROUP BY strftime('%Y-%m', a.start_at)
    ORDER BY strftime('%Y-%m', a.start_at)
  `).all(selectedTerm.id) as Array<{label:string;primary_value:number;secondary_value:number}>;

  return (
    <main className="space-y-6">
      <ReportPageHeader
        title="Tổng quan khoa"
        description="Phân tích mức độ tham gia, chất lượng hồ sơ và hiệu quả xử lý theo học kỳ."
        termSelect={<AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewStatCard
          icon={<UsersRound size={20} />}
          label="Bao phủ sinh viên"
          value={`${rates.studentCoverageRate}%`}
          hint={`${summary.unique_student_attendees}/${summary.active_students} sinh viên tham gia ít nhất một hoạt động`}
        />
        <OverviewStatCard
          icon={<Activity size={20} />}
          label="Tỷ lệ tham dự"
          value={`${rates.attendanceRate}%`}
          hint={`${summary.attended}/${summary.valid_attendance_records} lượt đã chốt, không tính hủy`}
        />
        <OverviewStatCard
          icon={<ClipboardCheck size={20} />}
          label="Tỷ lệ hồ sơ SV đạt"
          value={`${rates.studentPassRate}%`}
          hint={`${summary.student_passed}/${rates.finalizedStudent} hồ sơ đã có kết quả`}
        />
        <OverviewStatCard
          icon={<Award size={20} />}
          label="Tỷ lệ hồ sơ CB đạt"
          value={`${rates.officerPassRate}%`}
          hint={`${summary.officer_passed}/${rates.finalizedOfficer} hồ sơ đã có kết quả`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OverviewReportCard
          icon={<ClipboardCheck size={20} />}
          title="Luồng hồ sơ sinh viên"
          description={`${summary.student_submitted} hồ sơ đã nộp; không tính bản nháp.`}
        >
          <DonutChart items={submissionItems(
            summary.student_passed,
            summary.student_pending,
            summary.student_revision,
            summary.student_failed
          )} />
        </OverviewReportCard>

        <OverviewReportCard
          icon={<Award size={20} />}
          title="Luồng hồ sơ cán bộ"
          description={`${summary.officer_submitted} hồ sơ đã nộp; không tính bản nháp.`}
        >
          <DonutChart items={submissionItems(
            summary.officer_passed,
            summary.officer_pending,
            summary.officer_revision,
            summary.officer_failed
          )} />
        </OverviewReportCard>

        <OverviewReportCard
          icon={<BarChart3 size={20} />}
          title="Lớp cần cải thiện độ bao phủ"
          description="8 lớp có tỷ lệ sinh viên tham gia ít nhất một hoạt động thấp nhất."
        >
          <HorizontalBarChart items={classParticipationChart} valueLabel="%" />
        </OverviewReportCard>

        <OverviewReportCard
          icon={<ClipboardCheck size={20} />}
          title="Lớp có tỷ lệ hồ sơ đạt thấp"
          description="8 lớp có tỷ lệ đạt thấp nhất trên hồ sơ đã có kết luận."
        >
          <HorizontalBarChart items={studentResultByClass} valueLabel="%" />
        </OverviewReportCard>

        <OverviewReportCard
          icon={<Activity size={20} />}
          title="Xu hướng hoạt động sinh viên"
          description="Đăng ký và tham dự theo tháng; xem chi tiết điểm nghẽn tại báo cáo hoạt động sinh viên."
        >
          <TrendLineChart items={activityTrend.map((item)=>({label:item.label,primary:Number(item.primary_value??0),secondary:Number(item.secondary_value??0)}))} primaryLabel="Đăng ký" secondaryLabel="Tham dự" />
        </OverviewReportCard>
      </section>
    </main>
  );
}

function submissionItems(passed: number, pending: number, revision: number, failed: number) {
  return [
    { label: "Đạt", value: Number(passed), className: "#16a34a" },
    { label: "Chờ duyệt", value: Number(pending), className: "#2563eb" },
    { label: "Cần chỉnh sửa", value: Number(revision), className: "#f59e0b" },
    { label: "Không đạt", value: Number(failed), className: "#e11d48" },
  ];
}
