"use client";
import PasswordChangeSuccess from "@/components/shared/PasswordChangeSuccess";
import RequiredMark from "@/components/common/RequiredMark";


import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { changePasswordAction, type ChangePasswordState } from "./actions";
import { appUi } from "@/lib/ui/appUi";
import ActionFeedback from "@/components/shared/ActionFeedback";

const initialState: ChangePasswordState = {
  ok: false,
  error: "",
};

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  if (state.ok) return <PasswordChangeSuccess />;

  return (
    <form action={formAction} className="space-y-4">
      <ActionFeedback pending={pending} message={state.error} ok={false} />
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-900">
          <KeyRound size={20} />
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900">Đổi mật khẩu</div>
          <div className="text-sm text-slate-500">Cập nhật mật khẩu tài khoản của bạn</div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-600">
          Mật khẩu hiện tại
        <RequiredMark required={true}/></label>
        <input
          type="password"
          name="currentPassword" required
          className={appUi.input}
          placeholder="Nhập mật khẩu hiện tại..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-600">
          Mật khẩu mới
        <RequiredMark required={true}/></label>
        <input
          type="password"
          name="newPassword" required minLength={8} autoComplete="new-password"
          className={appUi.input}
          placeholder="Nhập mật khẩu mới..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-600">
          Xác nhận mật khẩu mới
        <RequiredMark required={true}/></label>
        <input
          type="password"
          name="confirmPassword" required
          className={appUi.input}
          placeholder="Nhập lại mật khẩu mới..."
        />
      </div>

      <button type="submit" disabled={pending} className={appUi.button}>
        {pending ? "Đang cập nhật..." : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}
