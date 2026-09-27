import type { AdminSubmissionSummary } from "./types";

function mapStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Nháp";
    case "submitted_v1":
      return "Chờ duyệt vòng 1";
    case "needs_revision_v1":
      return "Cần bổ sung";
    case "submitted_v2":
      return "Chờ duyệt vòng 2";
    case "passed":
      return "Đạt";
    case "failed":
      return "Không đạt";
    case "closed":
      return "Đã đóng";
    default:
      return status;
  }
}

export default function SubmissionDecisionCard({
  summary,
}: {
  summary: AdminSubmissionSummary;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">Ghi nhận quản trị</h2>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="text-sm text-slate-600">
          Trạng thái hiện tại của hồ sơ:
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-900">
          {mapStatusLabel(summary.status)}
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Vai trò quản trị viên chỉ theo dõi, tổng hợp và thống kê tình hình hồ sơ toàn hệ thống.
        Việc duyệt vòng 1 thuộc cán bộ lớp, duyệt vòng 2 thuộc cán bộ khoa.
      </p>
    </section>
  );
}