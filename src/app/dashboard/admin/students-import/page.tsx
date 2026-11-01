import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";
import StudentsImportHeader from "@/components/admin/students-import/StudentsImportHeader";
import StudentsImportForm from "@/components/admin/students-import/StudentsImportForm";
import type { ImportClassOption } from "@/components/admin/students-import/types";

type ClassRow = {
  faculty: string | null;
  id: number;
  code: string;
  name: string; cohort:number|null;
};

export default async function AdminStudentsImportPage() {
  await requireAdminContext();
  const db = getDatabase();

  const classRows = (await db.rows(`
      SELECT id, code, name, cohort, faculty
      FROM classes
      ORDER BY name ASC, id ASC
      `, [])) as ClassRow[];

  const classes: ImportClassOption[] = classRows.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
    cohort: item.cohort,
    faculty: item.faculty,
  }));

  return (
    <main className="space-y-6">
      <StudentsImportHeader />
      <StudentsImportForm classes={classes} />
    </main>
  );
}