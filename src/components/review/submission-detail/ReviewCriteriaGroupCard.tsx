import ReviewCriteriaItemRow from "./ReviewCriteriaItemRow";
import type { ReviewCriteriaGroup } from "./types";

export default function ReviewCriteriaGroupCard({
  group,
}: {
  group: ReviewCriteriaGroup;
}) {
  return (
    <section className="min-w-0 rounded-3xl bg-linear-to-br from-white via-blue-50 to-sky-100 p-6 shadow-md ring-1 ring-blue-100 transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{group.code}</div>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {group.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{group.description}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 shadow-md shadow-slate-200/60">
            Đạt {group.passedCount}/{group.minRequired}
          </div>

          {group.passed ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Tiêu chuẩn đạt
            </span>
          ) : (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              Tiêu chuẩn chưa đạt
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {group.items.map((item) => (
          <ReviewCriteriaItemRow key={item.code} item={item} />
        ))}
      </div>
    </section>
  );
}