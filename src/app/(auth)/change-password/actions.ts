"use server";

import { redirect } from "next/navigation";
import { changeCurrentUserPassword } from "@/server/auth/auth";
import { getSessionUser } from "@/server/auth/getSessionUser";

export type ChangePasswordState = {
  ok: boolean;
  error: string;
};

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, error: "Vui lòng nhập đầy đủ thông tin." };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Mật khẩu xác nhận không khớp." };
  }

  const result = await changeCurrentUserPassword({
    currentPassword,
    newPassword,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const user = await getSessionUser();

  if (user?.role === "admin") {
    redirect("/dashboard/admin");
  }

  redirect("/dashboard/student");
}