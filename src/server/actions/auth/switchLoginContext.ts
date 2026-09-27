"use server";

import { getSessionUser } from "@/server/auth/getSessionUser";
import { updateSessionLoginContext } from "@/server/auth/session";
import {
  canUseLoginContext,
  getDefaultRouteByRoleContext,
  normalizeLoginRoleContext,
} from "@/server/auth/role-context";

export async function switchLoginContext(formData: FormData) {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      message: "Bạn chưa đăng nhập.",
      redirectTo: "/login",
    };
  }

  const nextContext = normalizeLoginRoleContext(formData.get("loginContext"));

  if (!canUseLoginContext(user.role, nextContext)) {
    return {
      ok: false,
      message: "Tài khoản không có quyền chuyển sang giao diện này.",
      redirectTo: null,
    };
  }

  const updatedSession = await updateSessionLoginContext(nextContext);

  if (!updatedSession || updatedSession.loginContext !== nextContext) {
    return {
      ok: false,
      message: "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.",
      redirectTo: "/login",
    };
  }

  return {
    ok: true,
    message: "Đã chuyển giao diện.",
    redirectTo: getDefaultRouteByRoleContext(nextContext),
  };
}
