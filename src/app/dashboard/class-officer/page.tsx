import Link from "next/link";
import { BarChart3, CheckCircle2, ClipboardCheck, Clock3, Users } from "lucide-react";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import DonutChart from "@/components/admin/reports/DonutChart";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ termId?: string }>;
type ClassRow = { id: number; code: string; name: string };
type Summary = {
  students: number;
  registered_students: number;
  attended_students: number;
  submitted_students: number;
  pending_reviews: number;
};
type ActivityRow = { id: number; title: string; registered: number; attended: number };
type StatusRow = { status: string; total: number };
type PendingReviewRow = {
  id: number;
  event_title: string;
  student_name: string;
  mssv: string;
  updated_at: string;
};

export default async function ClassOfficerDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireClassOfficerContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const term = getAcademicTermForView(params.termId);

  const classes = db.prepare(`
    SELECT DISTINCT c.id, c.code, c.name
    FROM class_members cm
    INNER JOIN classes c ON c.id=cm.class_id
    WHERE cm.user_id=? AND cm.left_at IS NULL AND c.is_active=1
    ORDER BY c.code
  `).all(user.id) as ClassRow[];
  const classIds = classes.map((item) => Number(item.id));
  const placeholders = classIds.length ? classIds.map(() => "?").join(",") : "NULL";

  const summary = classIds.length ? db.prepare(`
    SELECT
      (SELECT COUNT(DISTINCT cm.user_id) FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND u.role='student' AND u.is_active=1) students,
      (SELECT COUNT(DISTINCT ar.user_id) FROM activity_registrations ar INNER JOIN activities a ON a.id=ar.activity_id INNER JOIN class_members cm ON cm.user_id=ar.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND a.term_id=? AND a.audience_type='student' AND ar.status<>'cancelled') registered_students,
      (SELECT COUNT(DISTINCT ar.user_id) FROM activity_registrations ar INNER JOIN activities a ON a.id=ar.activity_id INNER JOIN class_members cm ON cm.user_id=ar.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND a.term_id=? AND a.audience_type='student' AND ar.status='attended') attended_students,
      (SELECT COUNT(DISTINCT s.user_id) FROM submissions s INNER JOIN events e ON e.id=s.event_id INNER JOIN class_members cm ON cm.user_id=s.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND e.term_id=? AND e.type='student' AND s.status<>'draft') submitted_students,
      (SELECT COUNT(*) FROM submissions s INNER JOIN events e ON e.id=s.event_id WHERE s.class_id IN (${placeholders}) AND e.term_id=? AND e.type='student' AND s.status='submitted_v1') pending_reviews
  `).get(
    ...classIds,
    ...classIds, term.id,
    ...classIds, term.id,
    ...classIds, term.id,
    ...classIds, term.id,
  ) as Summary : { students: 0, registered_students: 0, attended_students: 0, submitted_students: 0, pending_reviews: 0 };

  const activityRows = classIds.length ? db.prepare(`
    SELECT a.id, a.title,
      COUNT(DISTINCT CASE WHEN ar.status<>'cancelled' THEN ar.user_id END) registered,
      COUNT(DISTINCT CASE WHEN ar.status='attended' THEN ar.user_id END) attended
    FROM activities a
    INNER JOIN activity_registrations ar ON ar.activity_id=a.id
    INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL
    WHERE cm.class_id IN (${placeholders}) AND a.term_id=? AND a.audience_type='student'
    GROUP BY a.id, a.title
    ORDER BY attended DESC, registered DESC, datetime(a.start_at) DESC
    LIMIT 6
  `).all(...classIds, term.id) as ActivityRow[] : [];

  const rawStatuses = classIds.length ? db.prepare(`
    SELECT CASE
      WHEN s.status LIKE 'needs_revision%' OR s.status LIKE 'rejected%' THEN 'revision'
      WHEN s.status IN ('submitted_v1','submitted_v2') THEN 'pending'
      ELSE s.status
    END status, COUNT(*) total
    FROM submissions s
    INNER JOIN events e ON e.id=s.event_id
    WHERE s.class_id IN (${placeholders}) AND e.term_id=? AND e.type='student'
      AND s.status<>'draft'
    GROUP BY CASE
      WHEN s.status LIKE 'needs_revision%' OR s.status LIKE 'rejected%' THEN 'revision'
      WHEN s.status IN ('submitted_v1','submitted_v2') THEN 'pending'
      ELSE s.status
    END
  `).all(...classIds, term.id) as StatusRow[] : [];
  const statusMap = new Map(rawStatuses.map((item) => [item.status, Number(item.total)]));
  const statusTotal = rawStatuses.reduce((total, item) => total + Number(item.total), 0);

  const pendingReviews = classIds.length ? db.prepare(`
    SELECT s.id, e.title event_title, u.full_name student_name, u.mssv, s.updated_at
    FROM submissions s
    INNER JOIN events e ON e.id=s.event_id
    INNER JOIN users u ON u.id=s.user_id
    WHERE s.class_id IN (${placeholders}) AND e.term_id=? AND e.type='student' AND s.status='submitted_v1'
    ORDER BY datetime(s.updated_at), s.id
    LIMIT 6
  `).all(...classIds, term.id) as PendingReviewRow[] : [];

  const studentCount = Number(summary.students || 0);
  const participationRate = studentCount ? Math.round(Number(summary.attended_students) / studentCount * 100) : 0;
  const submissionRate = studentCount ? Math.round(Number(summary.submitted_students) / studentCount * 100) : 0;
  const maxActivityValue = Math.max(studentCount, ...activityRows.map((item) => Number(item.registered)), 1);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Tổng quan lớp</h1>
            <p className="mt-1 text-sm text-blue-100/80">{classes.map((item) => item.code).join(", ") || "Chưa được phân công lớp"}</p>
          </div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={term.id} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users size={20} />} label="Sinh viên trong lớp" value={studentCount} detail="Đang học và còn hoạt động" tone="blue" />
        <Stat icon={<CheckCircle2 size={20} />} label="Đã tham gia hoạt động" value={`${participationRate}%`} detail={`${summary.attended_students}/${studentCount} sinh viên`} tone="emerald" />
        <Stat icon={<ClipboardCheck size={20} />} label="Đã nộp hồ sơ xét" value={`${submissionRate}%`} detail={`${summary.submitted_students}/${studentCount} sinh viên`} tone="violet" />
        <Stat icon={<Clock3 size={20} />} label="Đang chờ duyệt vòng 1" value={summary.pending_reviews} detail="Hồ sơ cần xử lý" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Panel title="Mức độ tham gia theo hoạt động" icon={<BarChart3 size={20} />}>
          <div className="mt-5 space-y-5">
            {activityRows.length ? activityRows.map((item) => (
              <div key={item.id}>
                <div className="mb-2 flex items-start justify-between gap-4 text-sm">
                  <span className="line-clamp-1 font-medium text-slate-800">{item.title}</span>
                  <span className="shrink-0 text-slate-500">{item.attended}/{item.registered} tham gia</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-blue-200" style={{ width: `${Number(item.registered) / maxActivityValue * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${Number(item.attended) / maxActivityValue * 100}%` }} />
                </div>
              </div>
            )) : <Empty text="Chưa có dữ liệu đăng ký hoạt động trong học kỳ này." />}
          </div>
          {activityRows.length ? <div className="mt-5 flex flex-wrap gap-5 text-xs text-slate-500"><Legend color="bg-blue-200" label="Đã đăng ký" /><Legend color="bg-emerald-500" label="Đã tham gia" /></div> : null}
        </Panel>

        <Panel title="Cơ cấu hồ sơ đã nộp" icon={<ClipboardCheck size={20} />}>
          <div className="mt-5">
            <DonutChart items={[
              { label: "Đã đạt", value: statusMap.get("passed") || 0, className: "#16a34a" },
              { label: "Đang xử lý", value: statusMap.get("pending") || 0, className: "#2563eb" },
              { label: "Cần bổ sung", value: statusMap.get("revision") || 0, className: "#f59e0b" },
              { label: "Không đạt", value: statusMap.get("failed") || 0, className: "#ef4444" },
            ]} />
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">Không tính hồ sơ nháp · Tổng <span className="font-semibold text-slate-900">{statusTotal}</span> hồ sơ đã nộp</div>
        </Panel>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold text-slate-900">Hồ sơ cần ưu tiên duyệt</h2><p className="mt-1 text-sm text-slate-500">Sắp xếp theo thời gian chờ lâu nhất.</p></div>
          <Link href="/dashboard/class-officer/reviews" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Xem tất cả</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pendingReviews.length ? pendingReviews.map((item) => (
            <Link key={item.id} href={`/dashboard/class-officer/reviews/${item.id}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
              <div className="font-semibold text-slate-900">{item.student_name}</div>
              <div className="mt-1 text-sm text-slate-500">{item.mssv}</div>
              <div className="mt-3 line-clamp-1 text-sm text-slate-700">{item.event_title}</div>
              <div className="mt-2 text-xs text-amber-700">Chờ từ {formatDateTimeVN(item.updated_at)}</div>
            </Link>
          )) : <div className="col-span-full"><Empty text="Không có hồ sơ đang chờ duyệt vòng 1." /></div>}
        </div>
      </section>

      {!classIds.length ? <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">Tài khoản chưa được phân công lớp.</section> : null}
    </main>
  );
}

function Stat({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; detail: string; tone: "blue" | "emerald" | "violet" | "amber" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-700", violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</span></div><div className="mt-4 text-3xl font-bold text-slate-900">{value}</div><div className="mt-1 text-sm text-slate-500">{detail}</div></div>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100"><div className="flex items-center gap-2 text-slate-900"><span className="text-blue-700">{icon}</span><h2 className="text-xl font-semibold">{title}</h2></div>{children}</section>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{text}</div>; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>; }
