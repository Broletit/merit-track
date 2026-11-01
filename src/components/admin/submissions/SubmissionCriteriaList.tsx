import statCardStyles from "@/components/shared/statistics/StatCard.module.css";
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
          className={[statCardStyles.card, "min-w-0"].join(" ")}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className={statCardStyles.label}>{group.code}</div>
              <h2 className={[statCardStyles.value, "text-slate-900"].join(" ")}>
                {group.title}
              </h2>
              <p className={[statCardStyles.label, "mt-2"].join(" ")}>{group.description}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className={[statCardStyles.label, "rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"].join(" ")}>
                Đạt {group.passedCount}/{group.minRequired}
              </div>

              {group.passed ? (
                <span className={[statCardStyles.label, "rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700"].join(" ")}>
                  Tiêu chuẩn đạt
                </span>
              ) : (
                <span className={[statCardStyles.label, "rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700"].join(" ")}>
                  Tiêu chuẩn chưa đạt
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {group.items.map((item) => (
              <div
                key={item.code}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-md shadow-slate-200/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className={statCardStyles.label}>
                      {item.code}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className={[statCardStyles.label, "mt-2"].join(" ")}>
                      {item.description}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={[statCardStyles.label, "rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"].join(" ")}>
                      {getEvidenceLabel(item.evidenceType)}
                    </span>

                    {item.autoPassed ? (
                      <span className={[statCardStyles.label, "rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700"].join(" ")}>Đã đạt</span>
                    ) : (
                      <span className={[statCardStyles.label, "rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700"].join(" ")}>
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
                        className={[statCardStyles.label, "rounded-none bg-white px-4 py-3 ring-1 ring-slate-200 shadow-md shadow-slate-200/60"].join(" ")}
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