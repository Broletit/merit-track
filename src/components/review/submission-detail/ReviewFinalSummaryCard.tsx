import type { ReviewFinalSummary } from "./types";

export default function ReviewFinalSummaryCard({
  summary,
}: {
  summary: ReviewFinalSummary;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        Kết quả tổng hợp
      </h2>

      <div className="mt-6 space-y-3">
        {summary.groups.map((group) => (
          <div
            key={group.groupCode}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
          >
            <div className="text-sm font-medium text-slate-700">
              {group.groupCode}
            </div>
            <div className="text-sm text-slate-700">
              {group.passed ? "Đạt" : "Chưa đạt"} ({group.passedCount}/{group.required})
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {summary.submissionPassed ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">
            Hồ sơ hiện đang đủ điều kiện theo kết quả tự động/tổng hợp.
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-700">
            Hồ sơ hiện chưa đủ điều kiện theo kết quả tự động/tổng hợp.
          </div>
        )}
      </div>
    </section>
  );
}