"use client";
import statCardStyles from "@/components/shared/statistics/StatCard.module.css";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRightLeft, CircleAlert, Link2, MinusCircle, RefreshCw, Rows3, UserPlus } from "lucide-react";
import { assertImportCohort } from "@/lib/cohorts/cohorts";
import { importStudents } from "@/server/actions/students/importStudents";
import { previewImportStudents } from "@/server/actions/students/previewImportStudents";
import ActionFeedback from "@/components/shared/ActionFeedback";
import StudentsImportClassForm from "./StudentsImportClassForm";
import StudentsImportFileUploader from "./StudentsImportFileUploader";
import StudentsImportOptionsForm from "./StudentsImportOptionsForm";
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
  const router = useRouter();
  const [formRevision, setFormRevision] = useState(0);

  const [classReady, setClassReady] = useState(false);
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
        ["same_class_unchanged", "same_class_diff_info"].includes(item.status)
      )
    );
  }, [preview]);

  const hasDifferentClassRows = useMemo(() => {
    return Boolean(
      preview?.rows.some((item) => item.status === "different_class")
    );
  }, [preview]);


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
      cohort: Number(formData.get("cohort") ?? 0),
      classId: Number(formData.get("classId") ?? 0) || null,
      newClassCode: String(formData.get("newClassCode") ?? ""),
      newClassName: String(formData.get("newClassName") ?? ""),
      newClassFaculty: String(formData.get("newClassFaculty") ?? ""),
      allowUpdateExisting,
      allowTransferClass,
      rows: parsedRows,
    };
  }

  async function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setResult(initialResult);

    setAllowUpdateExisting(false);
    setAllowTransferClass(false);
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const payload = readPayloadFromForm(form);
    if (payload.classMode === "existing" ? !classes.some((item) => item.id === payload.classId) : !payload.newClassCode.trim() || !payload.newClassName.trim()) {
      showMessage("Vui lòng chọn lớp hoặc nhập đầy đủ mã lớp và tên lớp mới.");
      return;
    }

    if (payload.rows.length === 0) {
      const message = "Vui lòng chọn file CSV/XLSX trước khi kiểm tra.";
      showMessage(message);
      return;
    }

    try { assertImportCohort(payload.cohort, payload.rows); } catch (error) {
      showMessage(error instanceof Error ? error.message : "Khóa không hợp lệ.");
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
    if (!form || !form.reportValidity()) return;

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

        toast.success(importResult.message, { id: 'students-import-success' });
        setResult(initialResult);
        setClassReady(false);
        setPreview(null);
        setParsedRows([]);
        setAllowUpdateExisting(false);
        setAllowTransferClass(false);
        setFormRevision(revision => revision + 1);
        router.refresh();
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "Xác nhận import thất bại."
        );
      }
    });
  }

  const warningMessage = preview ? validateBeforeImport() : "";

  return (
    <form key={formRevision} onSubmit={handlePreview} className="space-y-6">
      <ActionFeedback pending={previewPending || importPending} message={result.message} ok={result.ok} />

      {result.message ? (
        <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
          {result.ok ? (
            <div className="mt-4 grid gap-4 md:grid-cols-4 xl:grid-cols-7">
              <StatCard icon={<Rows3 size={18} />} label="Tổng dòng" value={result.total} />
              <StatCard icon={<UserPlus size={18} />} label="Tạo mới" value={result.inserted} />
              <StatCard icon={<RefreshCw size={18} />} label="Cập nhật" value={result.updated} />
              <StatCard icon={<Link2 size={18} />} label="Gán lớp" value={result.attachedToClass} />
              <StatCard icon={<ArrowRightLeft size={18} />} label="Chuyển lớp" value={result.transferred} />
              <StatCard icon={<MinusCircle size={18} />} label="Bỏ qua" value={result.skippedExisting} />
              <StatCard icon={<CircleAlert size={18} />} label="Xung đột" value={result.conflicts} />
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <fieldset disabled={previewPending || importPending} className="min-w-0">
        <StudentsImportClassForm classes={classes} onSelectionChange={(ready) => {
          setClassReady(ready);
          setAllowUpdateExisting(false);
          setAllowTransferClass(false);
          setPreview(null);
          setResult(initialResult);
        }} />
      </fieldset>

      <StudentsImportOptionsForm
        updateDisabled={!preview?.ok || previewPending || importPending || hasBlockingRows || !hasSameClassExistingRows}
        transferDisabled={!preview?.ok || previewPending || importPending || hasBlockingRows || !hasDifferentClassRows}
        allowUpdateExisting={allowUpdateExisting}
        allowTransferClass={allowTransferClass}
        onAllowUpdateExistingChange={setAllowUpdateExisting}
        onAllowTransferClassChange={setAllowTransferClass}
      />
      </div>

      <StudentsImportFileUploader
        onParsedRowsChange={resetAfterFileChanged}
        actions={
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="submit"
          disabled={previewPending || importPending || !classReady || parsedRows.length === 0}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {previewPending ? "Đang kiểm tra..." : "Kiểm tra dữ liệu"}
        </button>

        <button
          type="button"
          onClick={handleConfirmImport}
          disabled={previewPending || importPending || !classReady || !preview || Boolean(warningMessage)}
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importPending ? "Đang import..." : "Xác nhận import"}
        </button>
      </div>

        }
        warningMessage={warningMessage}
        validationPreview={preview}
        checking={previewPending}
        disabled={previewPending || importPending}
      />



    </form>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className={[statCardStyles.card, "min-w-0"].join(" ")}>
      <div className="flex items-center justify-between gap-3"><div className={statCardStyles.label}>{label}</div><div className={[statCardStyles.icon, "flex items-center justify-center"].join(" ")}>{icon}</div></div>
      <div className={[statCardStyles.value, "text-slate-900"].join(" ")}>{value}</div>
    </div>
  );
}
