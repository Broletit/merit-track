"use client";

import { useEffect, useRef, useState } from "react";

const MINIMUM_VISIBLE_MS = 350;
const INTERACTION_DURATION_MS = 650;
const MAXIMUM_VISIBLE_MS = 15_000;

export default function GlobalInteractionLoading() {
  const [visible, setVisible] = useState(false);
  const startedAt = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearTimers() {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    }

    function start(duration?: number) {
      clearTimers();
      startedAt.current = Date.now();
      setVisible(true);

      const requestedDuration = duration ?? MAXIMUM_VISIBLE_MS;
      safetyTimer.current = setTimeout(() => setVisible(false), requestedDuration);
    }

    function stop() {
      if (!startedAt.current) return;
      const remaining = Math.max(0, MINIMUM_VISIBLE_MS - (Date.now() - startedAt.current));
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => {
        setVisible(false);
        startedAt.current = 0;
      }, remaining);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const control = target.closest("a, button, [role='button']");
      if (!control || control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true") return;
      if (control.hasAttribute("data-no-loading")) return;

      if (control instanceof HTMLAnchorElement) {
        if (control.target === "_blank" || control.hasAttribute("download")) return;
        const destination = new URL(control.href, window.location.href);
        if (destination.origin !== window.location.origin) return;
        if (destination.href === window.location.href || destination.hash && destination.pathname === window.location.pathname && destination.search === window.location.search) return;

        const currentUrl = window.location.href;
        start();
        const watcher = window.setInterval(() => {
          if (window.location.href !== currentUrl) {
            window.clearInterval(watcher);
            stop();
          }
        }, 50);
        window.setTimeout(() => window.clearInterval(watcher), MAXIMUM_VISIBLE_MS);
        return;
      }

      // Các nút chỉ mở/đóng giao diện (menu, modal, accordion...) phản hồi
      // ngay tại client nên không hiển thị thanh tải. Tác vụ bất đồng bộ dùng
      // ActionFeedback; nút submit được xử lý bởi sự kiện submit bên dưới.
    }

    function handleSubmit() {
      // Server-action forms already keep ActionFeedback visible for their
      // complete pending state; this guarantees an immediate first response.
      start(INTERACTION_DURATION_MS);
    }

    function handlePageReady() {
      stop();
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("pageshow", handlePageReady);
    window.addEventListener("popstate", handlePageReady);

    return () => {
      clearTimers();
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("pageshow", handlePageReady);
      window.removeEventListener("popstate", handlePageReady);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px] overflow-hidden bg-sky-100/90 shadow-[0_1px_6px_rgba(14,165,233,0.3)]"
      role="status"
      aria-label="Đang xử lý"
    >
      <div className="top-loading-gradient h-full w-[38%]" />
    </div>
  );
}
