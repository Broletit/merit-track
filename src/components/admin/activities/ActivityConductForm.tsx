"use client";

import { useState } from "react";

export default function ActivityConductForm({
  defaultConductScore = 0,
  defaultQrCheckinEnabled = true,
  errorField,
  categories = [],
  defaultCategoryId,
}: {
  defaultConductScore?: number;
  defaultQrCheckinEnabled?: boolean;
  errorField?: string;
  categories?: Array<{ id: number; parentId?: number | null; code: string; name: string; scoreMax: number; depth?: number }>;
  defaultCategoryId?: number;
}) {
  const [selectedCategoryId,setSelectedCategoryId]=useState<number | undefined>(defaultCategoryId);
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">
        Điểm rèn luyện và điểm danh
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-600">Điểm của hoạt động</label>
          <input type="number" min={0} step="0.5" name="conductScore" defaultValue={defaultConductScore} aria-invalid={errorField === "conductScore"} className={`h-11 w-full rounded-xl border px-4 text-sm outline-none transition focus:border-blue-500 ${errorField === "conductScore" ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`} />
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-600">Khung tiêu chuẩn ĐRL</label>
          <select name="conductCategoryId" aria-label="Chọn mục trong Khung tiêu chuẩn ĐRL" aria-invalid={errorField==="conductCategoryId"} value={selectedCategoryId??""} onChange={(event)=>setSelectedCategoryId(Number(event.target.value)||undefined)} className={`h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-sm ${errorField==="conductCategoryId"?"border-rose-500 ring-3 ring-rose-100":"border-slate-200"}`}><option value="">Chọn mục điểm</option>{categories.map((item)=><option key={item.id} value={item.id}>{"— ".repeat(item.depth??0)}{item.code}. {item.name} ({item.scoreMax}đ)</option>)}</select>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="qrCheckinEnabled"
              defaultChecked={defaultQrCheckinEnabled}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
            />
            <div>
              <div className="text-sm font-medium text-slate-900">
                Cho phép quét mã QR
              </div>
              <div className="text-xs text-slate-500">
                Điểm danh chỉ được thực hiện trong thời gian hoạt động diễn ra.
              </div>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}
