"use client";

import { useActionState } from "react";
import { LockKeyhole, LogIn, UserRound } from "lucide-react";
import { loginAction, type LoginActionState } from "./actions";
import ActionFeedback from "@/components/shared/ActionFeedback";

const initialState: LoginActionState = {
  ok: false,
  message: "",
};

const inputClass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          MSSV / Email
        </label>

        <div className="relative">
          <UserRound
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="mssv"
            className={inputClass}
            placeholder="Ví dụ: 22123456 hoặc email"
            autoComplete="username"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Mật khẩu
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="password"
            type="password"
            className={inputClass}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-900 px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(30,64,175,0.25)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <LogIn size={18} />
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
