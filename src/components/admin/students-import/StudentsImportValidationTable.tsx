"use client";
import PaginatedTable from "@/components/common/PaginatedTable";


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
    <div className="mt-5">
      <h2 className="text-lg font-semibold text-slate-900">
        Kết quả kiểm tra dữ liệu
      </h2>

      <PaginatedTable data-no-row-number className="min-w-full divide-y divide-slate-200" containerClassName="mt-3 max-h-96 overflow-auto rounded-none border border-slate-200" resultLabel="dòng dữ liệu">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                MSSV
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Họ tên
              </th>
              <th data-column-align="left" className="px-4 py-3  text-sm font-semibold text-slate-700 text-left">
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
                <td className="px-4 py-4 text-sm text-slate-800">{row.mssv || "-"}</td>
                <td className="px-4 py-4 text-sm text-slate-800">{row.full_name || "-"}</td>
                <td data-column-align="left" className="px-4 py-4 text-sm text-slate-600 text-left">
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
        </PaginatedTable>
    </div>
  );
}