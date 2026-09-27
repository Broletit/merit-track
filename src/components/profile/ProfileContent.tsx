import { redirect } from "next/navigation";
import { requireLogin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import { getUiLabelByLoginContext } from "@/server/auth/role-context";
import StudentQrCard from "@/components/student/qr/StudentQrCard";
import { createStudentQrPayload, encodeStudentQr } from "@/server/auth/qr";

type ClassRow = {
  code: string;
  name: string;
};

function roleLabel(role: string) {
  if (role === "class_officer") return "Cán bộ Lớp";
  if (role === "faculty_officer") return "Cán bộ Khoa";
  if (role === "admin") return "Quản trị viên";
  return "Sinh viên";
}

export default async function ProfileContent() {
  const user = await requireLogin();

  if (user.role === "admin") {
    redirect("/dashboard/admin");
  }

  const db = getDb();

  const classes = db
    .prepare(
      `
      SELECT DISTINCT c.code, c.name
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = ?
        AND cm.left_at IS NULL
      ORDER BY c.name ASC, c.id ASC
      `
    )
    .all(user.id) as ClassRow[];
  const qrPayload = encodeStudentQr(
    createStudentQrPayload(Number(user.id), String(user.mssv))
  );

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <h1 className="text-2xl font-semibold">Thông tin cá nhân</h1>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900 text-2xl font-semibold text-white">
              {user.full_name.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {user.full_name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{user.mssv}</p>
            </div>
          </div>
          <StudentQrCard
            fullName={user.full_name}
            mssv={user.mssv}
            payload={qrPayload}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Họ tên" value={user.full_name} />
          <Info label="MSSV / Mã tài khoản" value={user.mssv} />
          <Info label="Email" value={user.email || "Chưa cập nhật"} />
          <Info label="Trạng thái" value={user.is_active ? "Đang hoạt động" : "Bị khóa"} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Vai trò tài khoản" value={roleLabel(user.role)} />
          <Info
            label="Giao diện đang dùng"
            value={getUiLabelByLoginContext(user.loginContext as never)}
          />
          <Info
            label="Lớp"
            value={
              classes.length > 0
                ? classes.map((item) => item.code).join(", ")
                : "Chưa gán lớp"
            }
          />
          <Info
            label="Số lớp liên kết"
            value={String(classes.length)}
          />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">Lớp liên kết</h2>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[30%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Mã lớp
                </th>
                <th className="w-[70%] px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Tên lớp
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {classes.length > 0 ? (
                classes.map((item) => (
                  <tr key={item.code}>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {item.code}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
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
                    Chưa có lớp liên kết.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
