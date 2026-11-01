type ColumnItem = {
  label: string;
  subLabel?: string;
  value: number;
};

export default function TopScoreColumnChart({
  items,
  valueLabel = "điểm",
  emptyMessage = "Chưa có dữ liệu phù hợp.",
}: {
  items: ColumnItem[];
  valueLabel?: string;
  emptyMessage?: string;
}) {
  if (!items.length) {
    return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-100 shadow-md shadow-slate-200/60">{emptyMessage}</div>;
  }

  const maximum = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex h-[22rem] min-w-max items-end gap-3 border-b border-slate-200 px-2 pt-10">
        {items.map((item, index) => {
          const height = Math.max(28, Math.round((item.value / maximum) * 180));
          return (
            <div key={`${item.label}-${item.subLabel ?? ""}`} className="flex h-full w-24 shrink-0 flex-col justify-end">
              <div className="flex h-60 flex-col justify-end">
                <div className="mb-2 text-center text-sm font-bold text-blue-700" title={`${item.value} ${valueLabel}`}>{item.value}</div>
                <div className="group relative flex shrink-0 justify-center" style={{ height }}>
                  <div className="h-full w-14 rounded-t-xl bg-linear-to-t from-blue-800 to-sky-500 shadow-sm transition group-hover:from-blue-700 group-hover:to-sky-400" />
                  <span className="absolute top-2 text-xs font-bold text-white">#{index + 1}</span>
                </div>
              </div>
              <div className="mt-3 min-h-16 text-center">
                <div className="line-clamp-2 text-xs font-semibold leading-4 text-slate-700" title={item.label.replace(/^#\d+\s*/, "")}>{item.label.replace(/^#\d+\s*/, "")}</div>
                {item.subLabel ? <div className="mt-0.5 truncate text-[11px] text-slate-400" title={item.subLabel}>{item.subLabel}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
