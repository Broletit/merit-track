import { cohortClause } from "@/server/cohorts/sql";
import { NextResponse } from "next/server";
import { getDatabase } from "@/server/db/mysql";
import { requireAdminContext } from "@/server/auth/guards";

export async function GET(req:Request) {
  await requireAdminContext();
  const db = getDatabase();

  const items = (await db.rows(`
    SELECT
      c.id,
      c.code,
      c.name,
      c.faculty,
      c.cohort,
      c.is_active,
      COUNT(cm.id) AS member_count
    FROM classes c
    LEFT JOIN class_members cm ON cm.class_id = c.id
    WHERE ${cohortClause(new URL(req.url).searchParams.get("cohort"),"c.cohort")}
    GROUP BY c.id
    ORDER BY c.code ASC
  `, []));

  return NextResponse.json({ items });
}