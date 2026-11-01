"use server";

import { changeCurrentUserPassword } from "@/server/auth/auth";

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

  return { ok: true, error: "" };
}