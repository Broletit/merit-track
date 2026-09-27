import type { ReviewSubmissionSummary } from "./types";

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

export default function ReviewSubmissionSummaryCard({
  summary,
}: {
  summary: ReviewSubmissionSummary;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-sm font-medium text-slate-500">Sinh viên</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {summary.studentName}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-500">Lớp</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {summary.classCode} - {summary.className}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-500">Đợt xét</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {summary.eventTitle}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-500">Trạng thái</div>
          <div className="mt-2 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {mapStatusLabel(summary.status)}
          </div>
        </div>
      </div>
    </section>
  );
}