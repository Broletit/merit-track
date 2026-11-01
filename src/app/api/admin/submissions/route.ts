import { cohortClause } from "@/server/cohorts/sql";
import { NextResponse } from "next/server";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function GET(req:Request) {
  await requireAdminContext();
  const db = getDatabase();

  const rows = (await db.rows(`
    SELECT
      s.id,
      u.full_name as student_name,
      u.mssv,
      u.cohort,
      e.title as event_title,
      s.status,
      s.updated_at
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    JOIN events e ON e.id = s.event_id
    WHERE ${cohortClause(new URL(req.url).searchParams.get("cohort"),"u.cohort")}
    ORDER BY CAST(s.updated_at AS DATETIME(3)) DESC
  `, []));

  return NextResponse.json({
    items: rows,
  });
}