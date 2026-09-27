"use client";

export default function StudentsImportOptionsForm({
  allowUpdateExisting,
  allowTransferClass,
  onAllowUpdateExistingChange,
  onAllowTransferClassChange,
  hasExistingRows,
  hasDifferentClassRows,
}: {
  allowUpdateExisting: boolean;
  allowTransferClass: boolean;
  onAllowUpdateExistingChange: (value: boolean) => void;
  onAllowTransferClassChange: (value: boolean) => void;
  hasExistingRows: boolean;
  hasDifferentClassRows: boolean;
}) {
  const mustChooseOption =
    hasExistingRows && !allowUpdateExisting && !allowTransferClass;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">Tùy chọn import</h2>

      <p className="mt-2 text-sm text-slate-500">
        Chọn cách hệ thống xử lý khi MSSV đã tồn tại hoặc đang thuộc lớp khác.
      </p>

      {mustChooseOption ? (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
          Danh sách có sinh viên đã tồn tại. Vui lòng chọn cách xử lý trước khi
          import.
        </div>
      ) : null}

      {hasDifferentClassRows && !allowTransferClass ? (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          Có sinh viên đang thuộc lớp khác. Muốn chuyển sang lớp import hiện tại
          thì phải bật “Cho phép chuyển lớp”.
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={allowUpdateExisting}
            onChange={(event) =>
              onAllowUpdateExistingChange(event.target.checked)
            }
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
          />

          <div>
            <div className="text-sm font-medium text-slate-800">
              Cập nhật thông tin sinh viên đã tồn tại
            </div>
            <div className="text-sm text-slate-500">
              Nếu MSSV đã tồn tại, cập nhật họ tên, email, số điện thoại, giới
              tính và ngày sinh theo file import. Không đổi MSSV.
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={allowTransferClass}
            onChange={(event) =>
              onAllowTransferClassChange(event.target.checked)
            }
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
          />

          <div>
            <div className="text-sm font-medium text-slate-800">
              Cho phép chuyển lớp
            </div>
            <div className="text-sm text-slate-500">
              Chỉ bật khi sinh viên thực sự đã chuyển lớp hoặc chuyển ngành.
            </div>
          </div>
        </label>
      </div>
    </section>
  );
}