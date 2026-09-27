"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications/markNotificationRead";

export function NotificationLink({ id, href, children }: {
  id: number;
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        await markNotificationRead(id);
        router.push(href);
      })}
      className="shrink-0 text-left text-sm font-semibold text-blue-700 transition hover:text-blue-900 disabled:opacity-60"
    >
      {pending ? "Đang mở..." : children}
    </button>
  );
}

export function MarkAllNotificationsReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const result = await markAllNotificationsRead();
        toast.success(result.message);
        router.refresh();
      })}
      className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
    >
      {pending ? "Đang cập nhật..." : "Đánh dấu đã đọc"}
    </button>
  );
}
