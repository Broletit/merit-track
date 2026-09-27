"use client";

import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ImportPreviewResult } from "./types";

export default function StudentsImportValidationSummary({
  preview,
}: {
  preview: ImportPreviewResult | null;
}) {
  if (!preview) return null;

  const hasError = !preview.ok;
  const hasWarning =
    preview.sameClassDifferentInfo > 0 || preview.differentClass > 0;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      {/* ===== STATUS BOX ===== */}
      <div
        className={`rounded-xl px-4 py-3 text-sm ring-1 flex items-start gap-3 ${
          hasError
            ? "bg-rose-50 text-rose-700 ring-rose-100"
            : hasWarning
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-emerald-50 text-emerald-700 ring-emerald-100"
        }`}
      >
        {hasError ? (
          <AlertCircle size={18} />
        ) : hasWarning ? (
          <AlertTriangle size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}

        <div>
          <div className="font-semibold">
            {hasError
              ? "Dữ liệu không hợp lệ"
              : hasWarning
              ? "Có dữ liệu cần xác nhận"
              : "Dữ liệu hợp lệ"}
          </div>

        </div>
      </div>

      {/* ===== STATS ===== */}
      {preview.ok ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Tổng dòng" value={preview.total} />
          <StatCard label="Tạo mới" value={preview.creatable} />
          <StatCard label="Đúng lớp" value={preview.sameClassUnchanged} />
          <StatCard label="Khác thông tin" value={preview.sameClassDifferentInfo} />
          <StatCard label="Khác lớp" value={preview.differentClass} />
          <StatCard
            label="Lỗi / trùng"
            value={preview.invalid + preview.duplicateInFile}
          />
        </div>
      ) : null}

      {/* ===== HARD WARNING ===== */}
      {preview.ok &&
      (preview.invalid > 0 || preview.duplicateInFile > 0) ? (
        <div className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          Có dữ liệu lỗi hoặc trùng trong file. Bạn cần sửa trước khi import.
        </div>
      ) : null}

      {/* ===== SOFT WARNING ===== */}
      {preview.ok &&
      preview.invalid === 0 &&
      preview.duplicateInFile === 0 &&
      hasWarning ? (
        <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
          Có sinh viên khác lớp hoặc khác thông tin. Hãy bật tùy chọn phù hợp trước khi import.
        </div>
      ) : null}
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}