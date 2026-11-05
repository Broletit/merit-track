import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
import ProfileEmailForm from "./ProfileEmailForm";
import PaginatedTable from "@/components/common/PaginatedTable";
import { redirect } from "next/navigation";
import { requireLogin } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { getUiLabelByLoginContext } from "@/server/auth/role-context";
import StudentQrCard from "@/components/student/qr/StudentQrCard";
import { createStudentQrPayload, encodeStudentQr } from "@/server/auth/qr";

type ClassRow = {
  id: number;
  code: string;
  name: string;
};

function roleLabel(role: string) {
  if (role === "class_officer") return "Cán bộ Lớp";
  if (role === "faculty_officer") return "Cán bộ Khoa";
  if (role === "admin") return "Quản trị viên";
  return "Sinh viên";
}

function roleLabels(roles: string[]) {
  const officerRoles = roles.filter((role) => role === "class_officer" || role === "faculty_officer");
  return (officerRoles.length ? officerRoles : roles).map(roleLabel).join(", ");
}

export default async function ProfileContent() {
  const user = await requireLogin();

  if (user.roles.includes("admin")) {
    redirect("/dashboard/admin");
  }

  const db = getDatabase();

  const classes = (await db.rows(`
      SELECT DISTINCT c.id, c.code, c.name
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = ?
        AND cm.left_at IS NULL
      ORDER BY c.name ASC, c.id ASC
      `, [user.id])) as ClassRow[];
  const context = user.loginContext ?? user.role;
  const managedClasses = context === "faculty_officer"
    ? (await db.rows(`SELECT DISTINCT c.id,c.code,c.name FROM faculty_class_assignments fa JOIN classes c ON c.id=fa.class_id WHERE fa.faculty_officer_id=? AND c.is_active=1 ORDER BY c.code`, [user.id])) as ClassRow[]
    : context === "class_officer" ? classes : [];
  const qrPayload = encodeStudentQr(
    createStudentQrPayload(Number(user.id), String(user.mssv))
  );

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <h1 className="text-2xl font-semibold">Thông tin cá nhân</h1>
      </section>

      <section className="min-w-0 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-900 text-2xl font-bold text-white shadow-md shadow-blue-900/20">
              {user.full_name.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {user.full_name}
              </h2>
              <p className={[statCardStyles.label, "mt-1"].join(" ")}>{user.mssv}</p>
            </div>
          </div>
          <StudentQrCard
            fullName={user.full_name}
            mssv={user.mssv}
            payload={qrPayload}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Info label="Họ tên" value={user.full_name} />
          <Info label="MSSV" value={user.mssv} />
          <Info label="Trạng thái" value={user.is_active ? "Đang hoạt động" : "Bị khóa"} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Info label="Vai trò tài khoản" value={roleLabels(user.roles)} />
          <Info
            label="Giao diện đang dùng"
            value={getUiLabelByLoginContext(user.loginContext as never)}
          />
          <Info
            label="Lớp"
            value={
              classes.length > 0
                ? classes.map((item) => `${item.code} — ${item.name}`).join(", ")
                : "Chưa gán lớp"
            }
          />
        </div>
        <ProfileEmailForm email={user.email}/>
      </section>

      {context === "faculty_officer" || context === "class_officer" ? <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-xl font-semibold text-slate-900">{context === "faculty_officer" ? "Lớp được phân công quản lý" : "Chi đoàn phụ trách"}</h2>

        <PaginatedTable className="min-w-full table-fixed divide-y divide-slate-200" containerClassName="mt-5 overflow-hidden rounded-none border border-slate-200" resultLabel="bản ghi">
            <thead className="bg-slate-50">
              <tr>
                <th data-column-align="left" className="w-[30%] px-4 py-3  text-sm font-semibold text-slate-700 text-left">
                  Mã lớp
                </th>
                <th data-column-align="left" className="w-[70%] px-4 py-3  text-sm font-semibold text-slate-700 text-left">
                  Tên lớp
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {managedClasses.length > 0 ? (
                managedClasses.map((item) => (
                  <tr key={item.id}>
                    <td data-column-align="left" className="px-4 py-4 text-sm font-semibold text-slate-900 text-left">
                      {item.code}
                    </td>
                    <td data-column-align="left" className="px-4 py-4 text-sm text-slate-700 text-left">
                      {item.name}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Chưa được phân công lớp quản lý.
                  </td>
                </tr>
              )}
            </tbody>
          </PaginatedTable>
      </section> : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
