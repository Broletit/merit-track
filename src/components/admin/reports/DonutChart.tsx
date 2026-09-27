type DonutItem = {
  label: string;
  value: number;
  className: string;
};

export default function DonutChart({ items, centerLabel = "hồ sơ" }: { items: DonutItem[]; centerLabel?: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let current = 0;

  const gradient =
    total > 0
      ? items
          .map((item) => {
            const start = current;
            const end = current + (item.value / total) * 100;
            current = end;
            return `${item.className} ${start}% ${end}%`;
          })
          .join(", ")
      : "#e2e8f0 0% 100%";

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div
        className="relative h-44 w-44 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white">
          <div className="text-3xl font-bold text-slate-900">{total}</div>
          <div className="text-xs text-slate-500">{centerLabel}</div>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {items.map((item) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.className }}
                />
                <span className="text-sm font-medium text-slate-700">
                  {item.label}
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-900">
                {item.value} · {percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
