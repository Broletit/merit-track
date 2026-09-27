import type { ActivityCriteriaOption } from "./types";

export default function ActivityCriteriaBindingForm({
  criteriaOptions,
  defaultSelectedBindings = [],
}: {
  criteriaOptions: ActivityCriteriaOption[];
  defaultSelectedBindings?: string[];
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-semibold text-slate-900">
        Gắn tiêu chí tự động
      </h2>

      <div className="mt-5 grid gap-3">
        {criteriaOptions.length > 0 ? (
          criteriaOptions.map((item) => {
            const value = `${item.templateId}::${item.criteriaCode}`;

            return (
              <label
                key={value}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"
              >
                <input
                  type="checkbox"
                  name="criteriaBindings"
                  value={value}
                  defaultChecked={defaultSelectedBindings.includes(value)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    [{item.templateName}] {item.criteriaCode} - {item.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    Nhóm {item.groupCode}
                  </div>
                </div>
              </label>
            );
          })
        ) : (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
            Chưa có tiêu chí nào để gắn.
          </div>
        )}
      </div>
    </section>
  );
}