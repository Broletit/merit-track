import SubmissionStatusBadge from "@/components/shared/submissions/SubmissionStatusBadge";
import type { ReviewSubmissionSummary } from "./types";

export default function ReviewSubmissionSummaryCard({
  summary,
}: {
  summary: ReviewSubmissionSummary;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100 shadow-slate-200/60">
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
          <div className="mt-2">
            <SubmissionStatusBadge status={summary.status} />
          </div>
        </div>
      </div>
    </section>
  );
}
