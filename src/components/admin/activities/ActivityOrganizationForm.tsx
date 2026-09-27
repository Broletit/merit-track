"use client";

import { useState } from "react";
import type { ActivityClassOption } from "./types";

export default function ActivityOrganizationForm({ classes, defaultLevel = "class", defaultClassId, errorField }: { classes: ActivityClassOption[]; defaultLevel?: string; defaultClassId?: number; errorField?: string }) {
  const [level, setLevel] = useState(defaultLevel === "faculty" ? "faculty" : "class");
  const invalid = errorField === "classIds";
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Cấp tổ chức</h2>
      <p className="mt-1 text-sm text-slate-500">Nơi đăng ký được xác định tự động theo cấp tổ chức.</p>
      <input type="hidden" name="participationSource" value={level === "class" ? "internal" : "external"} />
      <input type="hidden" name="scopeMode" value={level === "class" ? "selected" : "all"} />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-600">Cấp tổ chức
          <select name="organizerLevel" value={level} onChange={(event) => setLevel(event.target.value as "class" | "faculty")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4">
            <option value="class">Chi đoàn / lớp — đăng ký tại hệ thống khoa</option><option value="faculty">Cấp khoa — đăng ký tại hệ thống trường</option>
          </select>
        </label>
        {level === "class" ? <label className="text-sm font-medium text-slate-600">Chi đoàn tổ chức
          <select name="classIds" required defaultValue={defaultClassId ? String(defaultClassId) : ""} aria-invalid={invalid} className={`mt-2 h-11 w-full rounded-xl border bg-white px-4 ${invalid ? "border-rose-500 ring-3 ring-rose-100" : "border-slate-200"}`}>
            <option value="">Chọn chi đoàn / lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
          </select>
        </label> : <div className="self-end rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 ring-1 ring-blue-100">Sinh viên đăng ký ở hệ thống trường; hệ thống khoa cập nhật người tham gia bằng Excel.</div>}
      </div>
    </section>
  );
}
