"use client";
import RequiredMark from "@/components/common/RequiredMark";


import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ActivityConductForm({
  defaultConductScore = 0,
  defaultQrCheckinEnabled = true,
  errorField,
  categories = [],
  defaultCategoryId,
  classicLayout = false,
  maxRegistrations,
  categoryRequired = true,
}: {
  defaultConductScore?: number;
  defaultQrCheckinEnabled?: boolean;
  errorField?: string;
  categories?: Array<{ id: number; parentId?: number | null; code: string; name: string; scoreMax: number; depth?: number; hasChildren?: boolean }>;
  defaultCategoryId?: number;
  classicLayout?: boolean;
  maxRegistrations?: string;
  categoryRequired?: boolean;
}) {
  const [selectedCategoryId,setSelectedCategoryId]=useState<number | undefined>(defaultCategoryId);
  const [conductScore,setConductScore]=useState(defaultConductScore);
  return (
    <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <h2 className="whitespace-nowrap text-lg font-semibold text-slate-900">
        Điểm rèn luyện và điểm danh
      </h2>
      <div className={maxRegistrations!==undefined ? "mt-4 grid w-full grid-cols-[7rem_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[7rem_7.5rem_minmax(12rem,1fr)_8.5rem]" : classicLayout ? "mt-5 grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[5rem_minmax(0,1fr)_8.5rem] lg:items-stretch" : "mt-4 grid w-full grid-cols-[7rem_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[5rem_minmax(0,1fr)_8.5rem]"}>
        <div className={classicLayout ? "min-w-0 lg:rounded-none lg:border lg:border-slate-200 lg:p-4" : "min-w-0"}>
          <label className="mb-2 block whitespace-nowrap text-sm font-medium text-slate-600">Điểm</label>
          <input type="number" min={0} step="0.5" name="conductScore" placeholder="2" value={conductScore} onChange={(event)=>setConductScore(Number(event.target.value)||0)} aria-invalid={errorField === "conductScore"} className={`h-11 w-full rounded-xl border px-4 text-sm outline-none transition focus:border-blue-500 ${errorField === "conductScore" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`} />
        </div>
        <label className={classicLayout ? "flex mt-7 min-h-11 items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700 lg:order-2 lg:rounded-2xl lg:border lg:border-slate-200 lg:p-4" : "flex mt-7 min-h-11 items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700 lg:order-3"}><input type="checkbox" name="qrCheckinEnabled" defaultChecked={defaultQrCheckinEnabled} className="h-4 w-4 rounded border-slate-300"/>Quét mã QR</label>
        {maxRegistrations!==undefined?<label className="col-span-2 block min-w-0 text-sm font-medium text-slate-600 lg:order-1 lg:col-span-1"><span className="whitespace-nowrap">Số lượng tối đa</span><input name="maxRegistrations" type="number" min="1" step="1" defaultValue={maxRegistrations} placeholder="100" className="mt-2 block h-11 w-full max-w-28 rounded-xl border border-slate-200 px-3 sm:max-w-none"/></label>:null}
        <div className={classicLayout ? "col-span-2 min-w-0 lg:order-1 lg:col-span-1 lg:rounded-none lg:border lg:border-slate-200 lg:p-4" : "col-span-2 min-w-0 lg:order-2 lg:col-span-1"}>
          <label className="mb-2 block whitespace-nowrap text-sm font-medium text-slate-600">Khung tiêu chuẩn ĐRL<RequiredMark required={categoryRequired}/></label>
          <ConductCategoryPicker categories={categories} categoryRequired={categoryRequired} error={errorField === "conductCategoryId"} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
        </div>
      </div>
    </section>
  );
}

function ConductCategoryPicker({ categories, categoryRequired, error, selectedId, onSelect }: {
  categories: Array<{ id: number; code: string; name: string; scoreMax: number; depth?: number; hasChildren?: boolean }>;
  categoryRequired: boolean;
  error: boolean;
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((item) => item.id === selectedId);
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return <div ref={rootRef} className="relative min-w-0">
    <input type="hidden" name="conductCategoryId" required={categoryRequired} value={selectedId ?? ""} />
    <button type="button" aria-label="Chọn mục trong Khung tiêu chuẩn ĐRL" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm ${error ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}>
      <span className="min-w-0 break-words leading-5">{selected ? `${selected.code}. ${selected.name} (${selected.scoreMax}đ)` : "Chọn mục cấp cuối"}</span>
      {open ? <ChevronUp className="shrink-0" size={16} /> : <ChevronDown className="shrink-0" size={16} />}
    </button>
    {open ? <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
      <button type="button" onClick={() => { onSelect(undefined); setOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm leading-5 text-slate-700 hover:bg-blue-50">Chọn mục cấp cuối</button>
      {categories.map((item) => <button key={item.id} type="button" disabled={item.hasChildren} onClick={() => { onSelect(item.id); setOpen(false); }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm leading-5 break-words ${item.hasChildren ? "cursor-not-allowed text-slate-400" : "text-slate-700 hover:bg-blue-50"}`} style={{ paddingLeft: `${12 + (item.depth ?? 0) * 16}px` }}>{item.code}. {item.name} ({item.scoreMax}đ){item.hasChildren ? " — Chọn mục con" : ""}</button>)}
    </div> : null}
  </div>;
}
