import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import FacultyClassAssignmentForm from "@/components/admin/users/FacultyClassAssignmentForm";
import UserAccountAdminForm from "@/components/admin/users/UserAccountAdminForm";
import UserClassAdminForm from "@/components/admin/users/UserClassAdminForm";

type Params = Promise<{
  id: string;
}>;

type UserRow = {
  id: number;
  full_name: string;
  mssv: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  role: string;
  is_active: number;
  class_id: number | null;
  class_code: string | null;
  class_name: string | null;
};

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

function roleLabel(role: string) {
  if (role === "student") return "Sinh viên";
  if (role === "class_officer") return "Cán bộ lớp";
  if (role === "faculty_officer") return "Cán bộ khoa";
  return role;
}

function valueOrDash(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "Chưa cập nhật";
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminContext();

  const { id } = await params;
  const userId = Number(id);

  if (!Number.isFinite(userId) || userId <= 0) {
    notFound();
  }

  const db = getDb();

  const userColumns = db
    .prepare(`PRAGMA table_info(users)`)
    .all() as Array<{ name: string }>;

  const columnNames = new Set(userColumns.map((item) => item.name));

  const phoneExpr = columnNames.has("phone") ? "u.phone" : "NULL";
  const genderExpr = columnNames.has("gender") ? "u.gender" : "NULL";

  const birthExpr = columnNames.has("date_of_birth")
    ? "u.date_of_birth"
    : columnNames.has("date_of_bird")
      ? "u.date_of_bird"
      : columnNames.has("data_of_bird")
        ? "u.data_of_bird"
        : "NULL";

  const user = db
    .prepare(
      `
      SELECT
        u.id,
        u.full_name,
        u.mssv,
        u.email,
        ${phoneExpr} AS phone,
        ${genderExpr} AS gender,
        ${birthExpr} AS date_of_birth,
        u.role,
        u.is_active,
        c.id AS class_id,
        c.code AS class_code,
        c.name AS class_name
      FROM users u
      LEFT JOIN class_members cm ON cm.user_id = u.id AND cm.left_at IS NULL
      LEFT JOIN classes c ON c.id = cm.class_id
      WHERE u.id = ?
        AND u.role != 'admin'
      GROUP BY u.id
      LIMIT 1
      `
    )
    .get(userId) as UserRow | undefined;

  if (!user) {
    notFound();
  }

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

  const selectedClassIds = db
    .prepare(
      `
      SELECT class_id
      FROM faculty_class_assignments
      WHERE faculty_officer_id = ?
      ORDER BY class_id ASC
      `
    )
    .all(user.id)
    .map((item) => Number((item as { class_id: number }).class_id));

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{user.full_name}</h1>
            <p className="mt-1 text-sm text-blue-100/80">
              {user.mssv} • {roleLabel(user.role)}
            </p>
          </div>

          <Link
            href="/dashboard/admin/users"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Quay về
          </Link>
        </div>
      </section>

      <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <section id="user-information" className="h-full scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-semibold text-slate-900">
          Thông tin người dùng
        </h2>

        <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoItem label="Họ tên" value={user.full_name} />
              <InfoItem label="MSSV / Mã cán bộ" value={user.mssv} />
              <InfoItem label="Vai trò" value={roleLabel(user.role)} />
              <InfoItem
                label="Trạng thái"
                value={
                  Number(user.is_active) === 1
                    ? "Đang hoạt động"
                    : "Đã vô hiệu hóa"
                }
              />
              <InfoItem
                label="Lớp"
                value={
                  user.class_code
                    ? `${user.class_code} - ${user.class_name ?? ""}`
                    : "Chưa gán lớp"
                }
              />
              <InfoItem label="Email" value={user.email} />
              <InfoItem label="Số điện thoại" value={user.phone} />
              <InfoItem label="Giới tính" value={user.gender} />
              <InfoItem label="Ngày sinh" value={user.date_of_birth} />
              <InfoItem label="Mã người dùng" value={String(user.id)} />
        </div>
      </section>

        <UserAccountAdminForm
          userId={user.id}
          currentRole={user.role}
          currentActive={Number(user.is_active) === 1}
        />

      </section>

      {user.role === "faculty_officer" ? (
        <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <FacultyClassAssignmentForm
            facultyOfficerId={user.id}
            classes={classes}
            selectedClassIds={selectedClassIds}
          />
          <UserClassAdminForm
            userId={user.id}
            classes={classes}
            currentClassId={user.class_id}
          />
        </section>
      ) : (
        <UserClassAdminForm
          userId={user.id}
          classes={classes}
          currentClassId={user.class_id}
        />
      )}
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return <div className="min-w-0 border-b border-slate-100 pb-3"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 whitespace-pre-wrap wrap-break-words text-sm font-semibold text-slate-800">{valueOrDash(value)}</div></div>;
}
