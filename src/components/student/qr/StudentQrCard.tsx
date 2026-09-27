"use client";

import { useEffect, useState } from "react";
import { QrCode, X } from "lucide-react";
import QRCode from "react-qr-code";

export default function StudentQrCard({ fullName, mssv, payload }: {
  fullName: string;
  mssv: string;
  payload: string;
}) {
  const [open, setOpen] = useState(false);
  const [activePayload, setActivePayload] = useState(payload);

  useEffect(() => {
    if (!open) return;

    const refreshPayload = async () => {
      const response = await fetch("/api/student/qr", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { payload: string };
      setActivePayload(data.payload);
    };

    void refreshPayload();
    const refreshTimer = window.setInterval(() => void refreshPayload(), 45_000);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.clearInterval(refreshTimer);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
      >
        <QrCode size={18} />
        Mở QR điểm danh
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Mã QR điểm danh"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Mã QR điểm danh</h2>
                <p className="mt-1 text-sm text-slate-500">{fullName} · {mssv}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng mã QR"
                className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <QRCode
                value={activePayload}
                size={280}
                className="h-auto w-full max-w-[280px]"
              />
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">
              Mã tự làm mới định kỳ. Hãy mở trực tiếp khi cán bộ quét điểm danh.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
