"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { usePathname } from "next/navigation";
import { useState } from "react";

import SidebarGroup from "./SidebarGroup";

import { getSidebarGroups } from "./getSidebarItems";
import { getDefaultRouteByRoleContext } from "@/server/auth/role-context";

export default function Sidebar({
  role,
}: {
  role: string;
}) {
  const pathname = usePathname();

  const groups = getSidebarGroups(role);

  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={[
        "hidden h-screen shrink-0 overflow-y-auto bg-blue-900 text-white transition-all duration-300 lg:block",
        collapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-blue-900 px-2 py-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <Link
              href={getDefaultRouteByRoleContext(role as never)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-white/10"
              title="Khoa Công nghệ Điện tử"
            >
              <Image
                src="/Logo.png"
                alt="Logo Khoa Công nghệ Điện tử"
                width={929}
                height={959}
                className="h-10 w-10 object-contain"
                priority
              />
            </Link>

            <button
              type="button"
              data-no-loading
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-blue-100 transition hover:bg-white/10 hover:text-white"
              aria-label="Mở rộng sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href={getDefaultRouteByRoleContext(role as never)}
              className="flex min-w-0 flex-1 items-center rounded-2xl px-2 py-2 transition hover:bg-white/10"
            >
              <Image
                src="/fullLogo.png"
                alt="Khoa Công nghệ Điện tử"
                width={4111}
                height={1019}
                className="h-11 w-full object-contain object-left"
                priority
              />
            </Link>

            <button
              type="button"
              data-no-loading
              onClick={() => setCollapsed(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-blue-100 transition hover:bg-white/10 hover:text-white"
              aria-label="Thu gọn sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="space-y-3 px-3 pb-5">
        {groups.map((group) => (
          <SidebarGroup
            key={group.label}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  );
}
