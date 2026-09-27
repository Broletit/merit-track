"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/server/db/sqlite";
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
      message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
    };
  }

  const db = getDb();

  const user = db
    .prepare(
      `
      SELECT id, mssv, full_name, email, password_hash, role, is_active
      FROM users
      WHERE mssv = ?
         OR email = ?
      LIMIT 1
      `
    )
    .get(mssv, mssv) as DbUser | undefined;

  if (!user) {
    return {
      ok: false,
      message: "Tài khoản không tồn tại.",
    };
  }

  if (!user.is_active) {
    return {
      ok: false,
      message: "Tài khoản đã bị khóa.",
    };
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    return {
      ok: false,
      message: "Sai mật khẩu.",
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