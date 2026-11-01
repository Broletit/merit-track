"use client";

import { CalendarCheck2 } from "lucide-react";
import type { ReactNode } from "react";

export default function StudentActivitiesHeader({ termSelect }: { termSelect?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-3 sm:p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:h-12 sm:w-12">
          <CalendarCheck2 size={22} />
        </div>

        <div>
          <h1 className="whitespace-nowrap text-lg font-semibold sm:text-2xl">Hoạt động</h1>
        </div>
        </div>
        <div className="min-w-0 max-w-[50%]">{termSelect}</div>
      </div>
    </section>
  );
}
