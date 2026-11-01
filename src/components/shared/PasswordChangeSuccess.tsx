"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

export function returnToLogin() {
  window.location.replace("/login");
}

export default function PasswordChangeSuccess() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const timer = window.setTimeout(returnToLogin, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  return <dialog ref={dialog} aria-labelledby="password-success-title" onCancel={event => {event.preventDefault();returnToLogin();}}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect=event.currentTarget.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)returnToLogin();
    }}
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm">
    <CheckCircle2 size={44} aria-hidden="true" className="mx-auto mb-4 text-emerald-600"/>
    <h2 id="password-success-title" className="text-lg font-bold text-emerald-800">Đổi mật khẩu thành công</h2>
  </dialog>;
}
