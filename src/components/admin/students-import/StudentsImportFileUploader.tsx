"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import ActionFeedback from "@/components/shared/ActionFeedback";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
} from "lucide-react";

import StudentsImportPreviewTable from "./StudentsImportPreviewTable";
import type { ParsedImportStudentRow } from "./types";

type PreviewRow = Record<string, string>;

const SUPPORTED_HEADERS = [
  "mssv",
  "full_name",
  "last_name",
  "first_name",
  "email",
  "phone",
  "gender",
  "date_of_birth",
  "class_code",
];

type BuildPreviewResult = {
  headers: string[];
  rows: PreviewRow[];
  parsedRows: ParsedImportStudentRow[];
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiters = [",", ";", "\t"];

  return delimiters
    .map((delimiter) => ({
      delimiter,
      score: firstLine.split(delimiter).length,
    }))
    .sort((a, b) => b.score - a.score)[0].delimiter;
}

function getValue(row: Record<string, unknown>, key: string) {
  const normalizedKey = normalizeHeader(key);

  const foundKey = Object.keys(row).find(
    (item) => normalizeHeader(item) === normalizedKey
  );

  if (!foundKey) return "";

  return String(row[foundKey] ?? "").trim();
}

function buildPreview(rows: Record<string, unknown>[]): BuildPreviewResult {
  if (rows.length === 0) {
    return {
      headers: [],
      rows: [],
      parsedRows: [],
    };
  }

  const headers = Object.keys(rows[0]).map(String);

  const previewRows: PreviewRow[] = rows.slice(0, 5).map((row) => {
    const item: PreviewRow = {};

    headers.forEach((header) => {
      item[header] = String(row[header] ?? "").trim();
    });

    return item;
  });

  const parsedRows: ParsedImportStudentRow[] = rows.map(
    (row, index): ParsedImportStudentRow => {
      const fullName =
        getValue(row, "full_name") ||
        [getValue(row, "last_name"), getValue(row, "first_name")]
          .filter(Boolean)
          .join(" ")
          .trim();

      return {
        rowNumber: index + 2,
        mssv: getValue(row, "mssv"),
        full_name: fullName,
        email: getValue(row, "email") || null,
        phone: getValue(row, "phone") || null,
        gender: getValue(row, "gender") || null,
        date_of_birth: getValue(row, "date_of_birth") || null,
      };
    }
  );

  return {
    headers,
    rows: previewRows,
    parsedRows,
  };
}

async function parseSpreadsheet(file: File): Promise<BuildPreviewResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  let workbook: XLSX.WorkBook;

  if (fileName.endsWith(".csv")) {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");

    workbook = XLSX.read(text, {
      type: "string",
      raw: false,
      FS: detectDelimiter(text),
    });
  } else if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      raw: false,
    });
  } else {
    throw new Error("Chỉ hỗ trợ file CSV, XLS hoặc XLSX.");
  }

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("File không có sheet dữ liệu.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    {
      defval: "",
      raw: false,
    }
  );

  return buildPreview(rows);
}

export default function StudentsImportFileUploader({
  onParsedRowsChange,
}: {
  onParsedRowsChange: (rows: ParsedImportStudentRow[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [supportedHeaders, setSupportedHeaders] = useState<string[]>([]);
  const [extraHeaders, setExtraHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setParsing(true);
    const file = event.target.files?.[0];

    setFileName(file?.name ?? "");
    setError("");
    setHeaders([]);
    setRows([]);
    setSupportedHeaders([]);
    setExtraHeaders([]);
    onParsedRowsChange([]);

    if (!file) {
      setParsing(false);
      return;
    }

    try {
      const preview = await parseSpreadsheet(file);

      if (!preview.headers.length) {
        setError("File không có dữ liệu hợp lệ.");
        return;
      }

      const normalizedHeaders = preview.headers.map(normalizeHeader);

      const hasMssv = normalizedHeaders.includes("mssv");
      const hasFullName = normalizedHeaders.includes("full_name");
      const hasSplitName =
        normalizedHeaders.includes("last_name") &&
        normalizedHeaders.includes("first_name");

      const supported = normalizedHeaders.filter((header) =>
        SUPPORTED_HEADERS.includes(header)
      );

      const extra = normalizedHeaders.filter(
        (header) => !SUPPORTED_HEADERS.includes(header)
      );

      setHeaders(preview.headers);
      setRows(preview.rows);
      setSupportedHeaders(supported);
      setExtraHeaders(extra);

      if (!hasMssv || (!hasFullName && !hasSplitName)) {
        setError(
          "File cần có mssv và full_name hoặc mssv và last_name + first_name."
        );
        return;
      }

      const invalidNameRows = preview.parsedRows.filter(
        (item) => !item.mssv || !item.full_name
      );

      if (invalidNameRows.length > 0) {
        setError(
          `Có ${invalidNameRows.length} dòng thiếu MSSV hoặc họ tên. Vui lòng kiểm tra lại file.`
        );
        return;
      }

      onParsedRowsChange(preview.parsedRows);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể đọc file."
      );
    } finally {
      setParsing(false);
    }
  }

  const isValid = Boolean(fileName && !error);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ActionFeedback pending={parsing} message={error} ok={false} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Upload file sinh viên
          </h2>

        </div>

        <Link
          href="/templates/mau-import-sinh-vien.csv"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-200"
        >
          <Download size={16} />
          Tải file mẫu
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          <FileUp size={16} />
          Chọn file
        </button>

        <div className="min-w-65 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {fileName ? (
            <span className="block truncate font-medium">{fileName}</span>
          ) : (
            <span className="text-slate-400">Chưa chọn file</span>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".csv,.xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-slate-200">
        Mật khẩu mặc định cho tài khoản mới là{" "}
        <span className="font-semibold">1111</span>.
      </div>

      {fileName ? (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ring-1 ${
            isValid
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-rose-50 text-rose-700 ring-rose-100"
          }`}
        >
          <div className="flex items-start gap-2">
            {isValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}

            <div>
              <div className="font-semibold">
                {isValid ? "File hợp lệ để kiểm tra" : "File chưa hợp lệ"}
              </div>

              {error ? <div className="mt-1">{error}</div> : null}

              {!error && supportedHeaders.length > 0 ? (
                <div className="mt-1">
                  Cột nhận diện được: {supportedHeaders.join(", ")}
                </div>
              ) : null}

              {!error && extraHeaders.length > 0 ? (
                <div className="mt-1">
                  Cột dư sẽ bị bỏ qua: {extraHeaders.join(", ")}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <StudentsImportPreviewTable headers={headers} rows={rows} />
    </section>
  );
}
