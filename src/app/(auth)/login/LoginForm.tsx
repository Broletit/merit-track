"use client";
import Link from "next/link";
import RequiredMark from "@/components/common/RequiredMark";


import styles from "./login.module.css";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { loginAction, type LoginActionState } from "./actions";
import ActionFeedback from "@/components/shared/ActionFeedback";

const initialState: LoginActionState = {
  ok: false,
  message: "",
};

const inputClass =
  "h-[3.25rem] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <ActionFeedback pending={pending} message={state.message} ok={state.ok} />
      <div>
        <label htmlFor="login-mssv" className="mb-2 block text-sm font-semibold text-slate-700">
          MSSV
        <RequiredMark required={true}/></label>

        <div className="group relative">
          <UserRound
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-700"
          />
          <input
            id="login-mssv" name="mssv" required
            className={inputClass}
            placeholder="Nhập MSSV"
            autoComplete="username"
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">
          Mật khẩu
        <RequiredMark required={true}/></label>

        <div className="group relative">
          <LockKeyhole
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-700"
          />
          <input
            id="login-password" name="password" required
            type={showPassword ? "text" : "password"}
            className={`${inputClass} pr-12`}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>

      <div className="text-right"><Link href="/forgot-password" className="text-sm font-semibold text-blue-800 hover:underline">Quên mật khẩu?</Link></div>
      <button
        type="submit"
        disabled={pending}
        className={styles.submit}
      >
        {pending ? <LoaderCircle size={18} className="motion-safe:animate-spin" /> : <LogIn size={18} />}
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
