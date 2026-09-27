import { getDb } from "@/server/db/sqlite";
import { getSession } from "./session";

type DbUserRow = {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: number;
};

export async function getSessionUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const db = getDb();

  const user = db
    .prepare(
      `
      SELECT
        id,
        mssv,
        full_name,
        email,
        role,
        is_active
      FROM users
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(session.userId) as DbUserRow | undefined;

  if (!user || !user.is_active) {
    return null;
  }

  return {
    id: Number(user.id),
    mssv: String(user.mssv ?? ""),
    full_name: String(user.full_name ?? ""),
    email: user.email ? String(user.email) : null,
    role: String(user.role ?? ""),
    is_active: Number(user.is_active ?? 0),
    loginContext: String(session.loginContext ?? "student"),
  };
}