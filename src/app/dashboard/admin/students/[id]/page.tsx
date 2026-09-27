import { notFound } from "next/navigation";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import StudentDetailHeader from "@/components/admin/students/StudentDetailHeader";
import StudentInfoCard from "@/components/admin/students/StudentInfoCard";
import StudentManagementCard from "@/components/admin/students/StudentManagementCard";
import type { AdminClassOption, StudentDetailSummary } from "@/components/admin/students/types";

type StudentRow = {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  class_id: number;
  class_code: string;
  class_name: string;
  role: string;
};

type ClassRow = {
  id: number;
  code: string;
  name: string;
};

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminContext();

  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isFinite(studentId)) {
    notFound();
  }

  const db = getDb();

  const student = db
    .prepare(
      `
      WITH latest_membership AS (
        SELECT cm.user_id, MAX(cm.rowid) AS latest_rowid
        FROM class_members cm
        GROUP BY cm.user_id
      )
      SELECT
        u.id,
        u.mssv,
        u.full_name,
        u.email,
        u.role,
        c.id AS class_id,
        c.code AS class_code,
        c.name AS class_name
      FROM users u
      LEFT JOIN latest_membership lm ON lm.user_id = u.id
      LEFT JOIN class_members cm ON cm.rowid = lm.latest_rowid
      LEFT JOIN classes c ON c.id = cm.class_id
      WHERE u.id = ?
      LIMIT 1
      `
    )
    .get(studentId) as StudentRow | undefined;

  if (!student || student.role !== "student") {
    notFound();
  }

  const classes = db
    .prepare(
      `
      SELECT id, code, name
      FROM classes
      ORDER BY name ASC, id ASC
      `
    )
    .all() as ClassRow[];

  const classOptions: AdminClassOption[] = classes.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
  }));

  const summary: StudentDetailSummary = {
    id: Number(student.id),
    mssv: String(student.mssv ?? ""),
    full_name: String(student.full_name ?? ""),
    email: student.email ? String(student.email) : null,
    class_id: Number(student.class_id ?? 0),
    class_code: String(student.class_code ?? ""),
    class_name: String(student.class_name ?? ""),
  };

  return (
    <main className="space-y-6">
      <StudentDetailHeader student={summary} />
      <StudentInfoCard student={summary} />
      <StudentManagementCard student={summary} classes={classOptions} />
    </main>
  );
}