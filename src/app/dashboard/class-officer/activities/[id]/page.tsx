import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, UserCheck, Users } from "lucide-react";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import Pagination from "@/components/common/Pagination";
import ClassActivityParticipantsFilter from "@/components/class-officer/activities/ClassActivityParticipantsFilter";

type SearchParams = Promise<{ keyword?: string; status?: string; termId?: string; page?: string }>;
type ActivityRow = { id: number; title: string; description: string | null; organizer_level: string; start_at: string; end_at: string; registration_start_at: string; registration_end_at: string; conduct_score: number };
type StudentRow = { id: number; full_name: string; mssv: string; registration_status: string; registered_at: string; checked_in_at: string | null };
type SummaryRow = { class_total: number; registered: number; attended: number };
const PAGE_SIZE = 10;

function mapRegistrationStatus(status: string) {
  if (status === "attended") return "Đã tham gia";
  return "Đã đăng ký";
}

function getRegistrationStatusClass(status: string) {
  if (status === "attended") return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

export default async function ClassOfficerActivityDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireClassOfficerContext();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const activityId = Number(id);
  if (!Number.isFinite(activityId) || activityId <= 0) notFound();

  const db = getDb();
  const officerClass = db.prepare(`
    SELECT c.id, c.code, c.name FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.user_id = ? AND cm.left_at IS NULL
    ORDER BY cm.rowid DESC LIMIT 1
  `).get(user.id) as { id: number; code: string; name: string } | undefined;
  if (!officerClass) throw new Error("Tài khoản cán bộ lớp chưa được gán lớp đang hoạt động.");

  const activity = db.prepare(`
    SELECT a.id, a.title, a.description, a.organizer_level, a.start_at, a.end_at,
      a.registration_start_at, a.registration_end_at, a.conduct_score
    FROM activities a
    WHERE a.id = ?
      AND a.status = 'published'
      AND a.audience_type = 'student'
      AND (a.organizer_level = 'faculty' OR (a.organizer_level = 'class' AND EXISTS (
        SELECT 1 FROM activity_scopes s WHERE s.activity_id = a.id AND s.class_id = ?
      )))
    LIMIT 1
  `).get(activityId, officerClass.id) as ActivityRow | undefined;
  if (!activity) notFound();

  const keyword = String(sp.keyword ?? "").trim();
  const status = ["registered", "attended"].includes(String(sp.status)) ? String(sp.status) : "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const summary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role='student' AND u.is_active=1) AS class_total,
      COUNT(CASE WHEN ar.status IN ('registered','attended') THEN 1 END) AS registered,
      COUNT(CASE WHEN ar.status='attended' THEN 1 END) AS attended
    FROM activity_registrations ar
    INNER JOIN users u ON u.id=ar.user_id
    INNER JOIN class_members cm ON cm.user_id=u.id AND cm.left_at IS NULL
    WHERE ar.activity_id=? AND cm.class_id=? AND u.role='student' AND u.is_active=1
  `).get(officerClass.id, activity.id, officerClass.id) as SummaryRow;

  const where = ["ar.activity_id = ?", "cm.class_id = ?", "cm.left_at IS NULL", "u.role = 'student'", "u.is_active = 1", "ar.status IN ('registered','attended')"];
  const values: unknown[] = [activity.id, officerClass.id];
  if (keyword) { where.push("(u.full_name LIKE ? OR u.mssv LIKE ?)"); values.push(`%${keyword}%`, `%${keyword}%`); }
  if (status) { where.push("ar.status = ?"); values.push(status); }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM activity_registrations ar INNER JOIN users u ON u.id=ar.user_id INNER JOIN class_members cm ON cm.user_id=u.id ${whereSql}`).get(...values) as { total: number };
  const students = db.prepare(`
    SELECT ar.id,u.full_name,u.mssv,ar.status AS registration_status,ar.registered_at,ar.checked_in_at
    FROM activity_registrations ar INNER JOIN users u ON u.id=ar.user_id INNER JOIN class_members cm ON cm.user_id=u.id ${whereSql}
    ORDER BY CASE ar.status WHEN 'attended' THEN 1 WHEN 'registered' THEN 2 ELSE 3 END, datetime(COALESCE(ar.checked_in_at,ar.registered_at)) DESC,ar.id DESC
    LIMIT ? OFFSET ?
  `).all(...values, PAGE_SIZE, offset) as StudentRow[];
  const totalPages = Math.max(1, Math.ceil(Number(totalRow.total ?? 0) / PAGE_SIZE));
  const attendanceRate = summary.registered ? Math.round((summary.attended / summary.registered) * 100) : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="mb-2 text-sm font-medium text-blue-100/80">{activity.organizer_level === "class" ? "Hoạt động cấp lớp" : "Hoạt động cấp khoa"} · Theo dõi lớp {officerClass.code}</div><h1 className="text-2xl font-semibold">{activity.title}</h1><p className="mt-1 text-sm text-blue-100/80">{formatDateTimeVN(activity.start_at)} → {formatDateTimeVN(activity.end_at)}</p></div>
          <Link href={`/dashboard/class-officer/activities${sp.termId ? `?termId=${encodeURIComponent(sp.termId)}` : ""}`} className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"><ArrowLeft size={16} /><span className="ml-2">Quay về</span></Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Sinh viên đăng ký" value={summary.registered} tone="blue" />
        <Metric label="Đã tham gia" value={summary.attended} tone="emerald" />
        <Metric label="Tỷ lệ tham gia" value={`${attendanceRate}%`} tone="amber" />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Thông tin hoạt động</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info icon={<UserCheck size={18} />} label="Điểm rèn luyện" value={`${activity.conduct_score ?? 0} điểm`} />
          <Info icon={<Clock3 size={18} />} label="Mở đăng ký" value={formatDateTimeVN(activity.registration_start_at)} />
          <Info icon={<Clock3 size={18} />} label="Đóng đăng ký" value={formatDateTimeVN(activity.registration_end_at)} />
          <Info icon={<Users size={18} />} label="Quy mô lớp" value={`${summary.class_total} sinh viên`} />
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="text-sm font-semibold text-slate-900">Mô tả</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{activity.description || "Chưa có mô tả"}</div></div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div><h2 className="text-xl font-semibold text-slate-900">Sinh viên lớp tham gia</h2></div>
        <div className="mt-5"><ClassActivityParticipantsFilter /></div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr><th className="w-[32%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Sinh viên</th><th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">MSSV</th><th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Trạng thái</th><th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đăng ký</th><th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Điểm danh</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {students.length ? students.map((item) => <tr key={item.id} className="transition hover:bg-slate-50/70"><td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.full_name}</td><td className="px-4 py-4 text-sm text-slate-700">{item.mssv}</td><td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getRegistrationStatusClass(item.registration_status)}`}>{mapRegistrationStatus(item.registration_status)}</span></td><td className="px-4 py-4 text-sm text-slate-700">{formatDateTimeVN(item.registered_at)}</td><td className="px-4 py-4 text-sm text-slate-700">{item.checked_in_at ? formatDateTimeVN(item.checked_in_at) : "—"}</td></tr>) : <tr><td colSpan={5} className="px-4 py-12 text-center"><div className="text-sm font-semibold text-slate-700">Chưa có sinh viên tham gia phù hợp</div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-5"><Pagination page={page} totalPages={totalPages} searchParams={{ keyword, status, termId: sp.termId }} /></div>
      </section>
    </main>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">{icon}{label}</div><div className="mt-2 text-sm font-semibold text-slate-900">{value}</div></div>;
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: "blue" | "emerald" | "amber" }) {
  const colors = { blue: "text-blue-700", emerald: "text-emerald-700", amber: "text-amber-700" };
  return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="text-sm font-medium text-slate-500">{label}</div><div className={`mt-2 text-3xl font-semibold ${colors[tone]}`}>{value}</div></div>;
}
