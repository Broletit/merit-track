import { getDb } from "@/server/db/sqlite";
import { verifyPasswordSync, hashPasswordSync } from "./password";
import { createSession, revokeCurrentSession } from "./session";
import { getSessionUser } from "./getSessionUser";
import { getDefaultLoginContextAfterLogin } from "./role-context";

export async function loginWithPassword(params: {
  mssv: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
}) {
  const { mssv, password } = params;
  const db = getDb();

  const user = db
    .prepare(
      `
      SELECT *
      FROM users
      WHERE mssv = ?
      LIMIT 1
      `
    )
    .get(mssv.trim()) as
    | {
        id: number;
        mssv: string;
        password_hash: string;
        is_active: number;
        must_change_pw: number;
        role: "student" | "class_officer" | "faculty_officer" | "admin";
      }
    | undefined;

  if (!user) {
    return { ok: false as const, error: "Sai tài khoản hoặc mật khẩu." };
  }

  if (!user.is_active) {
    return { ok: false as const, error: "Tài khoản đã bị vô hiệu hóa." };
  }

  const matched = verifyPasswordSync(password, user.password_hash);
  if (!matched) {
    return { ok: false as const, error: "Sai tài khoản hoặc mật khẩu." };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    loginContext: getDefaultLoginContextAfterLogin(user.role),
  });

  return {
    ok: true as const,
    user: {
      id: user.id,
      mssv: user.mssv,
      role: user.role,
      must_change_pw: user.must_change_pw,
    },
  };
}

export async function changeCurrentUserPassword(params: {
  currentPassword: string;
  newPassword: string;
}) {
  const { currentPassword, newPassword } = params;
  const db = getDb();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { ok: false as const, error: "Bạn chưa đăng nhập." };
  }

  const user = db
    .prepare(
      `
      SELECT id, password_hash
      FROM users
      WHERE id = ?
      LIMIT 1
      `
    )
    .get(sessionUser.id) as { id: number; password_hash: string } | undefined;

  if (!user) {
    return { ok: false as const, error: "Không tìm thấy tài khoản." };
  }

  const matched = verifyPasswordSync(currentPassword, user.password_hash);
  if (!matched) {
    return { ok: false as const, error: "Mật khẩu hiện tại không đúng." };
  }

  if (newPassword.trim().length < 4) {
    return { ok: false as const, error: "Mật khẩu mới phải có ít nhất 4 ký tự." };
  }

  const newHash = hashPasswordSync(newPassword.trim());

  db.prepare(
    `
    UPDATE users
    SET password_hash = ?,
        must_change_pw = 0,
        updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(newHash, sessionUser.id);

  await revokeCurrentSession();
  await createSession({
    userId: sessionUser.id,
    role: sessionUser.role,
    loginContext: sessionUser.loginContext as "student" | "class_officer" | "faculty_officer" | "admin",
  });

  return { ok: true as const };
}
