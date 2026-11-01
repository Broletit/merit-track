"use client";

import { ChevronDown, Download } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { exportOfficerAchievementReport } from "@/server/actions/admin/reports/exportOfficerAchievementReport";

export default function OfficerAchievementExportButton({
  termId,
  eventId,
  cohort,
}: {
  termId: number;
  eventId: number;
  cohort?:string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function download(exportType: "passed" | "all") {
    setOpen(false);

    startTransition(async () => {
      try {
      const formData = new FormData();

      formData.set("termId", String(termId));
      if (eventId > 0) formData.set("eventId", String(eventId));
      formData.set("exportType", exportType);
      if(cohort) formData.set("cohort",cohort);

      const result = await exportOfficerAchievementReport(formData);

      const blob = new Blob([result.content], {
        type: "text/csv;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = result.fileName;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      } catch {}
    });
  }

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
      >
        <Download size={16} />
        Xuất danh sách
        <ChevronDown size={15} />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-slate-100">
          <button
            type="button"
            onClick={() => download("passed")}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cán bộ tiêu biểu
          </button>

          <button
            type="button"
            onClick={() => download("all")}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Bảng xếp hạng hồ sơ cán bộ
          </button>
        </div>
      ) : null}
    </div>
  );
}
