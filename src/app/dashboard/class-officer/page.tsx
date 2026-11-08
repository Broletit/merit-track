import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import Link from "next/link";
import { BarChart3, CheckCircle2, ClipboardCheck, Clock3, Users } from "lucide-react";
import PaginationArrow from "@/components/common/PaginationArrow";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import DonutChart from "@/components/admin/reports/DonutChart";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ termId?: string; activityPage?: string }>;
type ClassRow = { id: number; code: string; name: string };
type Summary = {
  students: number;
  class_officers: number;
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
  const db = getDatabase();
  const terms = (await getAcademicTermsForSelect());
  const term = (await getAcademicTermForView(params.termId));

  const classes = (await db.rows(`
    SELECT DISTINCT c.id, c.code, c.name
    FROM class_members cm
    INNER JOIN classes c ON c.id=cm.class_id
    WHERE cm.user_id=? AND cm.left_at IS NULL AND c.is_active=1
    ORDER BY c.code
  `, [user.id])) as ClassRow[];
  const classIds = classes.map((item) => Number(item.id));
  const placeholders = classIds.length ? classIds.map(() => "?").join(",") : "NULL";

  const summary = classIds.length ? (await db.first(`
    SELECT
      (SELECT COUNT(DISTINCT cm.user_id) FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND u.role='student' AND u.is_active=1) students,
      (SELECT COUNT(DISTINCT cm.user_id) FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND u.role='class_officer' AND u.is_active=1) class_officers,
      (SELECT COUNT(DISTINCT ar.user_id) FROM activity_registrations ar INNER JOIN activities a ON a.id=ar.activity_id INNER JOIN class_members cm ON cm.user_id=ar.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND a.term_id=? AND a.audience_type='student' AND ar.status<>'cancelled') registered_students,
      (SELECT COUNT(DISTINCT ar.user_id) FROM activity_registrations ar INNER JOIN activities a ON a.id=ar.activity_id INNER JOIN class_members cm ON cm.user_id=ar.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND a.term_id=? AND a.audience_type='student' AND ar.status='attended') attended_students,
      (SELECT COUNT(DISTINCT s.user_id) FROM submissions s INNER JOIN events e ON e.id=s.event_id INNER JOIN class_members cm ON cm.user_id=s.user_id WHERE cm.class_id IN (${placeholders}) AND cm.left_at IS NULL AND e.term_id=? AND e.type='student' AND s.submitted_at IS NOT NULL) submitted_students,
      (SELECT COUNT(*) FROM submissions s INNER JOIN events e ON e.id=s.event_id WHERE s.class_id IN (${placeholders}) AND e.term_id=? AND e.type='student' AND s.status='submitted_v1') pending_reviews
  `, [...classIds, ...classIds, ...classIds, term.id, ...classIds, term.id, ...classIds, term.id, ...classIds, term.id])) as Summary : { students: 0, class_officers: 0, registered_students: 0, attended_students: 0, submitted_students: 0, pending_reviews: 0 };

  const activityPageSize = 5;
  const requestedActivityPage = Number(params.activityPage ?? "1");
  const activityTotalRow = classIds.length ? await db.first<{ total: number }>(`
    SELECT COUNT(DISTINCT a.id) total
    FROM activities a
    INNER JOIN activity_registrations ar ON ar.activity_id=a.id
    INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL
    WHERE cm.class_id IN (${placeholders}) AND a.term_id=? AND a.audience_type='student'
  `, [...classIds, term.id]) : { total: 0 };
  const activityTotal = Number(activityTotalRow?.total ?? 0);
  const activityTotalPages = Math.max(1, Math.ceil(activityTotal / activityPageSize));
  const activityPage = Math.min(Math.max(1, Number.isFinite(requestedActivityPage) ? requestedActivityPage : 1), activityTotalPages);

  const activityRows = classIds.length ? (await db.rows(`
    SELECT a.id, a.title,
      COUNT(DISTINCT CASE WHEN ar.status<>'cancelled' THEN ar.user_id END) registered,
      COUNT(DISTINCT CASE WHEN ar.status='attended' THEN ar.user_id END) attended
    FROM activities a
    INNER JOIN activity_registrations ar ON ar.activity_id=a.id
    INNER JOIN class_members cm ON cm.user_id=ar.user_id AND cm.left_at IS NULL
    WHERE cm.class_id IN (${placeholders}) AND a.term_id=? AND a.audience_type='student'
    GROUP BY a.id, a.title
    ORDER BY attended DESC, registered DESC, CAST(a.start_at AS DATETIME(3)) DESC
    LIMIT ? OFFSET ?
  `, [...classIds, term.id, activityPageSize, (activityPage - 1) * activityPageSize])) as ActivityRow[] : [];

  const rawStatuses = classIds.length ? (await db.rows(`
    SELECT CASE
      WHEN s.status LIKE 'needs_revision%' OR s.status LIKE 'rejected%' THEN 'revision'
      WHEN s.status IN ('submitted_v1','submitted_v2') THEN 'pending'
      ELSE s.status
    END status, COUNT(*) total
    FROM submissions s
    INNER JOIN events e ON e.id=s.event_id
    WHERE s.class_id IN (${placeholders}) AND e.term_id=? AND e.type='student'
      AND s.submitted_at IS NOT NULL
    GROUP BY CASE
      WHEN s.status LIKE 'needs_revision%' OR s.status LIKE 'rejected%' THEN 'revision'
      WHEN s.status IN ('submitted_v1','submitted_v2') THEN 'pending'
      ELSE s.status
    END
  `, [...classIds, term.id])) as StatusRow[] : [];
  const statusMap = new Map(rawStatuses.map((item) => [item.status, Number(item.total)]));

  const pendingReviews = classIds.length ? (await db.rows(`
    SELECT s.id, e.title event_title, u.full_name student_name, u.mssv, s.updated_at
    FROM submissions s
    INNER JOIN events e ON e.id=s.event_id
    INNER JOIN users u ON u.id=s.user_id
    WHERE s.class_id IN (${placeholders}) AND e.term_id=? AND e.type='student' AND s.status='submitted_v1'
    ORDER BY CAST(s.updated_at AS DATETIME(3)), s.id
    LIMIT 6
  `, [...classIds, term.id])) as PendingReviewRow[] : [];

  const studentMembers = Number(summary.students || 0);
  const classOfficerMembers = Number(summary.class_officers || 0);
  const studentCount = studentMembers + classOfficerMembers;
  const participationRate = studentCount ? Math.round(Number(summary.attended_students) / studentCount * 100) : 0;
  const submissionRate = studentCount ? Math.round(Number(summary.submitted_students) / studentCount * 100) : 0;
  const maxActivityValue = Math.max(studentCount, ...activityRows.map((item) => Number(item.registered)), 1);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Tổng quan lớp</h1>
            <p className="mt-1 text-sm text-blue-100/80">{classes.map((item) => item.code).join(", ") || "Chưa được phân công lớp"}</p>
          </div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={term.id} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users size={20} />} label="Đang hoạt động" value={studentCount} detail={`${studentMembers} sinh viên · ${classOfficerMembers} cán bộ lớp`} />
        <Stat icon={<CheckCircle2 size={20} />} label="Đã tham gia hoạt động" value={`${participationRate}%`} detail={`${summary.attended_students}/${studentCount} sinh viên`} />
        <Stat icon={<ClipboardCheck size={20} />} label="Đã nộp hồ sơ xét" value={`${submissionRate}%`} detail={`${summary.submitted_students}/${studentCount} sinh viên`} />
        <Stat icon={<Clock3 size={20} />} label="Đang chờ duyệt vòng 1" value={summary.pending_reviews} detail="Hồ sơ cần xử lý" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Mức độ tham gia theo hoạt động" icon={<BarChart3 size={20} />} paginationScrollTarget>
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
          {activityTotalPages > 1 ? <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <PaginationArrow href={`/dashboard/class-officer?termId=${term.id}&activityPage=${Math.max(1, activityPage - 1)}`} direction="left" disabled={activityPage <= 1} />
            <span className="whitespace-nowrap text-sm text-slate-500">Trang {activityPage}/{activityTotalPages}</span>
            <PaginationArrow href={`/dashboard/class-officer?termId=${term.id}&activityPage=${Math.min(activityTotalPages, activityPage + 1)}`} direction="right" disabled={activityPage >= activityTotalPages} />
          </div> : null}
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
        </Panel>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
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

      {!classIds.length ? <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100 shadow-md shadow-slate-200/60">Tài khoản chưa được phân công lớp.</section> : null}
    </main>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: React.ReactNode; detail: string }) {
  return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div><div className={[statCardStyles.label, "mt-1"].join(" ")}>{detail}</div></div>;
}

function Panel({ title, icon, children, paginationScrollTarget = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; paginationScrollTarget?: boolean }) {
  return <section data-pagination-scroll-target={paginationScrollTarget || undefined} className="scroll-mt-4 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60"><div className="flex items-center gap-2 text-slate-900"><span className="text-blue-700">{icon}</span><h2 className="text-xl font-semibold">{title}</h2></div>{children}</section>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 shadow-md shadow-slate-200/60">{text}</div>; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>; }
