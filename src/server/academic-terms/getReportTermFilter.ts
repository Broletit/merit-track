import { getDatabase } from "@/server/db/mysql";

export async function getReportTermFilter(termId?: string) {
  const db = getDatabase();

  const terms = (await db.rows(`
      SELECT
        id,
        name,
        school_year,
        is_active
      FROM academic_terms
      ORDER BY start_date DESC
      `, [])) as Array<{
    id: number;
    name: string;
    school_year: string;
    is_active: number;
  }>;

  const selected =
    terms.find(
      (item) => String(item.id) === String(termId)
    ) || terms.find((item) => item.is_active === 1);

  if (!selected) {
    throw new Error("Chưa có học kỳ.");
  }

  return {
    terms,
    selected,
  };
}