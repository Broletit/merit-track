"use client";

import Link from "next/link";
import { CalendarPlus, Plus } from "lucide-react";
import { appUi } from "@/lib/ui/appUi";
import type { ReactNode } from "react";

export default function ActivitiesHeader({ termSelect }: { termSelect?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <CalendarPlus size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">Quản lý hoạt động</h1>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
          {termSelect}
          <Link href="/dashboard/admin/activities/create" className={appUi.secondaryButton}>
            <Plus size={16} />
            <span className="ml-2">Tạo hoạt động</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
