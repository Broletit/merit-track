"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDb } from "@/server/db/sqlite";

export async function setActiveAcademicTerm(termId: number) {
  await requireAdminContext();

  const db = getDb();

  const term = db
    .prepare(
      `
      SELECT id
      FROM academic_terms
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(termId) as { id: number } | undefined;

  if (!term) {
    throw new Error("Học kỳ không tồn tại.");
  }

  const tx = db.transaction(() => {
    db.prepare(`UPDATE academic_terms SET is_active = 0`).run();
    db.prepare(`UPDATE academic_terms SET is_active = 1 WHERE id = ?`).run(termId);
  });

  tx();

  revalidatePath("/dashboard/admin/academic-terms");
  revalidatePath("/dashboard/admin");

  return {
    ok: true,
    message: "Đã đặt học kỳ hiện hành.",
  };
}