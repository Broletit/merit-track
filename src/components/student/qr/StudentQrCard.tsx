"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, SquareX } from "lucide-react";
import QRCode from "react-qr-code";
import { createPortal } from "react-dom";
import { preserveDialogScroll } from "@/lib/ui/dialogScroll";

export default function StudentQrCard({ fullName, mssv, payload }: {
  fullName: string;
  mssv: string;
  payload: string;
}) {
  const [open, setOpen] = useState(false);
  const [activePayload, setActivePayload] = useState(payload);
  const dialogRef = useRef<HTMLDialogElement>(null);

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
    preserveDialogScroll(() => {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      preserveDialogScroll(() => dialogRef.current?.close());
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

      {open && typeof document !== "undefined" ? createPortal(
        <dialog
          ref={dialogRef}
          aria-label="Mã QR điểm danh"
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border-0 bg-white p-6 shadow-2xl backdrop:bg-slate-900/50"
        >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Mã QR điểm danh</h2>
                <p className="mt-1 text-sm text-slate-500">{fullName} · {mssv}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng mã QR"
                className="inline-flex h-10! w-10! min-h-10! min-w-10! shrink-0 items-center justify-center rounded-md! border-0! bg-transparent! p-0! text-red-500! shadow-none! transition-colors hover:bg-red-50! hover:text-red-700! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"
              >
                <SquareX size={24} strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-6 flex justify-center rounded-none bg-white p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
              <QRCode
                value={activePayload}
                size={280}
                className="h-auto w-full max-w-[280px]"
              />
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">
              Mã tự làm mới định kỳ. Hãy mở trực tiếp khi cán bộ quét điểm danh.
            </p>
        </dialog>,
        document.body,
      ) : null}
    </>
  );
}
