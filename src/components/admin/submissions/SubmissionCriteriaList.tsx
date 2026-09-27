import type { AdminCriteriaGroup } from "./types";

function getEvidenceLabel(evidenceType: string) {
  if (evidenceType === "auto") return "Tự động";
  if (evidenceType === "manual") return "Minh chứng thủ công";
  if (evidenceType === "both") return "Tự động + minh chứng";
  return evidenceType;
}

export default function SubmissionCriteriaList({
  groups,
}: {
  groups: AdminCriteriaGroup[];
}) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section
          key={group.code}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
        >
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
              <div
                key={item.code}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      {item.code}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {item.description}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {getEvidenceLabel(item.evidenceType)}
                    </span>

                    {item.autoPassed ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Đạt tự động
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Chưa đạt tự động
                      </span>
                    )}
                  </div>
                </div>

                {item.autoMessages.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {item.autoMessages.map((message, index) => (
                      <div
                        key={`${item.code}-${index}`}
                        className="rounded-xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200"
                      >
                        {message}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}