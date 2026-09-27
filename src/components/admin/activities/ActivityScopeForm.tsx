"use client";

import { useState } from "react";
import type { ActivityClassOption } from "./types";

export default function ActivityScopeForm({
  classes,
  defaultSelectedClassIds = [],
  defaultScopeMode,
}: {
  classes: ActivityClassOption[];
  defaultSelectedClassIds?: number[];
  defaultScopeMode?: string;
}) {
  const [scopeMode, setScopeMode] = useState<"all" | "selected">(
    defaultScopeMode === "selected" || defaultSelectedClassIds.length > 0 ? "selected" : "all"
  );

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Phạm vi áp dụng</h2>

      <input type="hidden" name="scopeMode" value={scopeMode} />

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setScopeMode("all")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            scopeMode === "all"
              ? "bg-blue-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Toàn khoa
        </button>

        <button
          type="button"
          onClick={() => setScopeMode("selected")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            scopeMode === "selected"
              ? "bg-blue-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Chọn lớp cụ thể
        </button>
      </div>

      {scopeMode === "selected" ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
            >
              <input
                type="checkbox"
                name="classIds"
                value={item.id}
                defaultChecked={defaultSelectedClassIds.includes(item.id)}
              />
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {item.code}
                </div>
                <div className="text-xs text-slate-500">{item.name}</div>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
          Hoạt động sẽ áp dụng cho toàn khoa.
        </div>
      )}
    </section>
  );
}
