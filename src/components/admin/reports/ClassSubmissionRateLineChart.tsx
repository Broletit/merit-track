type ClassPoint = {
  label: string;
  value: number;
  submittedStudents: number;
  totalStudents: number;
  submissions: number;
};

export default function ClassSubmissionRateLineChart({ items }: { items: ClassPoint[] }) {
  if (items.length === 0) {
    return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">Chưa có dữ liệu phù hợp.</div>;
  }

  const width = Math.max(760, items.length * 105);
  const height = 290;
  const padding = { top: 22, right: 72, bottom: 68, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index: number) => padding.left + (items.length === 1 ? plotWidth / 2 : (index / (items.length - 1)) * plotWidth);
  const y = (value: number) => padding.top + plotHeight - Math.max(0, Math.min(100, value)) / 100 * plotHeight;
  const points = items.map((item, index) => `${x(index)},${y(item.value)}`).join(" ");

  return (
    <div className="overflow-x-auto pb-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[290px] min-w-[760px]" role="img" aria-label="Tỷ lệ sinh viên đã nộp hồ sơ theo lớp">
        <text transform={`translate(17 ${padding.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold">Sinh viên đã nộp (%)</text>
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={padding.left - 8} y={y(value) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{value}%</text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {items.map((item, index) => (
          <g key={item.label}>
            <circle cx={x(index)} cy={y(item.value)} r="4.5" fill="#1d4ed8" stroke="white" strokeWidth="2">
              <title>{`${item.label}: ${item.submittedStudents}/${item.totalStudents} sinh viên · ${item.submissions} hồ sơ · ${item.value}%`}</title>
            </circle>
            <text transform={`translate(${x(index)} ${padding.top + plotHeight + 17}) rotate(-38)`} textAnchor="end" className="fill-slate-500 text-[10px]">{item.label}</text>
          </g>
        ))}
        <text x={width - padding.right} y={height - 7} textAnchor="end" className="fill-slate-500 text-[11px] font-semibold">Lớp</text>
      </svg>
    </div>
  );
}
