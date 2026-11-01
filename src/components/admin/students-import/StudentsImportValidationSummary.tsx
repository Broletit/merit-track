"use client";
import statCardStyles from "@/components/shared/statistics/StatCard.module.css";

import { AlertCircle, AlertTriangle, ArrowRightLeft, CheckCircle2, CircleAlert, CircleCheck, Rows3, UserPlus, UserRoundPen } from "lucide-react";
import type { ImportPreviewResult } from "./types";

export default function StudentsImportValidationSummary({
  preview,
  warningMessage,
}: {
  preview: ImportPreviewResult | null;
  warningMessage: string;
}) {
  if (!preview) return null;

  const hasError = !preview.ok;
  const hasWarning =
    preview.sameClassDifferentInfo > 0 || preview.differentClass > 0;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      {/* ===== STATUS BOX ===== */}
      <div
        className={`rounded-none px-4 py-3 text-sm ring-1 flex items-start gap-3 ${
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
          <StatCard icon={<Rows3 size={18} />} label="Tổng dòng" value={preview.total} />
          <StatCard icon={<UserPlus size={18} />} label="Tạo mới" value={preview.creatable} />
          <StatCard icon={<CircleCheck size={18} />} label="Đúng lớp" value={preview.sameClassUnchanged} />
          <StatCard icon={<UserRoundPen size={18} />} label="Khác thông tin" value={preview.sameClassDifferentInfo} />
          <StatCard icon={<ArrowRightLeft size={18} />} label="Khác lớp" value={preview.differentClass} />
          <StatCard
            icon={<CircleAlert size={18} />}
            label="Lỗi / trùng"
            value={preview.invalid + preview.duplicateInFile}
          />
        </div>
      ) : null}

      {warningMessage ? (
        <div role="alert" className="mt-5 rounded-none bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100 shadow-md shadow-slate-200/60">
          {warningMessage}
        </div>
      ) : null}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className="flex items-center justify-between gap-3"><div className={statCardStyles.label}>{label}</div><div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</div></div>
      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>
    </div>
  );
}
