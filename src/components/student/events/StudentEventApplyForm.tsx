import type { StudentEventCriteriaItem } from "./types";
import { AutoCriteriaBadge, AutoCriteriaMessage } from "@/components/shared/criteria/AutoCriteriaAchievement";

export default function StudentEventApplyForm({
  criteria,
}: {
  eventId: number;
  criteria: StudentEventCriteriaItem[];
  canSubmit: boolean;
}) {
  const grouped = criteria.reduce<Record<string, StudentEventCriteriaItem[]>>(
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
      <p className="mt-1 text-sm text-slate-500">
        Xem nhanh tiêu chí đã đạt tự động và tiêu chí cần bổ sung minh chứng.
      </p>

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
                <div
                  key={item.code}
                  className="flex flex-wrap items-start justify-between gap-3 p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.code}. {item.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.description || "Chưa có mô tả"}
                    </div>

                    {item.autoPassed ? <AutoCriteriaMessage message={item.autoMessage} /> : null}
                  </div>

                  {item.autoPassed ? (
                    <AutoCriteriaBadge />
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Cần nộp minh chứng
                    </span>
                  )}
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
