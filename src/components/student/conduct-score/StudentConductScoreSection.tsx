"use client";

import { ChevronDown, ChevronUp, History } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export default function StudentConductScoreSection({ frame, history }: { frame: ReactNode; history: ReactNode }) {
  const [showHistory, setShowHistory] = useState(false);
  const historyRef=useRef<HTMLDivElement>(null);
  const historyId=useId();
  useEffect(()=>{
    if(!showHistory)return;
    historyRef.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});
  },[showHistory]);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Khung điểm rèn luyện</h2>
        <button
          type="button"
          onClick={() => setShowHistory((value) => !value)}
          aria-expanded={showHistory}
          aria-controls={historyId}
          className="inline-flex min-h-9 h-auto items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 py-2 max-w-full break-words"
        >
          <History size={16} />
          {showHistory ? "Ẩn lịch sử" : "Xem lịch sử hoạt động"}
          {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      <div className="mt-5">{frame}</div>
      {showHistory ? <div ref={historyRef} id={historyId} className="mt-6 scroll-mt-4 border-t border-slate-100 pt-6">{history}</div> : null}
    </section>
  );
}
