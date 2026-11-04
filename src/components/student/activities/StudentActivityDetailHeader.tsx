"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck2 } from "lucide-react";
import { appUi } from "@/lib/ui/appUi";
import { formatDateTimeVN } from "@/lib/utils/formatDateTimeVN";
import type { StudentActivityDetail } from "./types";

export default function StudentActivityDetailHeader({
  item,
}: {
  item: StudentActivityDetail;
}) {
  return (
    <section className="rounded-2xl bg-linear-to-r from-blue-900 to-blue-800 p-6 text-white shadow-[0_14px_36px_rgba(30,64,175,0.24)] shadow-slate-200/60">
      <div className="flex min-w-0 flex-nowrap items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <CalendarCheck2 size={22} />
          </div>

          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold">{item.title}</h1>
            <p className="text-sm text-blue-100/80">
              {formatDateTimeVN(item.startAt)} → {formatDateTimeVN(item.endAt)}
            </p>
          </div>
        </div>

        <Link href="/dashboard/student/activities" className={`${appUi.secondaryButton} min-h-11 shrink-0 whitespace-nowrap px-3 sm:px-4`} data-back-link>
          <ArrowLeft size={16} className="shrink-0" />
          <span className="ml-2 whitespace-nowrap">Quay về</span>
        </Link>
      </div>
    </section>
  );
}
