import { getDb } from "@/server/db/sqlite";

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

export function getActiveAcademicTerm(): ActiveAcademicTerm | null {
  const db = getDb();

  const row = db
    .prepare(
      `
      SELECT id, academic_year, semester, name, start_at, end_at
      FROM academic_terms
      WHERE is_active = 1
      ORDER BY id DESC
      LIMIT 1
      `
    )
    .get() as Row | undefined;

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