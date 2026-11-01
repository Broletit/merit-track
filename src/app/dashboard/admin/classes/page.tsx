import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import NumberedTable from "@/components/common/NumberedTable";
import { addCohortFilter } from "@/server/cohorts/sql";
import Link from "next/link";
import { AlertTriangle, School, ShieldCheck } from "lucide-react";
import Pagination from "@/components/common/Pagination";
import AdminClassesFilter from "@/components/admin/classes/AdminClassesFilter";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

const PAGE_SIZE = 10;

type SearchParams = Promise<{ cohort?: string; page?: string; keyword?: string; officerStatus?: string; major?: string; classId?: string }>;
type ClassRow = {
  id: number;
  code: string;
  name: string;
  faculty: string | null;
  intake_year: number | null;
  cohort:number|null;
  is_active: number;
  student_count: number;
  officer_count: number;
  officer_names: string | null;
};

export default async function AdminClassesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminContext();
  const params = await searchParams;
  const db = getDatabase();
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const keyword = String(params.keyword ?? "").trim();
  const officerStatus = String(params.officerStatus ?? "").trim();
  const major = String(params.major ?? "").trim();

  const where: string[] = [];
  const values: unknown[] = [];
  if (params.classId) {
    where.push("c.id = ?");
    values.push(Number(params.classId) || -1);
  }
  addCohortFilter(where,values,params.cohort,"c.cohort");
  if (keyword) {
    where.push("(c.code LIKE ? OR c.name LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (major) {
    where.push("c.faculty = ?");
    values.push(major);
  }

  const officerCountSql = `(SELECT COUNT(*) FROM class_members cm2 INNER JOIN users u2 ON u2.id=cm2.user_id WHERE cm2.class_id=c.id AND cm2.left_at IS NULL AND u2.role='class_officer' AND u2.is_active=1)`;
  if (officerStatus === "vacant") where.push(`${officerCountSql} = 0`);
  if (officerStatus === "partial") where.push(`${officerCountSql} BETWEEN 1 AND 7`);
  if (officerStatus === "full") where.push(`${officerCountSql} >= 8`);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const total = Number(((await db.first(`SELECT COUNT(*) total FROM classes c ${whereSql}`, [...values])) as { total: number }).total);
  const rows = (await db.rows(`
    SELECT c.id,c.code,c.name,c.faculty,c.intake_year,c.cohort,c.is_active,
      (SELECT COUNT(*) FROM class_members cm1 INNER JOIN users u1 ON u1.id=cm1.user_id WHERE cm1.class_id=c.id AND cm1.left_at IS NULL AND u1.is_active=1 AND u1.role IN ('student','class_officer')) student_count,
      ${officerCountSql} officer_count,
      (SELECT GROUP_CONCAT(CONCAT(CONCAT(CONCAT(u3.full_name, ' ('), u3.mssv), ')') SEPARATOR ' • ') FROM class_members cm3 INNER JOIN users u3 ON u3.id=cm3.user_id WHERE cm3.class_id=c.id AND cm3.left_at IS NULL AND u3.role='class_officer' AND u3.is_active=1 ORDER BY u3.full_name) officer_names
    FROM classes c
    ${whereSql}
    ORDER BY CASE WHEN ${officerCountSql}=0 THEN 0 WHEN ${officerCountSql}<8 THEN 1 ELSE 2 END, c.code
    LIMIT ? OFFSET ?
  `, [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE])) as ClassRow[];

  const summary = (await db.first(`SELECT COUNT(*) total, SUM(CASE WHEN ${officerCountSql}=0 THEN 1 ELSE 0 END) vacant, SUM(CASE WHEN ${officerCountSql}>=8 THEN 1 ELSE 0 END) full_count FROM classes c`, [])) as { total: number; vacant: number; full_count: number };
  const majors = ((await db.rows(`SELECT DISTINCT faculty FROM classes WHERE TRIM(COALESCE(faculty,''))<>'' ORDER BY faculty`, [])) as Array<{ faculty: string }>).map((item) => item.faculty);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><School size={23} /></div>
          <h1 className="text-2xl font-semibold">Quản lý lớp học</h1>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={<School size={19} />} label="Tổng số lớp" value={summary.total} />
        <SummaryCard icon={<AlertTriangle size={19} />} label="Chưa có CB lớp" value={summary.vacant ?? 0} />
        <SummaryCard icon={<ShieldCheck size={19} />} label="Đạt số lượng CB tối đa" value={summary.full_count ?? 0} />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div><AdminClassesFilter majors={majors} /></div>

      <h2 className="mt-5 text-xl font-semibold text-slate-900">Danh sách lớp</h2>
        <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-x-auto rounded-none border border-slate-200">
          <NumberedTable page={page} className="min-w-0 w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th data-column-align="left" className="px-4 py-3  text-sm font-semibold text-slate-700 text-left">Lớp</th>
              <th data-column-align="left" className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Ngành</th>
              <th data-column-align="center" className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Sinh viên</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Cán bộ lớp</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((item) => {
                const vacant = item.officer_count === 0;
                return <tr key={item.id} className="bg-white transition hover:bg-slate-50/70">
                  <td data-column-align="left" className="px-4 py-4 text-left"><div className="font-semibold text-slate-900">{item.code}</div><div className="mt-1 text-xs text-slate-500">{item.name}</div></td>
                  <td data-column-align="left" className="px-4 py-4 text-sm text-slate-600">{item.faculty || "Chưa cập nhật"}</td>
                  <td data-column-align="center" className="px-4 py-4 text-center text-sm font-semibold text-slate-700">{item.student_count}</td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${vacant ? "bg-rose-100 text-rose-700" : item.officer_count >= 8 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{vacant ? "Chưa có cán bộ" : `${item.officer_count}/8 cán bộ`}</span>{item.officer_names ? <div className="mt-2 max-w-md text-xs leading-5 text-slate-600">{item.officer_names}</div> : null}</td>
                  <td className="px-4 py-4 text-center"><Link href={vacant ? `/dashboard/admin/users?classId=${item.id}` : `/dashboard/admin/users?classId=${item.id}&role=class_officer`} className="inline-flex h-9 items-center rounded-xl border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50">{vacant ? "Thêm cán bộ lớp" : "Quản lý cán bộ"}</Link></td>
                </tr>;
              })}
              {rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">Không có lớp phù hợp.</td></tr> : null}
            </tbody>
          </NumberedTable>
        </div>
<div className="mt-5"><Pagination totalResults={total} resultLabel="lớp" page={page} totalPages={totalPages} searchParams={{ classId: params.classId, cohort: params.cohort, keyword, officerStatus, major }} /></div>
</div>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex flex-wrap items-center justify-between gap-2"><span className={[statCardStyles.label, "whitespace-normal break-words"].join(" ")}>{label}</span><span className={[statCardStyles.icon, "flex shrink-0 items-center justify-center"].join(" ")}>{icon}</span></div><div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div></div>;
}
