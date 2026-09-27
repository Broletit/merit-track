import { NextResponse } from "next/server";
import { getDb } from "@/server/db/sqlite";
import { requireAdmin } from "@/server/auth/guards";

export async function GET() {
  await requireAdmin();
  const db = getDb();

  const items = db.prepare(`
    SELECT
      c.id,
      c.code,
      c.name,
      c.faculty,
      c.intake_year,
      c.is_active,
      COUNT(cm.id) AS member_count
    FROM classes c
    LEFT JOIN class_members cm ON cm.class_id = c.id
    GROUP BY c.id
    ORDER BY c.code ASC
  `).all();

  return NextResponse.json({ items });
}