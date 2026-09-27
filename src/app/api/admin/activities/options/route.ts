import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function GET() {
  await requireAdmin();
  const db = getDb();

  const items = db.prepare(`
    SELECT id, title, conduct_score, status
    FROM activities
    ORDER BY datetime(created_at) DESC, id DESC
  `).all();

  return NextResponse.json({ items });
}