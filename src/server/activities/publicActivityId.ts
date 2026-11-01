import { randomBytes } from "node:crypto";
import type { Database } from "@/server/db/mysql";

export async function getActivityPublicId(db: Database, id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!(await db.first("SELECT 1 FROM activities WHERE id=?", [id]))) return null;
  (await db.execute("INSERT IGNORE INTO activity_public_ids(activity_id,token) VALUES(?,?)", [id, randomBytes(16).toString("hex")]));
  return ((await db.first("SELECT token FROM activity_public_ids WHERE activity_id=?", [id])) as {token:string}).token;
}
