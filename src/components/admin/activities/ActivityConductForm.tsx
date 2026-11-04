"use client";
import RequiredMark from "@/components/common/RequiredMark";


import { useState } from "react";

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
          <select name="conductCategoryId" required={categoryRequired} aria-label="Chọn mục trong Khung tiêu chuẩn ĐRL" aria-invalid={errorField==="conductCategoryId"} value={selectedCategoryId??""} onChange={(event)=>setSelectedCategoryId(Number(event.target.value)||undefined)} className={`h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-sm ${errorField==="conductCategoryId"?"border-rose-500 ring-3 ring-rose-100":"border-slate-200"}`}><option value="">Chọn mục cấp cuối</option>{categories.map((item)=><option key={item.id} value={item.id} disabled={item.hasChildren}>{"— ".repeat(item.depth??0)}{item.code} {item.name} ({item.scoreMax}đ){item.hasChildren?" — Chọn mục con":""}</option>)}</select>
        </div>
      </div>
    </section>
  );
}
