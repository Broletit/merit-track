"use client";

import { Award } from "lucide-react";
import type { ReactNode } from "react";

export default function StudentConductScoreHeader({ termSelect }: { termSelect?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <Award size={22} />
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Điểm rèn luyện</h1>
        </div>
        </div>
        {termSelect}
      </div>
    </section>
  );
}
