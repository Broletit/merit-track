import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function GET() {
  await requireAdmin();
  const db = getDb();

  const items = db.prepare(`
    SELECT
      e.id,
      e.title,
      e.status,
      e.start_at,
      e.end_at,
      COUNT(ci.id) AS criteria_count
    FROM events e
    LEFT JOIN event_criteria_items ci ON ci.event_id = e.id
    GROUP BY e.id
    ORDER BY datetime(e.created_at) DESC, e.id DESC
  `).all();

  return NextResponse.json({ items });
}