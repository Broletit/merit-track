"use client";

import { Download } from "lucide-react";

type Row = {
  full_name: string;
  mssv: string;
  class_codes: string | null;
  event_title: string;
  achieved_criteria: number;
  total_criteria: number;
  missing_required: number;
  potential_score: number;
  score_max: number;
};

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function PotentialOfficerExportButton({ rows }: { rows: Row[] }) {
  function download() {
    const content = [
      ["Họ tên", "MSSV", "Lớp", "Đợt xét phù hợp", "Tiêu chí đã đạt", "Còn thiếu", "Điểm tiềm năng"].map(csv).join(";"),
      ...rows.map((row) => [row.full_name, row.mssv, row.class_codes, row.event_title, `${row.achieved_criteria}/${row.total_criteria}`, row.missing_required, `${row.potential_score}/${row.score_max}`].map(csv).join(";")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "can-bo-du-dieu-kien-tham-gia-xet.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return <button type="button" onClick={download} disabled={!rows.length} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />Xuất danh sách</button>;
}
