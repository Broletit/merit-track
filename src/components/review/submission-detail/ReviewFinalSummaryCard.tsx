import type { ReviewFinalSummary } from "./types";

export default function ReviewFinalSummaryCard({
  summary,
}: {
  summary: ReviewFinalSummary;
}) {
  return (
    <section className="min-w-0 rounded-3xl bg-linear-to-br from-white via-blue-50 to-sky-100 p-6 shadow-md ring-1 ring-blue-100 transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/60">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        Kết quả tổng hợp
      </h2>

      <div className="mt-6 space-y-3">
        {summary.groups.map((group) => (
          <div
            key={group.groupCode}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"
          >
            <div className="text-sm font-medium text-slate-700">
              {group.groupCode}
            </div>
            <div className="text-sm text-slate-700">
              {group.passed ? "Đạt" : "Chưa đạt"} · Đã đạt {group.passedCount} tiêu chí, yêu cầu tối thiểu {group.required}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {summary.submissionPassed ? (
          <div className="rounded-none bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 shadow-md shadow-slate-200/60">
            Hồ sơ hiện đang đủ điều kiện theo kết quả tự động/tổng hợp.
          </div>
        ) : (
          <div className="rounded-none bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-700 shadow-md shadow-slate-200/60">
            Hồ sơ hiện chưa đủ điều kiện theo kết quả tự động/tổng hợp.
          </div>
        )}
      </div>
    </section>
  );
}