"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { importStudents } from "@/server/actions/students/importStudents";
import { previewImportStudents } from "@/server/actions/students/previewImportStudents";
import ActionFeedback from "@/components/shared/ActionFeedback";
import StudentsImportClassForm from "./StudentsImportClassForm";
import StudentsImportFileUploader from "./StudentsImportFileUploader";
import StudentsImportOptionsForm from "./StudentsImportOptionsForm";
import StudentsImportValidationSummary from "./StudentsImportValidationSummary";
import StudentsImportValidationTable from "./StudentsImportValidationTable";
import type {
  ImportClassOption,
  ImportPreviewResult,
  ImportResultState,
  ParsedImportStudentRow,
} from "./types";

const initialResult: ImportResultState = {
  ok: false,
  message: "",
  inserted: 0,
  updated: 0,
  attachedToClass: 0,
  transferred: 0,
  skippedExisting: 0,
  conflicts: 0,
  total: 0,
  conflictMessages: [],
};

function emptyPreview(message: string): ImportPreviewResult {
  return {
    ok: false,
    message,
    targetClassId: null,
    total: 0,
    creatable: 0,
    sameClassUnchanged: 0,
    sameClassDifferentInfo: 0,
    differentClass: 0,
    invalid: 0,
    duplicateInFile: 0,
    rows: [],
  };
}

export default function StudentsImportForm({
  classes,
}: {
  classes: ImportClassOption[];
}) {
  const messageRef = useRef<HTMLDivElement | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedImportStudentRow[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportResultState>(initialResult);

  const [allowUpdateExisting, setAllowUpdateExisting] = useState(false);
  const [allowTransferClass, setAllowTransferClass] = useState(false);

  const [previewPending, startPreviewTransition] = useTransition();
  const [importPending, startImportTransition] = useTransition();

  const hasSameClassExistingRows = useMemo(() => {
    return Boolean(
      preview?.rows.some((item) =>
        ["same_class", "same_class_diff_info"].includes(item.status)
      )
    );
  }, [preview]);

  const hasDifferentClassRows = useMemo(() => {
    return Boolean(
      preview?.rows.some((item) => item.status === "different_class")
    );
  }, [preview]);

  const hasExistingRows = hasSameClassExistingRows || hasDifferentClassRows;

  const hasBlockingRows = useMemo(() => {
    return Boolean(
      preview?.rows.some((item) =>
        ["invalid", "duplicate_in_file"].includes(item.status)
      )
    );
  }, [preview]);

  function showMessage(message: string, ok = false) {
    setResult({
      ...initialResult,
      ok,
      message,
    });

    window.setTimeout(() => {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  useEffect(() => {
    if (!result.message) return;

    const timer = window.setTimeout(() => {
      setResult(initialResult);
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [result.message]);

  function resetAfterFileChanged(rows: ParsedImportStudentRow[]) {
    setParsedRows(rows);
    setPreview(null);
    setResult(initialResult);
    setAllowUpdateExisting(false);
    setAllowTransferClass(false);
  }

  function readPayloadFromForm(form: HTMLFormElement) {
    const formData = new FormData(form);

    return {
      classMode: String(formData.get("classMode") ?? "existing") as
        | "existing"
        | "new",
      classId: Number(formData.get("classId") ?? 0) || null,
      newClassCode: String(formData.get("newClassCode") ?? ""),
      newClassName: String(formData.get("newClassName") ?? ""),
      newClassFaculty: String(formData.get("newClassFaculty") ?? ""),
      newClassIntakeYear:
        Number(formData.get("newClassIntakeYear") ?? 0) || null,
      allowUpdateExisting,
      allowTransferClass,
      rows: parsedRows,
    };
  }

  async function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setResult(initialResult);

    const form = event.currentTarget;
    const payload = readPayloadFromForm(form);

    if (payload.rows.length === 0) {
      const message = "Vui lòng chọn file CSV/XLSX trước khi kiểm tra.";
      setPreview(emptyPreview(message));
      showMessage(message);
      return;
    }

    startPreviewTransition(async () => {
      try {
        const previewResult = await previewImportStudents(payload);
        setPreview(previewResult);

        if (!previewResult.ok) {
          showMessage(previewResult.message || "Dữ liệu chưa hợp lệ.");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Kiểm tra dữ liệu import thất bại.";

        setPreview(emptyPreview(message));
        showMessage(message);
      }
    });
  }

  function validateBeforeImport() {
  if (parsedRows.length === 0) {
    return "Vui lòng chọn file CSV/XLSX trước khi import.";
  }

  if (!preview) {
    return "Vui lòng bấm “Kiểm tra dữ liệu” trước khi import.";
  }

  if (!preview.ok) {
    return preview.message || "Dữ liệu chưa hợp lệ, không thể import.";
  }

  if (hasBlockingRows) {
    return "File còn dòng lỗi hoặc trùng trong file. Vui lòng xử lý trước khi import.";
  }

  if (hasSameClassExistingRows && allowTransferClass) {
    return "Sinh viên trong file đã thuộc đúng lớp đang import. Không cần chọn “Cho phép chuyển lớp”, vui lòng chọn “Cập nhật thông tin sinh viên đã tồn tại”.";
  }

  if (hasSameClassExistingRows && !allowUpdateExisting) {
    return "Danh sách có sinh viên đã tồn tại đúng lớp. Vui lòng chọn “Cập nhật thông tin sinh viên đã tồn tại” trước khi import.";
  }

  if (hasDifferentClassRows && allowUpdateExisting && !allowTransferClass) {
    return "Có sinh viên đang thuộc lớp khác. Không thể chỉ cập nhật thông tin khi khác lớp, vui lòng chọn “Cho phép chuyển lớp”.";
  }

  if (hasDifferentClassRows && !allowTransferClass) {
    return "Danh sách có sinh viên đang thuộc lớp khác. Vui lòng chọn “Cho phép chuyển lớp” trước khi import.";
  }

  return "";
}

  function handleConfirmImport(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    const form = event.currentTarget.form;
    if (!form) return;

    const validationError = validateBeforeImport();

    if (validationError) {
      showMessage(validationError);
      return;
    }

    const payload = readPayloadFromForm(form);

    startImportTransition(async () => {
      try {
        const importResult = await importStudents({
          ...payload,
          previewRows: preview!.rows,
        });

        setResult({
          ok: true,
          message: importResult.message,
          inserted: Number(importResult.inserted ?? 0),
          updated: Number(importResult.updated ?? 0),
          attachedToClass: Number(importResult.attachedToClass ?? 0),
          transferred: Number(importResult.transferred ?? 0),
          skippedExisting: Number(importResult.skippedExisting ?? 0),
          conflicts: Number(importResult.conflicts ?? 0),
          total: Number(importResult.total ?? 0),
          conflictMessages: Array.isArray(importResult.conflictMessages)
            ? importResult.conflictMessages
            : [],
        });

        window.setTimeout(() => {
          messageRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 50);

        setPreview(null);
        setParsedRows([]);
        setAllowUpdateExisting(false);
        setAllowTransferClass(false);
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "Xác nhận import thất bại."
        );
      }
    });
  }

  const warningMessage = preview ? validateBeforeImport() : "";

  return (
    <form onSubmit={handlePreview} className="space-y-6">
      <ActionFeedback pending={previewPending || importPending} message={result.message} ok={result.ok} />
      <div ref={messageRef} />

      {result.message ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          {result.ok ? (
            <div className="mt-4 grid gap-4 md:grid-cols-4 xl:grid-cols-7">
              <StatCard label="Tổng dòng" value={result.total} />
              <StatCard label="Tạo mới" value={result.inserted} />
              <StatCard label="Cập nhật" value={result.updated} />
              <StatCard label="Gán lớp" value={result.attachedToClass} />
              <StatCard label="Chuyển lớp" value={result.transferred} />
              <StatCard label="Bỏ qua" value={result.skippedExisting} />
              <StatCard label="Xung đột" value={result.conflicts} />
            </div>
          ) : null}
        </section>
      ) : null}

      <StudentsImportClassForm classes={classes} />

      <StudentsImportOptionsForm
        allowUpdateExisting={allowUpdateExisting}
        allowTransferClass={allowTransferClass}
        onAllowUpdateExistingChange={setAllowUpdateExisting}
        onAllowTransferClassChange={setAllowTransferClass}
        hasExistingRows={hasExistingRows}
        hasDifferentClassRows={hasDifferentClassRows}
      />

      <StudentsImportFileUploader onParsedRowsChange={resetAfterFileChanged} />

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="submit"
          disabled={previewPending || importPending}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {previewPending ? "Đang kiểm tra..." : "Kiểm tra dữ liệu"}
        </button>

        <button
          type="button"
          onClick={handleConfirmImport}
          disabled={previewPending || importPending}
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importPending ? "Đang import..." : "Xác nhận import"}
        </button>
      </div>

      {warningMessage ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
          {warningMessage}
        </div>
      ) : null}

      {preview ? <StudentsImportValidationSummary preview={preview} /> : null}
      {preview ? <StudentsImportValidationTable preview={preview} /> : null}
    </form>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
