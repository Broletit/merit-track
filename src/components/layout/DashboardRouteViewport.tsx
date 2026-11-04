"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export default function DashboardRouteViewport() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(".dashboard-shell");
    if (!shell) return;

    const isAdminActivityDetail =
      /^\/dashboard\/admin\/activities\/[^/]+$/.test(pathname) || pathname.startsWith("/a/");
    if (!isAdminActivityDetail) return;

    const previous = {
      position: shell.style.position,
      inset: shell.style.inset,
      width: shell.style.width,
      height: shell.style.height,
      minHeight: shell.style.minHeight,
    };
    shell.classList.add("activity-detail-dashboard-shell");
    shell.style.position = "fixed";
    shell.style.inset = "0";
    shell.style.width = "auto";
    shell.style.height = "auto";
    shell.style.minHeight = "0";

    return () => {
      shell.classList.remove("activity-detail-dashboard-shell");
      shell.style.position = previous.position;
      shell.style.inset = previous.inset;
      shell.style.width = previous.width;
      shell.style.height = previous.height;
      shell.style.minHeight = previous.minHeight;
    };
  }, [pathname]);

  return null;
}
