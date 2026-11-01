import { getDatabase } from "@/server/db/mysql";
import { verifyPasswordSync, hashPasswordSync } from "./password";
import { createSession } from "./session";
import { getSessionUser } from "./getSessionUser";
import { getDefaultLoginContextAfterLogin } from "./role-context";

export async function loginWithPassword(params: {
  mssv: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
}) {
  const { mssv, password } = params;
  const db = getDatabase();

  const user = (await db.first(`
      SELECT *
      FROM users
      WHERE mssv = ?
      LIMIT 1
      `, [mssv.trim()])) as
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
  const db = getDatabase();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { ok: false as const, error: "Bạn chưa đăng nhập." };
  }

  const user = (await db.first(`
      SELECT id, password_hash
      FROM users
      WHERE id = ?
      LIMIT 1
      `, [sessionUser.id])) as { id: number; password_hash: string } | undefined;

  if (!user) {
    return { ok: false as const, error: "Không tìm thấy tài khoản." };
  }

  const matched = verifyPasswordSync(currentPassword, user.password_hash);
  if (!matched) {
    return { ok: false as const, error: "Mật khẩu hiện tại không đúng." };
  }

  if (newPassword.length < 8 || Buffer.byteLength(newPassword,"utf8") > 72) {
    return { ok: false as const, error: "Mật khẩu mới cần ít nhất 8 ký tự và tối đa 72 byte." };
  }

  const newHash = hashPasswordSync(newPassword);

  (await db.execute(`
    UPDATE users
    SET password_hash = ?,
        must_change_pw = 0,
        updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    `, [newHash, sessionUser.id]));

  (await db.execute("UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND revoked_at IS NULL", [sessionUser.id]));
  // Keep the revoked cookie unchanged until navigation so the success dialog can render.


  return { ok: true as const };
}
