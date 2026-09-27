type TrendPoint = {
  label: string;
  primary: number;
  secondary?: number;
};

export default function TrendLineChart({
  items,
  primaryLabel,
  secondaryLabel,
}: {
  items: TrendPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
}) {
  if (items.length === 0) {
    return <EmptyChart />;
  }

  const width = Math.max(620, items.length * 86);
  const height = 260;
  const padding = { top: 22, right: 24, bottom: 48, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...items.flatMap((item) => [item.primary, item.secondary ?? 0]),
  );
  const x = (index: number) =>
    padding.left + (items.length === 1 ? plotWidth / 2 : (index / (items.length - 1)) * plotWidth);
  const y = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;
  const points = (key: "primary" | "secondary") =>
    items.map((item, index) => `${x(index)},${y(Number(item[key] ?? 0))}`).join(" ");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
        <Legend color="#1d4ed8" label={primaryLabel} />
        {secondaryLabel ? <Legend color="#16a34a" label={secondaryLabel} /> : null}
      </div>
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] min-w-[620px]" role="img" aria-label={`Xu hướng ${primaryLabel}${secondaryLabel ? ` và ${secondaryLabel}` : ""}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const gridY = padding.top + plotHeight * ratio;
            const value = Math.round(maxValue * (1 - ratio));
            return (
              <g key={ratio}>
                <line x1={padding.left} x2={width - padding.right} y1={gridY} y2={gridY} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={padding.left - 8} y={gridY + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{value}</text>
              </g>
            );
          })}
          <polyline fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points("primary")} />
          {secondaryLabel ? <polyline fill="none" stroke="#16a34a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points("secondary")} /> : null}
          {items.map((item, index) => (
            <g key={`${item.label}-${index}`}>
              <circle cx={x(index)} cy={y(item.primary)} r="4" fill="#1d4ed8"><title>{`${item.label}: ${primaryLabel} ${item.primary}`}</title></circle>
              {secondaryLabel ? <circle cx={x(index)} cy={y(item.secondary ?? 0)} r="4" fill="#16a34a"><title>{`${item.label}: ${secondaryLabel} ${item.secondary ?? 0}`}</title></circle> : null}
              <text x={x(index)} y={height - 18} textAnchor="middle" className="fill-slate-500 text-[10px]">{item.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}

function EmptyChart() {
  return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">Chưa có dữ liệu phù hợp.</div>;
}
