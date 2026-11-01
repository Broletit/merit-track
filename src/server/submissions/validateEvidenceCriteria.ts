import type { Database } from "@/server/db/mysql";

export async function validateEvidenceCriteria(db: Database, eventId: number, codes: string[]) {
  if (codes.length > 200 || new Set(codes).size !== codes.length) throw new Error("Danh sách tiêu chí không hợp lệ.");
  const valid = new Set(((await db.rows("SELECT code FROM event_criteria_items WHERE event_id=?", [eventId])) as {code:string}[]).map(row => row.code));
  if (codes.some(code => !valid.has(code))) throw new Error("Tiêu chí không thuộc đợt xét của hồ sơ này.");
}
