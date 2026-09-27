"use client";

import { ChevronDown, Download } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { exportOfficerAchievementReport } from "@/server/actions/admin/reports/exportOfficerAchievementReport";
import ActionFeedback from "@/components/shared/ActionFeedback";

export default function OfficerAchievementExportButton({
  termId,
  eventId,
  top,
}: {
  termId: number;
  eventId: number;
  top: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState({ message: "", ok: false });

  function download(exportType: "passed" | "all") {
    setOpen(false);

    startTransition(async () => {
      try {
      const formData = new FormData();

      formData.set("termId", String(termId));
      if (eventId > 0) formData.set("eventId", String(eventId));
      formData.set("top", String(top));
      formData.set("exportType", exportType);

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
      setFeedback({ message: "Xuất báo cáo cán bộ thành công.", ok: true });
      } catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : "Xuất báo cáo thất bại.", ok: false });
      }
    });
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <ActionFeedback pending={pending} message={feedback.message} ok={feedback.ok} />
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
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
            Cán bộ đoàn tiêu biểu
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
