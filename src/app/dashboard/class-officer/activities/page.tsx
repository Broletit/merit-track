import { Activity, CalendarClock, CheckCircle2, Users } from "lucide-react";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import ReviewPagination from "@/components/shared/reviews/ReviewPagination";
import ClassActivitiesFilter from "@/components/class-officer/activities/ClassActivitiesFilter";
import TableActionLink from "@/components/shared/TableActionLink";
import AcademicTermSelect from "@/components/shared/AcademicTermSelect";
import { getAcademicTermForView, getAcademicTermsForSelect } from "@/server/academic-terms/getAcademicTermForView";

type SearchParams = Promise<{ keyword?: string; level?: string; attendance?: string; termId?: string; page?: string }>;
type Row = { id: number; title: string; description: string | null; organizer_level: string; start_at: string; end_at: string; participants: number; attended: number };
type SummaryRow = { total_activities: number; upcoming: number; class_registered: number; class_attended: number; faculty_attended: number };
const PAGE_SIZE = 10;

export default async function ClassOfficerActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireClassOfficerContext();
  const params = await searchParams;
  const db = getDb();
  const terms = getAcademicTermsForSelect();
  const selectedTerm = getAcademicTermForView(params.termId);
  const officerClass = db.prepare(`
    SELECT c.id, c.code, c.name FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.user_id = ? AND cm.left_at IS NULL
    ORDER BY cm.rowid DESC LIMIT 1
  `).get(user.id) as { id: number; code: string; name: string } | undefined;
  if (!officerClass) throw new Error("Tài khoản cán bộ lớp chưa được gán lớp đang hoạt động.");

  const classId = officerClass.id;
  const keyword = String(params.keyword ?? "").trim();
  const level = ["class", "faculty"].includes(String(params.level)) ? String(params.level) : "";
  const attendance = ["joined", "attended"].includes(String(params.attendance)) ? String(params.attendance) : "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const where = [
    `a.status = 'published'`,
    `a.term_id = ?`,
    `a.audience_type = 'student'`,
    `(a.organizer_level = 'faculty' OR (a.organizer_level = 'class' AND EXISTS (
      SELECT 1 FROM activity_scopes s WHERE s.activity_id = a.id AND s.class_id = ?
    )))`,
  ];
  const values: unknown[] = [selectedTerm.id, classId];

  if (keyword) {
    where.push("(a.title LIKE ? OR a.description LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (level) {
    where.push("a.organizer_level = ?");
    values.push(level);
  }
  if (attendance === "joined" || attendance === "attended") {
    where.push(`EXISTS (
      SELECT 1 FROM activity_registrations arx INNER JOIN users ux ON ux.id=arx.user_id
      WHERE arx.activity_id=a.id AND ux.role='student' AND ux.is_active=1
        AND EXISTS (SELECT 1 FROM class_members cmx WHERE cmx.user_id=ux.id AND cmx.class_id=? AND cmx.left_at IS NULL)
        AND arx.status ${attendance === "attended" ? "= 'attended'" : "IN ('registered','attended')"}
    )`);
    values.push(classId);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const summary = db.prepare(`
    SELECT
      COUNT(DISTINCT a.id) AS total_activities,
      COUNT(DISTINCT CASE WHEN datetime(a.start_at)>datetime('now') THEN a.id END) AS upcoming,
      COUNT(DISTINCT CASE WHEN ar.status IN ('registered','attended') THEN ar.user_id END) AS class_registered,
      COUNT(DISTINCT CASE WHEN ar.status='attended' THEN ar.user_id END) AS class_attended,
      (SELECT COUNT(DISTINCT all_ar.user_id)
       FROM activity_registrations all_ar
       INNER JOIN activities all_a ON all_a.id=all_ar.activity_id
       INNER JOIN users all_u ON all_u.id=all_ar.user_id
       WHERE all_a.term_id=? AND all_a.status='published' AND all_a.audience_type='student'
         AND all_ar.status='attended' AND all_u.role='student' AND all_u.is_active=1) AS faculty_attended
    FROM activities a
    LEFT JOIN activity_registrations ar ON ar.activity_id = a.id AND EXISTS (
      SELECT 1 FROM users registered_user
      INNER JOIN class_members registered_membership ON registered_membership.user_id=registered_user.id
      WHERE registered_user.id=ar.user_id AND registered_user.role='student' AND registered_user.is_active=1
        AND registered_membership.class_id=? AND registered_membership.left_at IS NULL
    )
    WHERE a.status = 'published'
      AND a.term_id = ?
      AND a.audience_type = 'student'
      AND (a.organizer_level = 'faculty' OR (a.organizer_level = 'class' AND EXISTS (
        SELECT 1 FROM activity_scopes s WHERE s.activity_id = a.id AND s.class_id = ?
      )))
  `).get(selectedTerm.id, classId, selectedTerm.id, classId) as SummaryRow;

  const total = db.prepare(`SELECT COUNT(*) AS total FROM activities a ${whereSql}`).get(...values) as { total: number };
  const rows = db.prepare(`
    SELECT a.id, a.title, a.description, a.organizer_level, a.start_at, a.end_at,
      (SELECT COUNT(*) FROM activity_registrations ar INNER JOIN users u ON u.id=ar.user_id
       WHERE ar.activity_id=a.id AND u.role='student' AND u.is_active=1
         AND EXISTS (SELECT 1 FROM class_members cm WHERE cm.user_id=u.id AND cm.class_id=? AND cm.left_at IS NULL)
         AND ar.status IN ('registered','attended')) AS participants,
      (SELECT COUNT(*) FROM activity_registrations ar INNER JOIN users u ON u.id=ar.user_id
       WHERE ar.activity_id=a.id AND u.role='student' AND u.is_active=1
         AND EXISTS (SELECT 1 FROM class_members cm WHERE cm.user_id=u.id AND cm.class_id=? AND cm.left_at IS NULL)
         AND ar.status='attended') AS attended
    FROM activities a ${whereSql}
    ORDER BY CASE WHEN datetime(a.start_at)<=datetime('now') AND datetime(a.end_at)>=datetime('now') THEN 0 WHEN datetime(a.start_at)>datetime('now') THEN 1 ELSE 2 END,
      datetime(a.start_at) DESC, a.id DESC
    LIMIT ? OFFSET ?
  `).all(classId, classId, ...values, PAGE_SIZE, offset) as Row[];
  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));
  const facultyShare = summary.faculty_attended ? Math.round((summary.class_attended / summary.faculty_attended) * 100) : 0;
  const attendanceRate = summary.class_registered ? Math.round((summary.class_attended / summary.class_registered) * 100) : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Activity size={22} /></div>
          <div><h1 className="text-2xl font-semibold">Hoạt động</h1></div>
          </div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Activity size={20} />} label="Tất cả hoạt động" value={summary.total_activities} tone="blue" />
        <SummaryCard icon={<CalendarClock size={20} />} label="Hoạt động sắp diễn ra" value={summary.upcoming} tone="amber" />
        <SummaryCard icon={<Users size={20} />} label="Tham gia so với toàn khoa" value={`${facultyShare}%`} tone="sky" />
        <SummaryCard icon={<CheckCircle2 size={20} />} label="Tham gia trên đăng ký" value={`${attendanceRate}%`} tone="emerald" />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div><h2 className="text-xl font-semibold text-slate-900">Danh sách hoạt động</h2><div className="mt-1 text-sm text-slate-400">{Number(total.total ?? 0)} hoạt động</div></div>
        <div className="mt-5"><ClassActivitiesFilter /></div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[820px] table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="w-[38%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Hoạt động</th>
              <th className="w-[24%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Thời gian</th>
              <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Đăng ký</th>
              <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Đã tham gia</th>
              <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length ? rows.map((item) => {
                const rate = item.participants ? Math.round((item.attended / item.participants) * 100) : 0;
                return <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 align-top"><div className="mb-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.organizer_level === "class" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{item.organizer_level === "class" ? "Cấp lớp" : "Cấp khoa"}</span></div><div className="text-sm font-semibold text-slate-900">{item.title}</div><div className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description || "Chưa có mô tả"}</div></td>
                  <td className="px-4 py-4 align-top text-sm text-slate-700">{formatDateTimeVN(item.start_at)}<div className="mt-1 text-xs text-slate-400">đến {formatDateTimeVN(item.end_at)}</div></td>
                  <td className="px-4 py-4 text-center align-top text-sm font-semibold text-blue-700">{item.participants}</td>
                  <td className="px-4 py-4 text-center align-top"><div className="text-sm font-semibold text-emerald-700">{item.attended}</div><div className="mt-1 text-xs text-slate-400">{rate}% đăng ký</div></td>
                  <td className="px-4 py-4 text-center align-top"><TableActionLink href={`/dashboard/class-officer/activities/${item.id}?termId=${selectedTerm.id}`} variant="view">Xem</TableActionLink></td>
                </tr>;
              }) : <tr><td colSpan={5} className="px-4 py-12 text-center"><div className="text-sm font-semibold text-slate-700">Chưa có hoạt động phù hợp</div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-5"><ReviewPagination page={page} totalPages={totalPages} basePath="/dashboard/class-officer/activities" searchParams={{ keyword, level, attendance, termId: String(selectedTerm.id) }} /></div>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: "blue" | "amber" | "sky" | "emerald" }) {
  const tones = { blue: "bg-blue-50 text-blue-700 ring-blue-100", amber: "bg-amber-50 text-amber-700 ring-amber-100", sky: "bg-sky-50 text-sky-700 ring-sky-100", emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>{icon}</div><div className="mt-4 text-2xl font-semibold text-slate-900">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>;
}
