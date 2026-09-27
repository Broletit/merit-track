import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Trophy,
} from "lucide-react";
import { getSubmissionStatusLabel } from "@/lib/submissions/submissionStatus";
import { getRequiredActiveTerm } from "@/server/academic-terms/getRequiredActiveTerm";
import { requireStudentContext } from "@/server/auth/guards";
import { ensureActivityConductScores } from "@/server/conduct/ensureActivityConductScores";
import { getDb } from "@/server/db/sqlite";

type DashboardSummary = {
  registered: number;
  attended: number;
  openEvents: number;
  submissions: number;
};

type UpcomingActivity = {
  id: number;
  title: string;
  start_at: string;
  registration_end_at: string;
  conduct_score: number;
  participation_source: string;
  registration_status: string | null;
};

type UpcomingEvent = {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  submission_status: string | null;
};

type SubmissionRow = {
  id: number;
  event_title: string;
  status: string;
  updated_at: string;
};

function compactDate(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Chưa xác định";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getActivityBadge(item: UpcomingActivity) {
  if (item.registration_status === "attended") {
    return { label: "Đã tham gia", className: "bg-emerald-100 text-emerald-700" };
  }
  if (item.registration_status === "registered") {
    return { label: "Đã đăng ký", className: "bg-blue-100 text-blue-700" };
  }
  if (item.participation_source === "external") {
    return { label: "Đăng ký tại trường", className: "bg-violet-100 text-violet-700" };
  }
  return { label: "Có thể đăng ký", className: "bg-amber-100 text-amber-800" };
}

function getEventBadge(item: UpcomingEvent) {
  if (item.submission_status) {
    return {
      label: getSubmissionStatusLabel(item.submission_status),
      className: "bg-blue-100 text-blue-700",
    };
  }
  return { label: "Chưa tạo hồ sơ", className: "bg-amber-100 text-amber-800" };
}

export default async function StudentDashboardPage() {
  const user = await requireStudentContext();
  const db = getDb();
  ensureActivityConductScores();
  const term = getRequiredActiveTerm();

  const visibilitySql = `(a.organizer_level = 'faculty' OR EXISTS (
    SELECT 1
    FROM activity_scopes scope
    INNER JOIN class_members member ON member.class_id = scope.class_id
    WHERE scope.activity_id = a.id
      AND member.user_id = ?
      AND member.left_at IS NULL
  ))`;

  const registered = Number((db.prepare(
    `SELECT COUNT(*) AS total
     FROM activity_registrations ar
     INNER JOIN activities a ON a.id = ar.activity_id
     WHERE ar.user_id = ? AND ar.status <> 'cancelled' AND a.term_id = ?`
  ).get(user.id, term.id) as { total: number }).total);

  const attended = Number((db.prepare(
    `SELECT COUNT(*) AS total
     FROM activity_registrations ar
     INNER JOIN activities a ON a.id = ar.activity_id
     WHERE ar.user_id = ? AND ar.status = 'attended' AND a.term_id = ?`
  ).get(user.id, term.id) as { total: number }).total);

  const openEvents = Number((db.prepare(
    `SELECT COUNT(*) AS total
     FROM events e
     WHERE e.type = 'student'
       AND e.term_id = ?
       AND e.status = 'published'
       AND datetime(e.end_at) >= datetime('now')`
  ).get(term.id) as { total: number }).total);

  const submissions = Number((db.prepare(
    `SELECT COUNT(*) AS total
     FROM submissions s
     INNER JOIN events e ON e.id = s.event_id
     WHERE s.user_id = ?
       AND e.type = 'student'
       AND e.term_id = ?
       AND s.submitted_at IS NOT NULL`
  ).get(user.id, term.id) as { total: number }).total);

  const summary: DashboardSummary = {
    registered,
    attended,
    openEvents,
    submissions,
  };

  const upcomingActivities = db.prepare(
    `SELECT
       a.id,
       a.title,
       a.start_at,
       a.registration_end_at,
       a.conduct_score,
       a.participation_source,
       ar.status AS registration_status
     FROM activities a
     LEFT JOIN activity_registrations ar
       ON ar.activity_id = a.id AND ar.user_id = ?
     WHERE a.status = 'published'
       AND a.term_id = ?
       AND a.audience_type = 'student'
       AND datetime(a.end_at) >= datetime('now')
       AND ${visibilitySql}
     ORDER BY
       CASE WHEN datetime(a.start_at) >= datetime('now') THEN 0 ELSE 1 END,
       datetime(a.start_at) ASC,
       a.id ASC
     LIMIT 4`
  ).all(user.id, term.id, user.id) as UpcomingActivity[];

  const upcomingEvents = db.prepare(
    `SELECT
       e.id,
       e.title,
       e.start_at,
       e.end_at,
       s.status AS submission_status
     FROM events e
     LEFT JOIN submissions s ON s.event_id = e.id AND s.user_id = ?
     WHERE e.type = 'student'
       AND e.term_id = ?
       AND e.status = 'published'
       AND datetime(e.end_at) >= datetime('now')
     ORDER BY
       CASE WHEN datetime(e.start_at) <= datetime('now') THEN 0 ELSE 1 END,
       datetime(e.end_at) ASC,
       e.id ASC
     LIMIT 4`
  ).all(user.id, term.id) as UpcomingEvent[];

  const latestSubmissions = db.prepare(
    `SELECT s.id, e.title AS event_title, s.status, s.updated_at
     FROM submissions s
     INNER JOIN events e ON e.id = s.event_id
     WHERE s.user_id = ?
       AND e.type = 'student'
       AND e.term_id = ?
       AND s.submitted_at IS NOT NULL
     ORDER BY
       CASE
         WHEN s.status IN ('needs_revision_v1', 'needs_revision_v2', 'rejected_v1', 'rejected_v2') THEN 0
         WHEN s.status IN ('submitted_v1', 'submitted_v2') THEN 1
         ELSE 2
       END,
       datetime(s.updated_at) DESC
     LIMIT 4`
  ).all(user.id, term.id) as SubmissionRow[];

  const attendedRate = summary.registered > 0
    ? Math.round((summary.attended / summary.registered) * 100)
    : 0;

  return (
    <main className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<CalendarCheck2 size={20} />} label="Hoạt động đã đăng ký" value={summary.registered} tone="blue" />
        <Stat icon={<CheckCircle2 size={20} />} label="Tỷ lệ đã điểm danh" value={`${attendedRate}%`} tone="emerald" />
        <Stat icon={<Trophy size={20} />} label="Đợt xét còn hiệu lực" value={summary.openEvents} tone="amber" />
        <Stat icon={<ClipboardCheck size={20} />} label="Hồ sơ đã gửi" value={summary.submissions} tone="violet" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardList
          icon={<CalendarCheck2 size={21} />}
          title="Hoạt động sắp diễn ra"
          allHref="/dashboard/student/activities"
          empty="Chưa có hoạt động sắp diễn ra trong học kỳ này."
        >
          {upcomingActivities.map((item) => {
            const badge = getActivityBadge(item);
            return (
              <AttentionItem
                key={item.id}
                href={`/dashboard/student/activities/${item.id}`}
                title={item.title}
                badge={badge.label}
                badgeClass={badge.className}
                meta={`Diễn ra ${compactDate(item.start_at)}`}
                detail={`${item.conduct_score} điểm rèn luyện · Hạn đăng ký ${compactDate(item.registration_end_at)}`}
              />
            );
          })}
        </DashboardList>

        <DashboardList
          icon={<Trophy size={21} />}
          title="Đợt xét cần quan tâm"
          allHref="/dashboard/student/events"
          empty="Chưa có đợt xét nào đang hoặc sắp diễn ra."
        >
          {upcomingEvents.map((item) => {
            const badge = getEventBadge(item);
            return (
              <AttentionItem
                key={item.id}
                href={`/dashboard/student/events/${item.id}`}
                title={item.title}
                badge={badge.label}
                badgeClass={badge.className}
                meta={`Mở từ ${compactDate(item.start_at)}`}
                detail={`Hạn hoàn tất hồ sơ ${compactDate(item.end_at)}`}
              />
            );
          })}
        </DashboardList>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" />
              <h2 className="text-xl font-semibold text-slate-900">Hồ sơ cần theo dõi</h2>
            </div>
          </div>
          <Link href="/dashboard/student/submissions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900">
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {latestSubmissions.length > 0 ? latestSubmissions.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/student/submissions/${item.id}`}
              className="group rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900 group-hover:text-blue-800">
                {item.event_title}
              </div>
              <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {getSubmissionStatusLabel(item.status)}
              </div>
              <div className="mt-3 text-xs text-slate-400">Cập nhật {compactDate(item.updated_at)}</div>
            </Link>
          )) : (
            <div className="col-span-full rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Bạn chưa gửi hồ sơ nào trong học kỳ này.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label, value, tone }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function DashboardList({ icon, title, allHref, empty, children }: {
  icon: React.ReactNode;
  title: string;
  allHref: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
        </div>
        <Link href={allHref} aria-label={`Xem tất cả ${title}`} className="shrink-0 rounded-xl p-2 text-blue-700 transition hover:bg-blue-50">
          <ArrowRight size={18} />
        </Link>
      </div>
      <div className="mt-5 space-y-3">
        {hasItems ? children : (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{empty}</div>
        )}
      </div>
    </section>
  );
}

function AttentionItem({ href, title, badge, badgeClass, meta, detail }: {
  href: string;
  title: string;
  badge: string;
  badgeClass: string;
  meta: string;
  detail: string;
}) {
  return (
    <Link href={href} className="group block rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-blue-800">{title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>{badge}</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Clock3 size={15} className="text-blue-600" /> {meta}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>
    </Link>
  );
}
