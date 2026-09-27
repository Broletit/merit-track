type CriteriaItem = {
  code: string;
  label: string;
  groupLabel: string;
  value: number;
};

export default function AwardCriteriaBottleneckChart({
  items,
  totalSubmissions,
}: {
  items: CriteriaItem[];
  totalSubmissions: number;
}) {
  if (items.length === 0) {
    return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">Chưa có tiêu chí bị thiếu.</div>;
  }

  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-slate-100">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[minmax(280px,1.35fr)_minmax(300px,1.65fr)_90px] gap-4 border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Tiêu chuẩn / Tiêu chí</span>
          <span>Số hồ sơ còn thiếu</span>
          <span className="text-right">Tỷ lệ</span>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const rate = totalSubmissions > 0 ? Math.round((item.value / totalSubmissions) * 100) : 0;
            return (
              <div key={item.code} className="grid grid-cols-[minmax(280px,1.35fr)_minmax(300px,1.65fr)_90px] items-center gap-4 px-4 py-3">
                <div className="text-sm leading-5 text-slate-800">
                  <div className="font-semibold text-slate-700">{item.groupLabel}</div>
                  <div className="mt-1">
                    <span className="mr-2 font-semibold text-blue-700">{item.code}</span>
                    {item.label}
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_38px] items-center gap-2">
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(item.value / max) * 100}%` }} />
                  </div>
                  <span className="text-right text-sm font-semibold text-slate-700">{item.value}</span>
                </div>
                <span className="text-right text-base font-bold text-amber-700">{rate}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
