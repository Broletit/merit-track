import Link from "next/link";
import ClassFilter from "@/components/shared/ClassFilter";
import type { FacultyOfficerSubmissionFilterOption } from "./types";

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

export default function FacultyOfficerSubmissionFilters({
  classes,
  statusOptions,
  selectedClassId,
  selectedStatus,
}: {
  classes: ClassOption[];
  statusOptions: FacultyOfficerSubmissionFilterOption[];
  selectedClassId?: number | null;
  selectedStatus?: string;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <form className="filter-row grid gap-4 md:grid-cols-3">
        <ClassFilter
          classes={classes}
          selectedClassId={selectedClassId}
          name="classId"
          label="Lọc theo lớp"
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-600">
            Trạng thái hồ sơ
          </label>
          <select
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="min-h-11 h-auto rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 py-2 max-w-full break-words"
          >
            Áp dụng
          </button>

          <Link
            href="/dashboard/faculty-officer/submissions"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Xóa lọc
          </Link>
        </div>
      </form>
    </section>
  );
}
