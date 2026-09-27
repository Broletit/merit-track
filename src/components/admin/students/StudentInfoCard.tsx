import type { StudentDetailSummary } from "./types";

export default function StudentInfoCard({
  student,
}: {
  student: StudentDetailSummary;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Thông tin tài khoản</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">MSSV</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{student.mssv}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Họ tên</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{student.full_name}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Email</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{student.email || "-"}</div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-sm text-slate-500">Lớp hiện tại</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {student.class_code} - {student.class_name}
          </div>
        </div>
      </div>
    </section>
  );
}