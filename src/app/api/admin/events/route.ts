import { eventCohortClause } from "@/server/cohorts/sql";
import { NextResponse } from "next/server";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function GET(req:Request) {
  await requireAdminContext();
  const db = getDatabase();

  const items = (await db.rows(`
    SELECT
      e.id,
      e.title,
      e.status,
      e.start_at,
      e.end_at,
      COUNT(ci.id) AS criteria_count
    FROM events e
    LEFT JOIN event_criteria_items ci ON ci.event_id = e.id
    WHERE ${eventCohortClause(new URL(req.url).searchParams.get("cohort"))}
    GROUP BY e.id
    ORDER BY CAST(e.created_at AS DATETIME(3)) DESC, e.id DESC
  `, []));

  return NextResponse.json({ items });
}