import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  School,
  UsersRound,
} from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import DonutChart from "@/components/admin/reports/DonutChart";
import ReportProgressBar from "@/components/admin/reports/ReportProgressBar";
import {
  getAcademicTermForView,
  getAcademicTermsForSelect,
} from "@/server/academic-terms/getAcademicTermForView";
import {
  calculateOverviewRates,
  getAdminOverviewSummary,
} from "@/server/reports/getAdminOverviewSummary";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";

type SearchParams = Promise<{ termId?: string }>;
type ClosingEvent = {
  id: number;
  title: string;
  end_at: string;
  submitted_count: number;
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();
  const params = await searchParams;
  const db = getDatabase();
  const terms = (await getAcademicTermsForSelect());

  if (terms.length === 0) {
    redirect("/dashboard/admin/academic-terms");
  }

  const term = (await getAcademicTermForView(params.termId));
  const summary = (await getAdminOverviewSummary(term.id));
  const rates = calculateOverviewRates(summary);

  const closingEvents = (await db.rows(`
      SELECT e.id, e.title, e.end_at,
        COUNT(CASE WHEN s.status <> 'draft' AND s.submitted_at IS NOT NULL THEN 1 END)
          AS submitted_count
      FROM events e
      LEFT JOIN submissions s ON s.event_id = e.id
      WHERE e.term_id = ? AND e.status = 'published'
        AND CAST(e.end_at AS DATETIME(3)) >= CURRENT_TIMESTAMP(3)
        AND CAST(e.end_at AS DATETIME(3)) <= DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
      GROUP BY e.id
      ORDER BY CAST(e.end_at AS DATETIME(3)) ASC
      LIMIT 3
      `, [term.id])) as ClosingEvent[];

  const submittedTotal = summary.student_submitted + summary.officer_submitted;
  const passedTotal = summary.student_passed + summary.officer_passed;
  const failedTotal = summary.student_failed + summary.officer_failed;
  const pendingTotal = summary.student_pending + summary.officer_pending;
  const finalizedTotal = passedTotal + failedTotal;
  const completionRate =
    submittedTotal > 0 ? Math.round((finalizedTotal / submittedTotal) * 100) : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">Dashboard quản trị</h1>
          </div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={term.id} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={<UsersRound size={20} />}
          label="Sinh viên đang quản lý"
          value={summary.active_students}
          details={<><span className="whitespace-nowrap rounded-xl bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-700">{summary.active_student_only} Sinh viên</span><span className="whitespace-nowrap rounded-xl bg-violet-50 px-3 py-2 text-center text-xs font-semibold text-violet-700">{summary.active_officers} Cán bộ</span></>}
          href="/dashboard/admin/users"
        />
        <OverviewCard
          icon={<School size={20} />}
          label="Lớp đang quản lý"
          value={summary.active_classes}
          hint="Các lớp còn hoạt động trong hệ thống"
          href="/dashboard/admin/classes"
        />
        <OverviewCard
          icon={<Activity size={20} />}
          label="Hoạt động trong học kỳ"
          value={summary.term_activities}
          hint={`${summary.completed_activities} hoạt động đã kết thúc`}
          href="/dashboard/admin/activities"
        />
        <SubmissionOverviewCard
          total={submittedTotal}
          studentTotal={summary.student_submitted}
          officerTotal={summary.officer_submitted}
          termId={term.id}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="hidden rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
          <div className="flex items-start justify-between gap-3">
            <div>
            <h2 className="text-xl font-semibold text-slate-900">Tiến độ vận hành học kỳ</h2>
            </div>
            <Link
              href="/dashboard/admin/reports"
              className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Xem báo cáo
            </Link>
          </div>

          <div className="mt-6 space-y-6">
            <RateRow
              label="Sinh viên đã tham gia ít nhất một hoạt động"
              value={rates.studentCoverageRate}
              detail={`${summary.unique_student_attendees}/${summary.active_students} sinh viên`}
            />
            <RateRow
              label="Tỷ lệ có mặt sau khi chốt điểm danh"
              value={rates.attendanceRate}
              detail={`${summary.attended}/${summary.valid_attendance_records} lượt`}
            />
            <RateRow
              label="Hồ sơ đã hoàn tất xét duyệt"
              value={completionRate}
              detail={`${finalizedTotal}/${submittedTotal} hồ sơ đã nộp`}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
          <h2 className="text-xl font-semibold text-slate-900">
            Hồ sơ sinh viên
          </h2>
          <div className="mt-6">
            <DonutChart
              items={[
                { label: "Đạt", value: summary.student_passed, className: "#16a34a" },
                { label: "Chờ duyệt", value: summary.student_pending, className: "#2563eb" },
                { label: "Cần chỉnh sửa", value: summary.student_revision, className: "#f59e0b" },
                { label: "Không đạt", value: summary.student_failed, className: "#e11d48" },
              ]}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
          <h2 className="text-xl font-semibold text-slate-900">
            Hồ sơ cán bộ
          </h2>
          <div className="mt-6">
            <DonutChart
              items={[
                { label: "Đạt", value: summary.officer_passed, className: "#16a34a" },
                { label: "Chờ duyệt", value: summary.officer_pending, className: "#2563eb" },
                { label: "Cần chỉnh sửa", value: summary.officer_revision, className: "#f59e0b" },
                { label: "Không đạt", value: summary.officer_failed, className: "#e11d48" },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-amber-500" size={22} />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cảnh báo cần chú ý</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <AlertCard
            icon={<ClipboardCheck size={18} />}
            value={pendingTotal}
            label="Hồ sơ cán bộ chờ duyệt"
            href="/dashboard/admin/submissions"
          />
          <AlertCard
            icon={<Activity size={18} />}
            value={summary.unresolved_attendance}
            label="Hoạt động chưa chốt điểm danh"
            href="/dashboard/admin/activities"
          />
          <AlertCard
            icon={<CalendarClock size={18} />}
            value={closingEvents.length}
            label="Đợt xét đóng trong 7 ngày"
            href="/dashboard/admin/events"
          />
        </div>

        {closingEvents.length > 0 ? (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarClock size={16} /> Đợt xét gần hạn
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {closingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/admin/events/${event.id}`}
                  className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-slate-100"
                >
                  <div className="truncate text-sm font-semibold text-slate-900">{event.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDateTimeVN(event.end_at)} · {event.submitted_count} hồ sơ
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function OverviewCard({ icon, label, value, hint, href, details }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  href: string;
  details?: React.ReactNode;
}) {
  return (
    <Link href={href} className={[statCardStyles.card, "min-w-0 transition"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className={statCardStyles.label}>{label}</div>
        <div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</div>
      </div>
      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>
      {hint ? <div className={[statCardStyles.label, "mt-1 leading-5"].join(" ")}>{hint}</div> : null}
      {details ? <div className="mt-3 grid grid-cols-2 gap-2">{details}</div> : null}
    </Link>
  );
}

function SubmissionOverviewCard({ total, studentTotal, officerTotal, termId }: {
  total: number;
  studentTotal: number;
  officerTotal: number;
  termId: number;
}) {
  return (
    <article className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className={statCardStyles.label}>Hồ sơ đã nộp</div>
        <div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>
          <ClipboardCheck size={20} />
        </div>
      </div>
      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{total}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href={`/dashboard/admin/submissions?termId=${termId}`} className="whitespace-nowrap rounded-xl bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
          {studentTotal} Sinh viên
        </Link>
        <Link href={`/dashboard/admin/officer-reviews?termId=${termId}`} className="whitespace-nowrap rounded-xl bg-violet-50 px-3 py-2 text-center text-xs font-semibold text-violet-700 transition hover:bg-violet-100">
          {officerTotal} Cán bộ
        </Link>
      </div>
    </article>
  );
}

function RateRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-800">{label}</div>
          <div className="mt-0.5 text-xs text-slate-500">{detail}</div>
        </div>
        <div className="text-2xl font-bold text-blue-700">{value}%</div>
      </div>
      <ReportProgressBar value={value} />
    </div>
  );
}

function AlertCard({ icon, value, label, href }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className={[statCardStyles.card, "min-w-0 transition"].join(" ")}>
      <div className="flex items-center justify-between gap-3"><div className={statCardStyles.label}>{label}</div><div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</div></div>
      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>
    </Link>
  );
}
