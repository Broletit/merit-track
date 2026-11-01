"use server";

import { redirect } from "next/navigation";
import { getDatabase } from "@/server/db/mysql";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import {
  getDefaultLoginContextAfterLogin,
  getDefaultRouteByRoleContext,
} from "@/server/auth/role-context";

export type LoginActionState = {
  ok: boolean;
  message: string;
};

type DbUser = {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  password_hash: string;
  role: string;
  is_active: number;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const mssv = String(formData.get("mssv") || "").trim();
  const password = String(formData.get("password") || "");

  if (!mssv || !password) {
    return {
      ok: false,
      message: "Vui lòng nhập đầy đủ MSSV và mật khẩu.",
    };
  }

  if (mssv.length > 254 || Buffer.byteLength(password,"utf8") > 72) return {ok:false,message:"Tài khoản hoặc mật khẩu không hợp lệ."};
  const db = getDatabase();

  const user = (await db.first(`
      SELECT id, mssv, full_name, email, password_hash, role, is_active
      FROM users
      WHERE mssv = ?
      LIMIT 1
      `, [mssv])) as DbUser | undefined;

  if (!user) {
    return {
      ok: false,
      message: "Tài khoản hoặc mật khẩu không đúng.",
    };
  }

  if (!user.is_active) {
    return {
      ok: false,
      message: "Tài khoản hoặc mật khẩu không đúng.",
    };
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    return {
      ok: false,
      message: "Tài khoản hoặc mật khẩu không đúng.",
    };
  }

  const loginContext = getDefaultLoginContextAfterLogin(user.role);

  await createSession({
    userId: Number(user.id),
    role: String(user.role),
    loginContext,
  });

  redirect(getDefaultRouteByRoleContext(loginContext));
}