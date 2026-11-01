"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/mysql";

export async function setActiveAcademicTerm(termId: number) {
  await requireAdminContext();

  const db = getDatabase();

  const term = (await db.first(`
      SELECT id
      FROM academic_terms
      WHERE id = ?
      LIMIT 1
      `, [termId])) as { id: number } | undefined;

  if (!term) {
    throw new Error("Học kỳ không tồn tại.");
  }

  const tx = (async () => (await db.withTransaction(async () => {
    (await db.execute(`UPDATE academic_terms SET is_active = 0`, []));
    (await db.execute(`UPDATE academic_terms SET is_active = 1 WHERE id = ?`, [termId]));
  })));

  (await tx());

  revalidatePath("/dashboard/admin/academic-terms");
  revalidatePath("/dashboard/admin");

  return {
    ok: true,
    message: "Đã đặt học kỳ hiện hành.",
  };
}