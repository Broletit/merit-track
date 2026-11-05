import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import NumberedTable from "@/components/common/NumberedTable";
import { addCohortFilter } from "@/server/cohorts/sql";
import TableActionLink from "@/components/shared/TableActionLink";
import { ShieldCheck, UserCheck, UserRoundCog, UserX, Users } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { getUserPublicId } from "@/server/auth/publicUserId";
import Pagination from "@/components/common/Pagination";
import AdminUsersFilter from "@/components/admin/users/AdminUsersFilter";

type SearchParams = Promise<{ cohort?: string;
  page?: string;
  keyword?: string;
  role?: string;
  active?: string;
  classId?: string;
}>;

type Row = {
  id: number;
  mssv: string;
  cohort: number|null;
  full_name: string;
  email: string | null;
  role: string;
  roles: string | null;
  is_active: number;
  class_code: string | null;
};

type ClassOption = {
  id: number;
  code: string;
  name: string;
  cohort: number | null;
};

const PAGE_SIZE = 10;

function roleLabel(role: string) {
  if (role === "class_officer") return "Cán bộ lớp";
  if (role === "faculty_officer") return "Cán bộ khoa";
  return "Sinh viên";
}

function roleLabels(value: string | null, fallback: string) {
  const roles = value?.split(",").filter(Boolean) ?? [fallback];
  const officerRoles = roles.filter((role) => role === "class_officer" || role === "faculty_officer");
  return (officerRoles.length ? officerRoles : roles).map(roleLabel).join(", ");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDatabase();

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const keyword = String(params.keyword ?? "").trim();
  const role = String(params.role ?? "").trim();
  const active = String(params.active ?? "").trim();
  const requestedClassId = Number(params.classId ?? 0);

  const classes = (await db.rows(`
      SELECT id, code, name, cohort
      FROM classes
      WHERE is_active = 1
      ORDER BY code ASC, id ASC
      `, [])) as ClassOption[];

  const classId = classes.some(item => item.id === requestedClassId && (!params.cohort || String(item.cohort) === params.cohort)) ? requestedClassId : 0;

  const where: string[] = [`u.role != 'admin'`];
  const values: unknown[] = [];
  addCohortFilter(where,values,params.cohort,"u.cohort");

  if (keyword) {
    where.push(
      `(u.full_name LIKE ? OR u.mssv LIKE ?)`
    );
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (role) {
    where.push(`EXISTS(SELECT 1 FROM user_role_assignments ura_filter WHERE ura_filter.user_id=u.id AND ura_filter.role=?)`);
    values.push(role);
  }

  if (active === "1" || active === "0") {
    where.push(`u.is_active = ?`);
    values.push(Number(active));
  }

  if (Number.isFinite(classId) && classId > 0) {
    where.push(`cm.class_id = ?`);
    values.push(classId);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = (await db.first(`
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      LEFT JOIN class_members cm ON cm.user_id = u.id AND cm.left_at IS NULL
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
      `, [...values])) as { total: number };

  const rows = (await db.rows(`
      SELECT
        u.id,
        u.mssv,
        u.cohort,
        u.full_name,
        u.email,
        u.role,
        GROUP_CONCAT(DISTINCT ura.role ORDER BY FIELD(ura.role,'student','class_officer','faculty_officer') SEPARATOR ',') AS roles,
        u.is_active,
        GROUP_CONCAT(DISTINCT c.code ORDER BY c.code SEPARATOR ', ') AS class_code
      FROM users u
      LEFT JOIN class_members cm ON cm.user_id = u.id AND cm.left_at IS NULL
      LEFT JOIN classes c ON c.id = cm.class_id
      LEFT JOIN user_role_assignments ura ON ura.user_id=u.id
      ${whereSql}
      GROUP BY u.id
      ORDER BY u.id DESC
      LIMIT ?
      OFFSET ?
      `, [...values, PAGE_SIZE, offset])) as Row[];

  const total = Number(totalRow.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const userSummary = (await db.first(`SELECT COUNT(*) total, SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) active_count, SUM(CASE WHEN is_active=0 THEN 1 ELSE 0 END) inactive_count, SUM(CASE WHEN role='faculty_officer' THEN 1 ELSE 0 END) faculty_count, SUM(CASE WHEN role='class_officer' THEN 1 ELSE 0 END) class_count FROM users WHERE role<>'admin'`, [])) as { total: number; active_count: number; inactive_count: number; faculty_count: number; class_count: number };

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Users size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserSummaryCard icon={<UserCheck size={19} />} label="Đang hoạt động" value={userSummary.active_count} total={userSummary.total} />
        <UserSummaryCard icon={<UserX size={19} />} label="Đã vô hiệu hóa" value={userSummary.inactive_count} total={userSummary.total} />
        <UserSummaryCard icon={<ShieldCheck size={19} />} label="Cán bộ khoa" value={userSummary.faculty_count} total={userSummary.total} />
        <UserSummaryCard icon={<UserRoundCog size={19} />} label="Cán bộ lớp" value={userSummary.class_count} total={userSummary.total} />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div>
          <AdminUsersFilter classes={classes} />
        </div>

      <h2 className="mt-5 text-xl font-semibold text-slate-900">
          Danh sách tài khoản
        </h2>

        <div data-table-frame className="mt-5 min-w-0 overflow-hidden rounded-none border border-slate-200 bg-white">
<div className="overflow-hidden rounded-none border border-slate-200">
          <NumberedTable page={page} className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[28%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Người dùng
                </th>
                <th data-column-align="left" className="w-[16%] px-4 py-3  text-sm font-semibold text-slate-700 text-left">
                  Lớp
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Vai trò
                </th>
                <th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="w-[12%] px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {(await Promise.all(rows.map(async (item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.full_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.mssv} · {item.email || "Chưa có email"}
                    </div>
                  </td>

                  <td data-column-align="left" className="px-4 py-4 text-sm text-slate-700 text-left">
                    {item.class_code || "-"}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    {roleLabels(item.roles, item.role)}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        item.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {item.is_active ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <TableActionLink
                      href={`/dashboard/admin/users/${(await getUserPublicId(db, item.id))}`}
                      variant="view"
                    >
                      Xem
                    </TableActionLink>
                  </td>
                </tr>
              ))))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Không có người dùng phù hợp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </NumberedTable>
        </div>
<div className="mt-5">
          <Pagination totalResults={total} resultLabel="tài khoản"
            page={page}
            totalPages={totalPages}
            searchParams={{ cohort: params.cohort,
              keyword,
              role,
              active,
              classId: classId > 0 ? String(classId) : "",
            }}
          />
        </div>
</div>
      </section>
    </main>
  );
}

function UserSummaryCard({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total: number }) {
  return <div className={[statCardStyles.card, "min-w-0"].join(" ")}><div className="flex items-center justify-between gap-3"><span className={statCardStyles.label}>{label}</span><span className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</span></div><div className="mt-4 flex items-baseline gap-1.5"><span className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</span><span className={statCardStyles.label}>/ {total}</span></div></div>;
}
