import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import Pagination from "@/components/common/Pagination";
import StudentsHeader from "@/components/admin/students/StudentsHeader";
import StudentsTable from "@/components/admin/students/StudentsTable";
import type {
  AdminStudentClassOption,
  AdminStudentItem,
} from "@/components/admin/students/types";

type SearchParams = Promise<{
  page?: string;
  keyword?: string;
  classId?: string;
  status?: string;
}>;

type StudentRow = {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  is_active: number;
  class_id: number | null;
  class_code: string | null;
  class_name: string | null;
};

type ClassRow = {
  id: number;
  code: string;
  name: string;
};

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminContext();

  const params = await searchParams;
  const db = getDb();

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const keyword = String(params.keyword ?? "").trim();
  const classIdRaw = String(params.classId ?? "").trim();
  const status = String(params.status ?? "").trim();

  const where: string[] = [`u.role = 'student'`];
  const values: unknown[] = [];

  if (keyword) {
    where.push(`(u.full_name LIKE ? OR u.mssv LIKE ?)`);
    values.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (classIdRaw === "none") {
    where.push(`cm.class_id IS NULL`);
  } else {
    const classId = Number(classIdRaw);
    if (Number.isFinite(classId) && classId > 0) {
      where.push(`cm.class_id = ?`);
      values.push(classId);
    }
  }

  if (status === "active") {
    where.push(`u.is_active = 1`);
  }

  if (status === "inactive") {
    where.push(`u.is_active = 0`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const classRows = db
    .prepare(
      `
      SELECT id, code, name
      FROM classes
      WHERE is_active = 1
      ORDER BY code ASC, name ASC
      `
    )
    .all() as ClassRow[];

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM users u
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
      `
    )
    .get(...values) as { total: number };

  const studentRows = db
    .prepare(
      `
      SELECT
        u.id,
        u.mssv,
        u.full_name,
        u.email,
        u.is_active,
        c.id AS class_id,
        c.code AS class_code,
        c.name AS class_name
      FROM users u
      LEFT JOIN class_members cm ON cm.user_id = u.id
      LEFT JOIN classes c ON c.id = cm.class_id
      ${whereSql}
      ORDER BY c.code ASC, u.full_name ASC, u.id DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...values, pageSize, offset) as StudentRow[];

  const classes: AdminStudentClassOption[] = classRows.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
  }));

  const items: AdminStudentItem[] = studentRows.map((item) => ({
    id: Number(item.id),
    mssv: String(item.mssv ?? ""),
    fullName: String(item.full_name ?? ""),
    email: item.email ? String(item.email) : null,
    isActive: Number(item.is_active ?? 0) === 1,
    classId: item.class_id ? Number(item.class_id) : null,
    classCode: item.class_code ? String(item.class_code) : null,
    className: item.class_name ? String(item.class_name) : null,
  }));

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6">
      <StudentsHeader />
      <StudentsTable items={items} classes={classes} />

      <Pagination
        page={page}
        totalPages={totalPages}
        searchParams={{
          keyword,
          classId: classIdRaw,
          status,
        }}
      />
    </main>
  );
}