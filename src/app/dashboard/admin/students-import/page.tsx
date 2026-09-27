import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";
import StudentsImportHeader from "@/components/admin/students-import/StudentsImportHeader";
import StudentsImportForm from "@/components/admin/students-import/StudentsImportForm";
import type { ImportClassOption } from "@/components/admin/students-import/types";

type ClassRow = {
  id: number;
  code: string;
  name: string;
};

export default async function AdminStudentsImportPage() {
  await requireAdminContext();
  const db = getDb();

  const classRows = db
    .prepare(
      `
      SELECT id, code, name
      FROM classes
      ORDER BY name ASC, id ASC
      `
    )
    .all() as ClassRow[];

  const classes: ImportClassOption[] = classRows.map((item) => ({
    id: Number(item.id),
    code: String(item.code ?? ""),
    name: String(item.name ?? ""),
  }));

  return (
    <main className="space-y-6">
      <StudentsImportHeader />
      <StudentsImportForm classes={classes} />
    </main>
  );
}