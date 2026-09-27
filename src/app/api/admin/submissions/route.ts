import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function GET() {
  await requireAdmin();
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      s.id,
      u.full_name as student_name,
      u.mssv,
      e.title as event_title,
      s.status,
      s.updated_at
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    JOIN events e ON e.id = s.event_id
    ORDER BY datetime(s.updated_at) DESC
  `).all();

  return NextResponse.json({
    items: rows,
  });
}