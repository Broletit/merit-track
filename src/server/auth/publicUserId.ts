import { randomBytes } from "node:crypto";
import type { Database } from "@/server/db/mysql";

export async function getUserPublicId(db: Database, id: number): Promise<string | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!(await db.first("SELECT 1 FROM users WHERE id=? AND role!='admin'", [id]))) return null;
  (await db.execute("INSERT IGNORE INTO user_public_ids(user_id,token) VALUES(?,?)", [id, randomBytes(16).toString("hex")]));
  return ((await db.first("SELECT token FROM user_public_ids WHERE user_id=?", [id])) as {token:string}).token;
}

export async function resolveUserPublicId(db: Database, token: string): Promise<number | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const row = (await db.first("SELECT user_id FROM user_public_ids WHERE token=?", [token])) as {user_id:number}|undefined;
  return row?.user_id ?? null;
}
