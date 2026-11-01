import { cohortClause } from "@/server/cohorts/sql";
import { NextResponse } from "next/server";
import { getDatabase } from "@/server/db/mysql";
import { requireAdminContext } from "@/server/auth/guards";

export async function GET(req:Request) {
  await requireAdminContext();
  const db = getDatabase();

  const items = (await db.rows(`
    SELECT
      u.id,
      u.mssv,
      u.cohort,
      u.full_name,
      u.email,
      u.role,
      u.is_active,
      u.must_change_pw,
      u.created_at
    FROM users u
    WHERE ${cohortClause(new URL(req.url).searchParams.get("cohort"),"u.cohort")}
    ORDER BY u.role DESC, u.mssv ASC
  `, []));

  return NextResponse.json({ items });
}