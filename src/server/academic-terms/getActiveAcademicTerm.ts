import { getDatabase } from "@/server/db/mysql";

export type ActiveAcademicTerm = {
  id: number;
  academicYear: string;
  semester: string;
  name: string;
  startAt: string;
  endAt: string;
};

type Row = {
  id: number;
  academic_year: string;
  semester: string;
  name: string;
  start_at: string;
  end_at: string;
};

export async function getActiveAcademicTerm(): Promise<ActiveAcademicTerm | null> {
  const db = getDatabase();

  const row = (await db.first(`
      SELECT id, academic_year, semester, name, start_at, end_at
      FROM academic_terms
      WHERE is_active = 1
      ORDER BY id DESC
      LIMIT 1
      `, [])) as Row | undefined;

  if (!row) return null;

  return {
    id: Number(row.id),
    academicYear: String(row.academic_year),
    semester: String(row.semester),
    name: String(row.name),
    startAt: String(row.start_at),
    endAt: String(row.end_at),
  };
}