import { NextResponse } from "next/server";
import { getDb } from "@/server/db/sqlite";
import { requireAdmin } from "@/server/auth/guards";

export async function GET() {
  await requireAdmin();
  const db = getDb();

  const items = db.prepare(`
    SELECT
      u.id,
      u.mssv,
      u.full_name,
      u.email,
      u.role,
      u.is_active,
      u.must_change_pw,
      u.created_at
    FROM users u
    ORDER BY u.role DESC, u.mssv ASC
  `).all();

  return NextResponse.json({ items });
}