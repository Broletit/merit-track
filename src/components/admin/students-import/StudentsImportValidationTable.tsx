"use client";

import type { ImportPreviewResult } from "./types";

function getBadgeClass(status: string) {
  switch (status) {
    case "create":
      return "bg-emerald-50 text-emerald-700";
    case "same_class_unchanged":
      return "bg-slate-100 text-slate-700";
    case "same_class_diff_info":
      return "bg-amber-50 text-amber-700";
    case "different_class":
      return "bg-rose-50 text-rose-700";
    case "duplicate_in_file":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-red-50 text-red-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "create":
      return "Tạo mới";
    case "same_class_unchanged":
      return "Đã tồn tại cùng lớp";
    case "same_class_diff_info":
      return "Khác thông tin";
    case "different_class":
      return "Khác lớp";
    case "duplicate_in_file":
      return "Trùng trong file";
    default:
      return "Lỗi dữ liệu";
  }
}

export default function StudentsImportValidationTable({
  preview,
}: {
  preview: ImportPreviewResult | null;
}) {
  if (!preview || preview.rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">
        Kết quả kiểm tra từng dòng
      </h2>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Dòng
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                MSSV
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Họ tên
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Lớp hiện tại
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Tình huống
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Ghi chú
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {preview.rows.map((row) => (
              <tr key={`${row.rowNumber}-${row.mssv}-${row.status}`}>
                <td className="px-4 py-4 text-sm text-slate-700">{row.rowNumber}</td>
                <td className="px-4 py-4 text-sm text-slate-800">{row.mssv || "-"}</td>
                <td className="px-4 py-4 text-sm text-slate-800">{row.full_name || "-"}</td>
                <td className="px-4 py-4 text-sm text-slate-600">
                  {row.currentClass || "-"}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(
                      row.status
                    )}`}
                  >
                    {getStatusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}