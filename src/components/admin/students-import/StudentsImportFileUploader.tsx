"use client";
import RequiredMark from "@/components/common/RequiredMark";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, LoaderCircle } from "lucide-react";
import StudentsImportPreviewTable from "./StudentsImportPreviewTable";
import ActionFeedback from "@/components/shared/ActionFeedback";
import StudentsImportValidationSummary from "./StudentsImportValidationSummary";
import StudentsImportValidationTable from "./StudentsImportValidationTable";
import { parseStudentsUpload } from "./parseStudentsUpload";
import type { ImportPreviewResult, ParsedImportStudentRow } from "./types";

export default function StudentsImportFileUploader({ onParsedRowsChange, validationPreview, checking, disabled, actions, warningMessage }: {
  onParsedRowsChange: (rows: ParsedImportStudentRow[]) => void;
  validationPreview: ImportPreviewResult | null;
  checking: boolean;
  disabled: boolean;
  actions: ReactNode;
  warningMessage: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!validationPreview || checking) return;
    const frame = requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [validationPreview, checking]);
  const selectionRef = useRef(0);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const selection = ++selectionRef.current;
    setFileName(file?.name ?? "");
    setError(""); setHeaders([]); setRows([]);
    onParsedRowsChange([]);
    setParsing(Boolean(file));
    if (!file) return;
    try {
      const preview = await parseStudentsUpload(file);
      if (selection !== selectionRef.current) return;
      setHeaders(preview.headers); setRows(preview.rows); setError(preview.error);
      if (!preview.error) onParsedRowsChange(preview.parsedRows);
    } catch (caught) {
      if (selection !== selectionRef.current) return;
      setError(caught instanceof Error ? caught.message : "Không thể đọc file.");
    } finally {
      if (selection === selectionRef.current) setParsing(false);
    }
  }

  const isValid = Boolean(fileName && !parsing && !error && rows.length);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <ActionFeedback pending={parsing} message={error} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Upload file sinh viên<RequiredMark/></h2>
        <a href="/templates/mau-import-sinh-vien.xlsx?v=20261017-ddmmyyyy" download="mau-import-sinh-vien.xlsx" className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-200">
          <Download size={16} />Tải file mẫu
        </a>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
          <FileUp size={16} />Chọn file
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-md shadow-slate-200/60">
          <span className="min-w-0 truncate font-medium">{fileName || "Chưa chọn file"}</span>
          {fileName ? (
            <span role="status" className={`inline-flex items-center gap-1.5 text-xs font-semibold ${parsing ? "text-slate-500" : isValid ? "text-emerald-700" : "text-rose-700"}`}>
              {parsing ? <LoaderCircle size={16} className="animate-spin" /> : isValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {parsing ? "Đang đọc file..." : isValid ? "File hợp lệ để kiểm tra" : "File chưa hợp lệ"}
            </span>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" name="file" accept=".csv,.xls,.xlsx" disabled={disabled} className="hidden" onChange={handleFileChange} />

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
        Mật khẩu mặc định cho tài khoản mới là <span className="font-semibold">1111</span>.
      </div>

      {validationPreview && !checking ? <div ref={resultsRef} className="mt-5 scroll-mt-4"><StudentsImportValidationSummary preview={validationPreview} warningMessage={warningMessage} /></div> : null}
      {checking ? <div role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />Đang kiểm tra dữ liệu...</div> : validationPreview ? (
        <StudentsImportValidationTable preview={validationPreview} />
      ) : <StudentsImportPreviewTable headers={headers} rows={rows} />}
      <div className="mt-5">{actions}</div>
    </section>
  );
}
