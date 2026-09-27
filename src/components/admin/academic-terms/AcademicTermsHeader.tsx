"use client";

import { CalendarDays } from "lucide-react";

export default function AcademicTermsHeader() {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <CalendarDays size={22} />
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Năm học / Học kỳ</h1>
        </div>
      </div>
    </section>
  );
}
