import ReviewCriteriaItemRow from "./ReviewCriteriaItemRow";
import type { ReviewCriteriaGroup } from "./types";

export default function ReviewCriteriaGroupCard({
  group,
}: {
  group: ReviewCriteriaGroup;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{group.code}</div>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {group.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{group.description}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
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