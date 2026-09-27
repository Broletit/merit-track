export default function HorizontalBarChart({
  items,
  valueLabel = "lượt",
}: {
  items: Array<{
    label: string;
    subLabel?: string;
    value: number;
  }>;
  valueLabel?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        items.map((item) => {
          const percent = Math.round((item.value / max) * 100);

          return (
            <div key={`${item.label}-${item.subLabel ?? ""}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">
                    {item.label}
                  </div>
                  {item.subLabel ? (
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {item.subLabel}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 font-bold text-blue-700">
                  {item.value} {valueLabel}
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">
          Chưa có dữ liệu phù hợp.
        </div>
      )}
    </div>
  );
}