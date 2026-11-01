import { NextResponse } from "next/server";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function GET() {
  await requireAdminContext();
  const db = getDatabase();

  const items = (await db.rows(`
    SELECT id, title, conduct_score, status
    FROM activities
    ORDER BY CAST(created_at AS DATETIME(3)) DESC, id DESC
  `, []));

  return NextResponse.json({ items });
}