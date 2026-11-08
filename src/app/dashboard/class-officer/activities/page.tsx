import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import NumberedTable from "@/components/common/NumberedTable";
import { classActivityVisibleSql } from "@/server/cohorts/sql";
import { Activity, CalendarClock, CheckCircle2, Users } from "lucide-react";
import { requireClassOfficerContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
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
  const db = getDatabase();
  const terms = (await getAcademicTermsForSelect());
  const selectedTerm = (await getAcademicTermForView(params.termId));
  const officerClass = (await db.first(`
    SELECT c.id, c.code, c.name FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.user_id = ? AND cm.left_at IS NULL
    ORDER BY cm.id DESC LIMIT 1
  `, [user.id])) as { id: number; code: string; name: string } | undefined;
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
    `${classActivityVisibleSql("a", String(officerClass.id))}`,
  ];
  const values: unknown[] = [selectedTerm.id];
  if (keyword) {
    where.push("a.title LIKE ?");
    values.push(`%${keyword}%`);
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

  const summary = (await db.first(`
    SELECT
      COUNT(DISTINCT a.id) AS total_activities,
      COUNT(DISTINCT CASE WHEN a.start_at>CURRENT_TIMESTAMP(3) THEN a.id END) AS upcoming,
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
      AND ${classActivityVisibleSql("a", String(officerClass.id))}
  `, [selectedTerm.id, classId, selectedTerm.id])) as SummaryRow;

  const total = (await db.first(`SELECT COUNT(*) AS total FROM activities a ${whereSql}`, [...values])) as { total: number };
  const rows = (await db.rows(`
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
    ORDER BY CASE WHEN a.start_at<=CURRENT_TIMESTAMP(3) AND a.end_at>=CURRENT_TIMESTAMP(3) THEN 0 WHEN a.start_at>CURRENT_TIMESTAMP(3) THEN 1 ELSE 2 END,
      a.start_at DESC, a.id DESC
    LIMIT ? OFFSET ?
  `, [classId, classId, ...values, PAGE_SIZE, offset])) as Row[];
  const totalPages = Math.max(1, Math.ceil(Number(total.total ?? 0) / PAGE_SIZE));
  const facultyShare = summary.faculty_attended ? Math.round((summary.class_attended / summary.faculty_attended) * 100) : 0;
  const attendanceRate = summary.class_registered ? Math.round((summary.class_attended / summary.class_registered) * 100) : 0;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Activity size={22} /></div>
          <div><h1 className="text-2xl font-semibold">Hoạt động</h1></div>
          </div>
          <AcademicTermSelect variant="header" terms={terms} selectedTermId={selectedTerm.id} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Activity size={20} />} label="Tất cả hoạt động" value={summary.total_activities} />
        <SummaryCard icon={<CalendarClock size={20} />} label="Hoạt động sắp diễn ra" value={summary.upcoming} />
        <SummaryCard icon={<Users size={20} />} label="Tham gia so với toàn khoa" value={`${facultyShare}%`} />
        <SummaryCard icon={<CheckCircle2 size={20} />} label="Tham gia trên đăng ký" value={`${attendanceRate}%`} />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div><ClassActivitiesFilter /></div>

      <div className="mt-5"><h2 className="text-xl font-semibold text-slate-900">Danh sách hoạt động</h2></div>
        <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-x-auto rounded-none border border-slate-200">
          <NumberedTable page={page} className="w-full min-w-0 table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="w-[30%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Hoạt động</th>
              <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Cấp tổ chức</th>
              <th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-slate-700">Thời gian</th>
              <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Đăng ký</th>
              <th className="w-[14%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Đã tham gia</th>
              <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-700">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length ? rows.map((item) => {
                const rate = item.participants ? Math.round((item.attended / item.participants) * 100) : 0;
                return <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4 align-top"><div className="text-sm font-semibold text-slate-900">{item.title}</div><div className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description || "Chưa có mô tả"}</div></td>
                  <td className="px-4 py-4 text-center align-top"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${item.organizer_level === "class" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{item.organizer_level === "class" ? "Chi đoàn" : "Cấp khoa"}</span></td>
                  <td className="px-4 py-4 align-top text-sm text-slate-700">{formatDateTimeVN(item.start_at)}<div className="mt-1 text-xs text-slate-400">đến {formatDateTimeVN(item.end_at)}</div></td>
                  <td className="px-4 py-4 text-center align-top text-sm font-semibold text-blue-700">{item.participants}</td>
                  <td className="px-4 py-4 text-center align-top"><div className="text-sm font-semibold text-emerald-700">{item.attended}</div><div className="mt-1 text-xs text-slate-400">{rate}% đăng ký</div></td>
                  <td className="px-4 py-4 text-center align-top"><TableActionLink href={`/dashboard/class-officer/activities/${item.id}?termId=${selectedTerm.id}`} variant="view">Xem</TableActionLink></td>
                </tr>;
              }) : <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="text-sm font-semibold text-slate-700">Chưa có hoạt động phù hợp</div></td></tr>}
            </tbody>
          </NumberedTable>
        </div>
<div className="mt-5"><ReviewPagination totalResults={Number(total.total ?? 0)} resultLabel="hoạt động" page={page} totalPages={totalPages} basePath="/dashboard/class-officer/activities" searchParams={{ keyword, level, attendance, termId: String(selectedTerm.id) }} /></div>
</div>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div></div>;
}
