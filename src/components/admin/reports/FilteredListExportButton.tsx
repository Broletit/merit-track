"use client";
import { Download } from "lucide-react";
type Row = Record<string, string | number | null | undefined>;
export default function FilteredListExportButton({ rows, columns, fileName }: { rows: Row[]; columns: Array<{ key: string; label: string }>; fileName: string }) {
  function download() { const csv = [columns.map((column) => quote(column.label)).join(";"), ...rows.map((row) => columns.map((column) => quote(row[column.key])).join(";"))].join("\n"); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url); }
  return <button type="button" disabled={!rows.length} onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />Xuất danh sách</button>;
}
function quote(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
