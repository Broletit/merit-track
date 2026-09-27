"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { SidebarGroup as SidebarGroupType } from "./getSidebarItems";

function isActiveItem(pathname: string, href: string) {
  const roots = [
    "/dashboard/admin",
    "/dashboard/student",
    "/dashboard/class-officer",
    "/dashboard/faculty-officer",
  ];

  if (roots.includes(href)) return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarGroup({
  group,
  pathname,
  collapsed = false,
}: {
  group: SidebarGroupType;
  pathname: string;
  collapsed?: boolean;
}) {
  const hasActiveChild = useMemo(
    () => group.items.some((item) => isActiveItem(pathname, item.href)),
    [group.items, pathname]
  );

  const [open, setOpen] = useState(hasActiveChild || group.label === "Tổng quan");
  const GroupIcon = group.icon;

  if (collapsed) {
    return (
      <section className="space-y-2">
        {group.items.map((item) => {
          const active = isActiveItem(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={[
                "mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105",
                active
                  ? "bg-amber-300 text-blue-950 shadow-md shadow-amber-950/20"
                  : "text-blue-100 hover:bg-white/10 hover:text-amber-200",
              ].join(" ")}
            >
              <Icon size={18} />
            </Link>
          );
        })}
      </section>
    );
  }

  return (
    <section className="space-y-1">
      <button
        type="button"
        data-no-loading
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all duration-200",
          hasActiveChild
            ? "text-white"
            : "text-blue-100 hover:bg-white/5 hover:pl-4 hover:text-amber-200",
        ].join(" ")}
      >
        <span className="flex items-center gap-3">
          <GroupIcon size={17} />
          <span className="text-sm font-semibold">{group.label}</span>
        </span>

        <ChevronDown
          size={15}
          className={open ? "rotate-180 transition" : "transition"}
        />
      </button>

      {open ? (
        <div className="ml-3 space-y-1 border-l border-white/10 pl-3">
          {group.items.map((item) => {
            const active = isActiveItem(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ease-out",
                  active
                    ? "bg-amber-300 text-blue-950 shadow-md shadow-amber-950/15"
                    : "text-blue-100 hover:translate-x-1 hover:bg-white/10 hover:text-amber-200",
                ].join(" ")}
              >
                <Icon size={16} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
