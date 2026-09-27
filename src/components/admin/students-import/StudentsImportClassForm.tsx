"use client";

import { useState } from "react";
import type { ClassMode, ImportClassOption } from "./types";

export default function StudentsImportClassForm({
  classes,
}: {
  classes: ImportClassOption[];
}) {
  const [mode, setMode] = useState<ClassMode>("existing");

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">
        Chọn lớp import
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Nếu là lần đầu import, bạn có thể tạo lớp mới ngay tại đây.
      </p>

      <input type="hidden" name="classMode" value={mode} />

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "existing"
              ? "bg-blue-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Chọn lớp có sẵn
        </button>

        <button
          type="button"
          onClick={() => setMode("new")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "new"
              ? "bg-blue-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Tạo lớp mới
        </button>
      </div>

      {mode === "existing" ? (
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Lớp có sẵn
          </label>
          <select
            name="classId"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
            defaultValue=""
            required={mode === "existing"}
          >
            <option value="">-- Chọn lớp --</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Mã lớp
            </label>
            <input
              name="newClassCode"
              placeholder="Ví dụ: DHTH17A"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              required={mode === "new"}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Tên lớp
            </label>
            <input
              name="newClassName"
              placeholder="Ví dụ: Lớp DHTH17A"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              required={mode === "new"}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Khoa / ngành
            </label>
            <input
              name="newClassFaculty"
              placeholder="Ví dụ: Công nghệ thông tin"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Khóa
            </label>
            <input
              name="newClassIntakeYear"
              type="number"
              placeholder="Ví dụ: 2021"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
              required={mode === "new"}
            />
          </div>
        </div>
      )}
    </section>
  );
}