"use client";

import Link from "next/link";
import { Bell, Menu, LogOut, KeyRound, UserRound, Shuffle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { logoutAction } from "@/app/(auth)/logout/actions";
import { switchLoginContext } from "@/server/actions/auth/switchLoginContext";
import {
  getAvailableLoginContexts,
  getUiLabelByLoginContext,
  type LoginRoleContext,
} from "@/server/auth/role-context";
import ActionFeedback from "@/components/shared/ActionFeedback";

function getProfileHref(loginContext: string) {
  if (loginContext === "class_officer") return "/dashboard/class-officer/profile";
  if (loginContext === "faculty_officer") return "/dashboard/faculty-officer/profile";
  return "/dashboard/student/profile";
}

function getNotificationHref(loginContext: string) {
  if (loginContext === "admin") return "/dashboard/admin/notifications";
  if (loginContext === "class_officer") return "/dashboard/class-officer/notifications";
  if (loginContext === "faculty_officer") return "/dashboard/faculty-officer/notifications";
  return "/dashboard/student/notifications";
}

export default function Topbar({
  fullName,
  role,
  loginContext,
  roleLabel,
}: {
  fullName: string;
  role: string;
  loginContext: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const contexts = getAvailableLoginContexts(role);
  const canSwitch = contexts.length > 1;

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  function handleSwitch(nextContext: LoginRoleContext) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("loginContext", nextContext);
        const result = await switchLoginContext(formData);
        if (!result.ok) {
          if (result.redirectTo) {
            window.location.assign(result.redirectTo);
            return;
          }
          setError(result.message || "Không thể chuyển giao diện.");
          return;
        }
        if (result.redirectTo) {
          setOpen(false);
          window.location.assign(result.redirectTo);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Không thể chuyển giao diện.");
      }
    });
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-white px-6 py-2.5 shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
      <ActionFeedback pending={pending} message={error} ok={false} />
      <p className="min-w-0 truncate text-sm text-slate-500">Xin chào, <span className="font-semibold text-slate-800">{fullName}</span>!</p>
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <Link
            href={getNotificationHref(loginContext)}
            aria-label="Mở thông báo"
            className="rounded-xl bg-slate-50 p-2.5 text-slate-600 transition hover:bg-amber-100 hover:text-amber-800"
          >
            <Bell size={18} />
        </Link>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
          {roleLabel}
        </span>

        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.10)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white">
            {fullName?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="hidden text-sm font-medium text-slate-700 sm:block">
            {fullName}
          </div>

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
            aria-label="Mở menu tài khoản"
          >
            <Menu size={18} />
          </button>
        </div>

        {open ? (
          <div className="absolute right-0 top-16 w-64 overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.15)] ring-1 ring-slate-100">
            <div className="flex flex-col py-2">
              {role !== "admin" ? (
                <Link
                  href={getProfileHref(loginContext)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <UserRound size={16} />
                  <span>Thông tin cá nhân</span>
                </Link>
              ) : null}

              {canSwitch ? (
                <div className="border-y border-slate-100 py-2">
                  <div className="flex items-center gap-2 px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <Shuffle size={14} />
                    Chuyển giao diện
                  </div>

                  {contexts.map((context) => (
                    <button
                      key={context}
                      type="button"
                      disabled={pending || context === loginContext}
                      onClick={() => handleSwitch(context)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:bg-blue-50 disabled:text-blue-700"
                    >
                      <span>{getUiLabelByLoginContext(context)}</span>
                      {context === loginContext ? (
                        <span className="text-xs font-semibold">Đang dùng</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}

              <Link
                href="/change-password"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <KeyRound size={16} />
                <span>Đổi mật khẩu</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={pending}
                className="flex items-center gap-2 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                <LogOut size={16} />
                <span>{pending ? "Đang đăng xuất..." : "Đăng xuất"}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
