import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  School,
  UsersRound,
} from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
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
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const term = getAcademicTermForView(params.termId);
  const summary = getAdminOverviewSummary(term.id);
  const rates = calculateOverviewRates(summary);

  const closingEvents = db
    .prepare(
      `
      SELECT e.id, e.title, e.end_at,
        COUNT(CASE WHEN s.status <> 'draft' AND s.submitted_at IS NOT NULL THEN 1 END)
          AS submitted_count
      FROM events e
      LEFT JOIN submissions s ON s.event_id = e.id
      WHERE e.term_id = ? AND e.status = 'published'
        AND datetime(e.end_at) >= datetime('now')
        AND datetime(e.end_at) <= datetime('now', '+7 days')
      GROUP BY e.id
      ORDER BY datetime(e.end_at) ASC
      LIMIT 3
      `
    )
    .all(term.id) as ClosingEvent[];

  const submittedTotal = summary.student_submitted + summary.officer_submitted;
  const passedTotal = summary.student_passed + summary.officer_passed;
  const failedTotal = summary.student_failed + summary.officer_failed;
  const pendingTotal = summary.student_pending + summary.officer_pending;
  const finalizedTotal = passedTotal + failedTotal;
  const completionRate =
    submittedTotal > 0 ? Math.round((finalizedTotal / submittedTotal) * 100) : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
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
          hint="Bao gồm sinh viên và cán bộ lớp đang hoạt động"
          href="/dashboard/admin/students"
        />
        <OverviewCard
          icon={<School size={20} />}
          label="Lớp đang quản lý"
          value={summary.active_classes}
          hint="Các lớp còn hoạt động trong hệ thống"
          href="/dashboard/admin/students"
        />
        <OverviewCard
          icon={<Activity size={20} />}
          label="Hoạt động trong học kỳ"
          value={summary.term_activities}
          hint={`${summary.completed_activities} hoạt động đã kết thúc`}
          href="/dashboard/admin/activities"
        />
        <OverviewCard
          icon={<ClipboardCheck size={20} />}
          label="Hồ sơ đã nộp"
          value={submittedTotal}
          hint={`${summary.student_submitted} sinh viên · ${summary.officer_submitted} cán bộ`}
          href="/dashboard/admin/reports/overview"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Chỉ số học kỳ</h2>
            </div>
            <Link
              href={`/dashboard/admin/reports/overview?termId=${term.id}`}
              className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Xem báo cáo
            </Link>
          </div>

          <div className="mt-6 space-y-6">
            <RateRow
              label="Sinh viên tham gia ít nhất một hoạt động"
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

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">
            Hồ sơ sinh viên
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cơ cấu {summary.student_submitted} hồ sơ đã nộp trong học kỳ.
          </p>
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

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">
            Hồ sơ cán bộ
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cơ cấu {summary.officer_submitted} hồ sơ đã nộp trong học kỳ.
          </p>
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

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-amber-500" size={22} />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cảnh báo cần chú ý</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <AlertCard
            value={pendingTotal}
            label="Hồ sơ đang chờ duyệt"
            href="/dashboard/admin/submissions"
            tone={pendingTotal > 0 ? "amber" : "green"}
          />
          <AlertCard
            value={summary.unresolved_attendance}
            label="Lượt điểm danh chưa chốt"
            href="/dashboard/admin/activities"
            tone={summary.unresolved_attendance > 0 ? "red" : "green"}
          />
          <AlertCard
            value={closingEvents.length}
            label="Đợt xét đóng trong 7 ngày"
            href="/dashboard/admin/events"
            tone={closingEvents.length > 0 ? "amber" : "green"}
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

function OverviewCard({ icon, label, value, hint, href }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm leading-5 text-slate-500">{hint}</div>
    </Link>
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

function AlertCard({ value, label, href, tone }: {
  value: number;
  label: string;
  href: string;
  tone: "amber" | "red" | "green";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };
  return (
    <Link href={href} className={`rounded-2xl p-4 ring-1 transition hover:brightness-95 ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
    </Link>
  );
}
