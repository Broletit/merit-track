"use client";

export default function StudentsImportOptionsForm({
  allowUpdateExisting,
  updateDisabled,
  transferDisabled,
  allowTransferClass,
  onAllowUpdateExistingChange,
  onAllowTransferClassChange,
}: {
  allowUpdateExisting: boolean;
  updateDisabled: boolean;
  transferDisabled: boolean;
  allowTransferClass: boolean;
  onAllowUpdateExistingChange: (value: boolean) => void;
  onAllowTransferClassChange: (value: boolean) => void;
}) {

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <h2 className="text-lg font-semibold text-slate-900">Tùy chọn import</h2>


      <div className="mt-5 space-y-4">
        <label className={`flex items-start gap-3 ${updateDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={allowUpdateExisting}
            disabled={updateDisabled}
            onChange={(event) =>
              onAllowUpdateExistingChange(event.target.checked)
            }
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
          />

          <div>
            <div className="text-sm font-medium text-slate-800">
              Cập nhật thông tin sinh viên đã tồn tại
            </div>
          </div>
        </label>

        <label className={`flex items-start gap-3 ${transferDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={allowTransferClass}
            disabled={transferDisabled}
            onChange={(event) =>
              onAllowTransferClassChange(event.target.checked)
            }
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
          />

          <div>
            <div className="text-sm font-medium text-slate-800">
              Cho phép chuyển lớp
            </div>
          </div>
        </label>
      </div>
    </section>
  );
}
