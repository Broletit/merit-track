import Link from "next/link";
import {
  CalendarCheck,
  ClipboardList,
  FileStack,
  Users,
} from "lucide-react";
import { requireFacultyOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
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

export default async function FacultyOfficerDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireFacultyOfficerContext();

  const params = await searchParams;
  const db = getDb();

  const terms = getAcademicTermsForSelect();
  const term = getAcademicTermForView(params.termId);

  const classRows = db
    .prepare(
      `
      SELECT DISTINCT c.id, c.code, c.name
      FROM faculty_class_assignments fca
      INNER JOIN classes c ON c.id = fca.class_id
      WHERE fca.faculty_officer_id = ?
        AND c.is_active = 1
      ORDER BY c.code ASC
      `
    )
    .all(user.id) as ClassRow[];

  const classIds = classRows.map((item) => Number(item.id));
  const classPlaceholders = classIds.length
    ? classIds.map(() => "?").join(",")
    : "NULL";

  const activityHasTermId = (
    db.prepare(`PRAGMA table_info(activities)`).all() as { name: string }[]
  ).some((item) => item.name === "term_id");

  const activityTermFilter = activityHasTermId ? "AND a.term_id = ?" : "";
  const activityTermValues = activityHasTermId ? [term.id] : [];

  const summary = classIds.length
    ? (db
        .prepare(
          `
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
                AND (NOT EXISTS (SELECT 1 FROM activity_scopes axs WHERE axs.activity_id=a.id)
                  OR EXISTS (SELECT 1 FROM activity_scopes axs INNER JOIN faculty_class_assignments fca ON fca.class_id=axs.class_id WHERE axs.activity_id=a.id AND fca.faculty_officer_id=?))
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
            ) AS submissions,

            (
              SELECT COUNT(*)
              FROM submissions s
              INNER JOIN events e ON e.id = s.event_id
              WHERE s.class_id IN (${classPlaceholders})
                AND e.type = 'student'
                AND e.term_id = ?
                AND s.status = 'submitted_v2'
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
          `
        )
        .get(
          ...classIds,
          ...classIds,
          ...activityTermValues,
          user.id,
          ...classIds,
          ...activityTermValues,
          ...classIds,
          ...activityTermValues,
          ...classIds,
          term.id,
          ...classIds,
          term.id,
          ...classIds,
          term.id
        ) as Summary)
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
    ? (db
        .prepare(
          `
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
            AND s.status = 'submitted_v2'
          ORDER BY datetime(s.updated_at) ASC, s.id ASC
          LIMIT 5
          `
        )
        .all(...classIds, term.id) as PendingReviewRow[])
    : [];

  const attendedRate =
    Number(summary.activity_registrations ?? 0) > 0
      ? Math.round(
          (Number(summary.activity_attended ?? 0) /
            Number(summary.activity_registrations ?? 0)) *
            100
        )
      : 0;

  const passRate =
    Number(summary.submissions ?? 0) > 0
      ? Math.round(
          (Number(summary.passed ?? 0) / Number(summary.submissions ?? 0)) *
            100
        )
      : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
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
          label="Tỉ lệ tham gia các lớp phụ trách"
          value={`${attendedRate}%`}
        />

        <Stat
          icon={<FileStack size={20} />}
          label="Hồ sơ các lớp phụ trách"
          value={summary.submissions ?? 0}
        />

        <Stat
          icon={<ClipboardList size={20} />}
          label="Chờ duyệt vòng 2"
          value={summary.pending_reviews ?? 0}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">Lối tắt</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ShortcutCard
              href="/dashboard/faculty-officer/activities"
              title="Hoạt động lớp phụ trách"
              icon={<CalendarCheck size={22} />}
            />

            <ShortcutCard
              href="/dashboard/faculty-officer/reviews"
              title="Duyệt vòng 2"
              icon={<ClipboardList size={22} />}
            />

            <ShortcutCard
              href="/dashboard/faculty-officer/events"
              title="Đợt xét"
              icon={<FileStack size={22} />}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
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
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Không có hồ sơ chờ duyệt vòng 2.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-medium text-slate-500">
            Tỉ lệ hồ sơ đạt của lớp phụ trách
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">
            {passRate}%
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary.passed ?? 0}/{summary.submissions ?? 0} hồ sơ đạt.
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-medium text-slate-500">
            Lớp được phân công
          </div>
          <div className="mt-3 text-sm leading-7 text-slate-700">
            {classRows.length > 0
              ? classRows.map((item) => item.code).join(", ")
              : "Chưa được phân công lớp"}
          </div>
        </div>
      </section>

      {!classIds.length ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Tài khoản chưa được admin phân công lớp trong faculty_class_assignments.
        </section>
      ) : null}

      {!activityHasTermId ? (
        <section className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-700 ring-1 ring-amber-100">
          Lưu ý: bảng activities chưa có term_id nên thống kê hoạt động chưa lọc chính xác theo học kỳ.
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
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
      </div>

      <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ShortcutCard({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(37,99,235,0.10)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-blue-50 group-hover:text-blue-700">
          {icon}
        </div>

        <div className="text-sm font-semibold text-blue-700 opacity-0 transition group-hover:opacity-100">
          →
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
    </Link>
  );
}
