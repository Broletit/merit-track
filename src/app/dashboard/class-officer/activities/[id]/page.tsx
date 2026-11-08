import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import NumberedTable from "@/components/common/NumberedTable";
import { classActivityVisibleSql } from "@/server/cohorts/sql";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Percent, UserCheck, Users } from "lucide-react";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import Pagination from "@/components/common/Pagination";
import ClassActivityParticipantsFilter from "@/components/class-officer/activities/ClassActivityParticipantsFilter";

type SearchParams = Promise<{ keyword?: string; status?: string; attendanceMethod?: string; termId?: string; page?: string }>;
type ActivityRow = { id: number; title: string; description: string | null; organizer_level: string; start_at: string; end_at: string; registration_start_at: string; registration_end_at: string; conduct_score: number };
type StudentRow = { id: number; full_name: string; mssv: string; registration_status: string; registered_at: string; checked_in_at: string | null; import_batch_id: number | null; attendance_note: string | null };
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

function getAttendanceMethod(row: Pick<StudentRow, "registration_status" | "import_batch_id" | "attendance_note">) {
  if (row.registration_status !== "attended") return "—";
  if (row.import_batch_id != null) return "Cập nhật từ danh sách";
  if (row.attendance_note?.includes("thủ công")) return "Thủ công";
  return row.attendance_note ? "Quét mã QR" : "—";
}

export default async function ClassOfficerActivityDetailPage({ params, searchParams }: { params: Promise<{ cohort?: string; id: string }>; searchParams: SearchParams }) {
  const user = await requireClassOfficerContext();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const activityId = await getDatabase().resolveRouteRecordId(id);
  if (!Number.isFinite(activityId) || activityId <= 0) notFound();

  const db = getDatabase();
  const officerClass = (await db.first(`
    SELECT c.id, c.code, c.name FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.user_id = ? AND cm.left_at IS NULL
    ORDER BY cm.id DESC LIMIT 1
  `, [user.id])) as { id: number; code: string; name: string } | undefined;
  if (!officerClass) throw new Error("Tài khoản cán bộ lớp chưa được gán lớp đang hoạt động.");

  const activity = (await db.first(`
    SELECT a.id, a.title, a.description, a.organizer_level, a.start_at, a.end_at,
      a.registration_start_at, a.registration_end_at, a.conduct_score
    FROM activities a
    WHERE a.id = ?
      AND a.status = 'published'
      AND a.audience_type = 'student'
      AND ${classActivityVisibleSql("a", String(officerClass.id))}
    LIMIT 1
  `, [activityId])) as ActivityRow | undefined;
  if (!activity) notFound();

  const keyword = String(sp.keyword ?? "").trim();
  const status = ["registered", "attended"].includes(String(sp.status)) ? String(sp.status) : "";
  const attendanceMethod = ["qr", "manual", "import"].includes(String(sp.attendanceMethod)) ? String(sp.attendanceMethod) : "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const summary = (await db.first(`
    SELECT
      (SELECT COUNT(*) FROM class_members cm INNER JOIN users u ON u.id=cm.user_id WHERE cm.class_id=? AND cm.left_at IS NULL AND u.role IN ('student','class_officer') AND u.is_active=1) AS class_total,
      COUNT(CASE WHEN ar.status IN ('registered','attended') THEN 1 END) AS registered,
      COUNT(CASE WHEN ar.status='attended' THEN 1 END) AS attended
    FROM activity_registrations ar
    INNER JOIN users u ON u.id=ar.user_id
    INNER JOIN class_members cm ON cm.user_id=u.id AND cm.left_at IS NULL
    WHERE ar.activity_id=? AND cm.class_id=? AND u.role IN ('student','class_officer') AND u.is_active=1
  `, [officerClass.id, activity.id, officerClass.id])) as SummaryRow;

  const where = ["ar.activity_id = ?", "cm.class_id = ?", "cm.left_at IS NULL", "u.role IN ('student','class_officer')", "u.is_active = 1", "ar.status IN ('registered','attended')"];
  const values: unknown[] = [activity.id, officerClass.id];
  if (keyword) { where.push("(u.full_name LIKE ? OR u.mssv LIKE ?)"); values.push(`%${keyword}%`, `%${keyword}%`); }
  if (status) { where.push("ar.status = ?"); values.push(status); }
  if (attendanceMethod === "import") {
    where.push("ar.status = 'attended' AND ar.import_batch_id IS NOT NULL");
  } else if (attendanceMethod === "manual") {
    where.push("ar.status = 'attended' AND ar.import_batch_id IS NULL AND EXISTS (SELECT 1 FROM activity_attendance_logs al WHERE al.activity_id=ar.activity_id AND al.user_id=ar.user_id AND al.result='success' AND al.note LIKE '%thủ công%')");
  } else if (attendanceMethod === "qr") {
    where.push("ar.status = 'attended' AND ar.import_batch_id IS NULL AND EXISTS (SELECT 1 FROM activity_attendance_logs al WHERE al.activity_id=ar.activity_id AND al.user_id=ar.user_id AND al.result='success' AND (al.note IS NULL OR al.note NOT LIKE '%thủ công%'))");
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const totalRow = (await db.first(`SELECT COUNT(*) AS total FROM activity_registrations ar INNER JOIN users u ON u.id=ar.user_id INNER JOIN class_members cm ON cm.user_id=u.id ${whereSql}`, [...values])) as { total: number };
  const students = (await db.rows(`
    SELECT ar.id,u.full_name,u.mssv,ar.status AS registration_status,ar.registered_at,ar.checked_in_at,ar.import_batch_id,
      (SELECT al.note FROM activity_attendance_logs al WHERE al.activity_id=ar.activity_id AND al.user_id=ar.user_id AND al.result='success' ORDER BY al.id DESC LIMIT 1) AS attendance_note
    FROM activity_registrations ar INNER JOIN users u ON u.id=ar.user_id INNER JOIN class_members cm ON cm.user_id=u.id ${whereSql}
    ORDER BY CASE ar.status WHEN 'attended' THEN 1 WHEN 'registered' THEN 2 ELSE 3 END, CAST(COALESCE(ar.checked_in_at,ar.registered_at) AS DATETIME(3)) DESC,ar.id DESC
    LIMIT ? OFFSET ?
  `, [...values, PAGE_SIZE, offset])) as StudentRow[];
  const totalPages = Math.max(1, Math.ceil(Number(totalRow.total ?? 0) / PAGE_SIZE));
  const attendanceRate = summary.registered ? Math.round((summary.attended / summary.registered) * 100) : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="mb-2 text-sm font-medium text-blue-100/80">{activity.organizer_level === "class" ? "Hoạt động cấp lớp" : "Hoạt động cấp khoa"} · Theo dõi lớp {officerClass.code}</div><h1 className="text-2xl font-semibold">{activity.title}</h1><p className="mt-1 text-sm text-blue-100/80">{formatDateTimeVN(activity.start_at)} → {formatDateTimeVN(activity.end_at)}</p></div>
          <Link href={`/dashboard/class-officer/activities${sp.termId ? `?termId=${encodeURIComponent(sp.termId)}` : ""}`} className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50" data-back-link><ArrowLeft size={16} /><span className="ml-2">Quay về</span></Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<Users size={20} />} label="Sinh viên đăng ký" value={summary.registered} />
        <Metric icon={<UserCheck size={20} />} label="Đã tham gia" value={summary.attended} />
        <Metric icon={<Percent size={20} />} label="Tỷ lệ tham gia" value={`${attendanceRate}%`} />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-xl font-semibold text-slate-900">Thông tin hoạt động</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Điểm rèn luyện" value={`${activity.conduct_score ?? 0} điểm`} />
          <Info label="Mở đăng ký" value={formatDateTimeVN(activity.registration_start_at)} />
          <Info label="Đóng đăng ký" value={formatDateTimeVN(activity.registration_end_at)} />
          <Info label="Quy mô lớp" value={`${summary.class_total} thành viên`} />
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><div className="text-sm font-semibold text-slate-900">Mô tả</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{activity.description || "Chưa có mô tả"}</div></div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div><ClassActivityParticipantsFilter /></div>

      <div className="mt-5"><h2 className="text-xl font-semibold text-slate-900">Sinh viên lớp tham gia</h2></div>
        <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-x-auto rounded-none border border-slate-200">
          <NumberedTable page={page} className="w-full min-w-0 table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr><th className="w-[29%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Sinh viên</th><th className="w-[17%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Trạng thái</th><th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Hình thức điểm danh</th><th className="w-[17%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Đăng ký</th><th className="w-[17%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Điểm danh</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {students.length ? students.map((item) => <tr key={item.id} className="transition hover:bg-slate-50/70"><td className="px-4 py-4 align-top"><div className="text-sm font-semibold text-slate-900">{item.full_name}</div><div className="mt-1 text-xs text-slate-500">{item.mssv}</div></td><td className="px-4 py-4 align-top"><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getRegistrationStatusClass(item.registration_status)}`}>{mapRegistrationStatus(item.registration_status)}</span></td><td className="px-4 py-4 align-top text-sm text-slate-700">{getAttendanceMethod(item)}</td><td className="px-4 py-4 align-top text-sm text-slate-700">{formatDateTimeVN(item.registered_at)}</td><td className="px-4 py-4 align-top text-sm text-slate-700">{item.checked_in_at ? formatDateTimeVN(item.checked_in_at) : "—"}</td></tr>) : <tr><td colSpan={5} className="px-4 py-12 text-center"><div className="text-sm font-semibold text-slate-700">Chưa có sinh viên tham gia phù hợp</div></td></tr>}
            </tbody>
          </NumberedTable>
        </div>
<div className="mt-5"><Pagination totalResults={Number(totalRow.total ?? 0)} resultLabel="sinh viên" page={page} totalPages={totalPages} searchParams={{ keyword, status, attendanceMethod, termId: sp.termId }} /></div>
</div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"><div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div><div className="mt-2 text-sm font-semibold text-slate-900">{value}</div></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div></div>;
}
