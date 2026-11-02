"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck2 } from "lucide-react";
import { appUi } from "@/lib/ui/appUi";

export default function ActivityFormHeader({ title = "Tạo hoạt động" }: { title?: string }) {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-3 sm:p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:h-12 sm:w-12">
            <CalendarCheck2 size={22} />
          </div>

          <div>
            <h1 className="whitespace-nowrap text-lg font-semibold sm:text-2xl">{title}</h1>
          </div>
        </div>

        <Link href="/dashboard/admin/activities" className={`${appUi.secondaryButton} w-full justify-center sm:w-auto`} data-back-link>
          <ArrowLeft size={16} />
          <span className="ml-2">Quay về</span>
        </Link>
      </div>
    </section>
  );
}
