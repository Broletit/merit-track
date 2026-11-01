import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import type { AdminSubmissionSummary } from "./types";

export default function SubmissionDecisionCard({
  summary,
}: {
  summary: AdminSubmissionSummary;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
      <h2 className="text-xl font-semibold text-slate-900">Ghi nhận quản trị</h2>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
        <div className="text-sm text-slate-600">
          Trạng thái hiện tại của hồ sơ:
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-900">
          <SubmissionStatusBadge status={summary.status} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Vai trò quản trị viên chỉ theo dõi, tổng hợp và thống kê tình hình hồ sơ toàn hệ thống.
        Việc duyệt vòng 1 thuộc cán bộ lớp, duyệt vòng 2 thuộc cán bộ khoa.
      </p>
    </section>
  );
}
