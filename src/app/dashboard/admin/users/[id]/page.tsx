import { getTransferClassOptions } from "@/server/cohorts/classCohortIntegrity";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import { getUserPublicId, resolveUserPublicId } from "@/server/auth/publicUserId";
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
  cohort:number|null;
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
  cohort?:number|null;
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

function roleLabels(roles: string[]) {
  const officerRoles = roles.filter((role) => role === "class_officer" || role === "faculty_officer");
  return (officerRoles.length ? officerRoles : roles).map(roleLabel).join("\n");
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
  const db = getDatabase();
  if (/^\d+$/.test(id)) {
    const token = (await getUserPublicId(db, Number(id)));
    if (!token) notFound();
    redirect(`/dashboard/admin/users/${token}`);
  }
  const userId = (await resolveUserPublicId(db, id));
  if (!userId) notFound();

  const userColumns = (await db.rows(`SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users'`, [])) as Array<{ name: string }>;

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

  const user = (await db.first(`
      SELECT
        u.id,
        u.full_name,
        u.mssv,
        u.cohort,
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
      LIMIT 1
      `, [userId])) as UserRow | undefined;

  if (!user) {
    notFound();
  }

  const classes = (await db.rows(`
      SELECT id, code, name, cohort
      FROM classes
      WHERE is_active = 1
      ORDER BY code ASC, id ASC
      `, [])) as ClassOption[];

  const transferClasses = (await getTransferClassOptions(db,user.id));
  const selectedClassIds = (await db.rows(`
      SELECT class_id
      FROM faculty_class_assignments
      WHERE faculty_officer_id = ?
      ORDER BY class_id ASC
      `, [user.id]))
    .map((item) => Number((item as { class_id: number }).class_id));
  const roles = (await db.rows(`SELECT role FROM user_role_assignments WHERE user_id=? ORDER BY FIELD(role,'student','class_officer','faculty_officer')`, [user.id]) as Array<{role:string}>).map((item) => item.role);
  const effectiveRoles = roles.length ? roles : [user.role];

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{user.full_name}</h1>
            <p className="mt-1 break-words text-sm text-blue-100/80">
              {user.class_code ? `Lớp: ${user.class_code}${user.class_name ? ` - ${user.class_name}` : ""}` : "Chưa gán lớp"}
            </p>
          </div>

          <Link
            href="/dashboard/admin/users"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
           data-back-link>
            <ArrowLeft size={16} />
            Quay về
          </Link>
        </div>
      </section>

      <section id="user-information" className="min-w-0 scroll-mt-24 rounded-3xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
        <h2 className="text-xl font-semibold text-slate-900">
          Thông tin người dùng
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Họ tên" value={user.full_name} />
              <InfoItem label="MSSV / Mã cán bộ" value={user.mssv} />
              <InfoItem label="Vai trò" value={roleLabels(effectiveRoles)} />
              <InfoItem
                label="Trạng thái"
                value={
                  Number(user.is_active) === 1
                    ? "Đang hoạt động"
                    : "Đã vô hiệu hóa"
                }
              />
              <InfoItem label="Email" value={user.email} />
              <InfoItem label="Số điện thoại" value={user.phone} />
              <InfoItem label="Giới tính" value={user.gender} />
              <InfoItem label="Ngày sinh" value={formatBirthDate(user.date_of_birth)} />
        </div>
      </section>

      <section className="grid min-w-0 items-stretch gap-6 md:grid-cols-2">
        <UserAccountAdminForm userId={user.id} currentRoles={effectiveRoles} currentActive={Number(user.is_active) === 1}/>
        <UserClassAdminForm userId={user.id} classes={transferClasses} currentClassId={user.class_id}/>
      </section>
      {effectiveRoles.includes('faculty_officer') ? <FacultyClassAssignmentForm facultyOfficerId={user.id} classes={classes} selectedClassIds={selectedClassIds}/> : null}
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

function formatBirthDate(value: string | null) {
  if (!value?.trim()) return null;
  const text = value.trim();
  // Birth dates are calendar dates; avoid timezone conversions or ambiguous US date parsing.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(text);
  if (iso) return iso[3].padStart(2,"0")+"/"+iso[2].padStart(2,"0")+"/"+iso[1];
  const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(text);
  if (local) return local[1].padStart(2,"0")+"/"+local[2].padStart(2,"0")+"/"+local[3];
  // Older Excel imports stored the built-in US short-date display (m/d/yy).
  const legacyExcel = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(text);
  if (legacyExcel) {
    const month=Number(legacyExcel[1]), day=Number(legacyExcel[2]);
    const shortYear=Number(legacyExcel[3]);
    const year=(shortYear <= 29 ? 2000 : 1900)+shortYear;
    const date=new Date(Date.UTC(year,month-1,day));
    if (date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day)
      return String(day).padStart(2,"0")+"/"+String(month).padStart(2,"0")+"/"+year;
  }
  return text;
}
