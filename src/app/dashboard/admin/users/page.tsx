import TableActionLink from "@/components/shared/TableActionLink";
import { Users } from "lucide-react";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import AdminUsersFilter from "@/components/admin/users/AdminUsersFilter";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  role?: string;
  active?: string;
  classId?: string;
}>;

type Row = {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: number;
  class_code: string | null;
};

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

const PAGE_SIZE = 10;

function roleLabel(role: string) {
  if (role === "class_officer") return "Cán bộ lớp";
  if (role === "faculty_officer") return "Cán bộ khoa";
  return "Sinh viên";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDb();

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const keyword = String(params.keyword ?? "").trim();
  const role = String(params.role ?? "").trim();
  const active = String(params.active ?? "").trim();
  const classId = Number(params.classId ?? 0);

  const classes = db
    .prepare(
      `
      SELECT id, code, name
      FROM classes
      WHERE is_active = 1
      ORDER BY code ASC, id ASC
      `
    )
    .all() as ClassOption[];

  const where: string[] = [`u.role != 'admin'`];
  const values: unknown[] = [];

  if (keyword) {
    where.push(
      `(u.full_name LIKE ? OR u.mssv LIKE ? OR u.email LIKE ? OR c.code LIKE ?)`
    );
    values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (role) {
    where.push(`u.role = ?`);
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

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      LEFT JOIN class_members cm ON cm.user_id = u.id AND cm.left_at IS NULL
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
      `
    )
    .get(...values) as { total: number };

  const rows = db
    .prepare(
      `
      SELECT
        u.id,
        u.mssv,
        u.full_name,
        u.email,
        u.role,
        u.is_active,
        GROUP_CONCAT(c.code, ', ') AS class_code
      FROM users u
      LEFT JOIN class_members cm ON cm.user_id = u.id AND cm.left_at IS NULL
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
      GROUP BY u.id
      ORDER BY u.id DESC
      LIMIT ?
      OFFSET ?
      `
    )
    .all(...values, PAGE_SIZE, offset) as Row[];

  const total = Number(totalRow.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
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

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">
          Danh sách tài khoản
        </h2>

        <div className="mt-5">
          <AdminUsersFilter classes={classes} />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[28%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Người dùng
                </th>
                <th className="w-[16%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
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
              {rows.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.full_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.mssv} · {item.email || "Chưa có email"}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    {item.class_code || "-"}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    {roleLabel(item.role)}
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
                      href={`/dashboard/admin/users/${item.id}`}
                      variant="view"
                    >
                      Xem
                    </TableActionLink>
                  </td>
                </tr>
              ))}

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
          </table>
        </div>

        <div className="mt-5">
          <Pagination
            page={page}
            totalPages={totalPages}
            searchParams={{
              keyword,
              role,
              active,
              classId: classId > 0 ? String(classId) : "",
            }}
          />
        </div>
      </section>
    </main>
  );
}
