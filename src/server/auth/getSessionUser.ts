import { finalizeExpiredSubmissions } from "@/server/submissions/finalizeExpiredSubmissions";
import { getDatabase } from "@/server/db/mysql";
import { getSession } from "./session";
import { canUseLoginContext } from "./role-context";

type DbUserRow = {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: number;
  must_change_pw: number;
};

export async function getSessionUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const db = getDatabase();
  await finalizeExpiredSubmissions(db);

  const user = (await db.first(`
      SELECT
        id,
        mssv,
        full_name,
        email,
        role,
        is_active,
        must_change_pw
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [session.userId])) as DbUserRow | undefined;

  if (!user || !user.is_active || !canUseLoginContext(user.role, session.loginContext)) {
    return null;
  }

  return {
    id: Number(user.id),
    mssv: String(user.mssv ?? ""),
    full_name: String(user.full_name ?? ""),
    email: user.email ? String(user.email) : null,
    role: String(user.role ?? ""),
    is_active: Number(user.is_active ?? 0),
    must_change_pw: Number(user.must_change_pw ?? 0),
    loginContext: String(session.loginContext ?? "student"),
  };
}
