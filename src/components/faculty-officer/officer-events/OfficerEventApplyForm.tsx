import type { OfficerEventCriteriaItem } from "./types";

export default function OfficerEventApplyForm({
  criteria,
}: {
  eventId: number;
  criteria: OfficerEventCriteriaItem[];
  canSubmit: boolean;
}) {
  const grouped = criteria.reduce<Record<string, OfficerEventCriteriaItem[]>>(
    (acc, item) => {
      const key = `${item.groupCode}. ${item.groupTitle}`;
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-xl font-semibold text-slate-900">
        Tiêu chuẩn / tiêu chí
      </h2>

      <div className="mt-5 space-y-5">
        {Object.entries(grouped).map(([groupTitle, items]) => (
          <div
            key={groupTitle}
            className="overflow-hidden rounded-2xl border border-slate-200"
          >
            <div className="bg-slate-50 px-5 py-4">
              <h3 className="font-semibold text-slate-900">{groupTitle}</h3>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.code} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.code}. {item.title}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {item.description || "Chưa có mô tả"}
                    </div>

                  </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
                      <span
                        className={
                          item.isRequired
                            ? "rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700"
                            : "rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600"
                        }
                      >
                        {item.isRequired ? "Bắt buộc" : "Không bắt buộc"}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                        Tối đa {item.scoreMax} điểm
                      </span>
                      {item.autoPassed ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                          +{item.scoreMax} điểm
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                          Chưa đạt
                        </span>
                      )}
                    </div>

                  </div>

                  {item.autoPassed ? (
                    <div className="mt-2 text-xs text-emerald-700">
                      Đạt tự động từ hoạt động: {item.matchedActivityTitles.join(", ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}

        {criteria.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Đợt xét này chưa có tiêu chuẩn / tiêu chí.
          </div>
        ) : null}
      </div>
    </section>
  );
}
