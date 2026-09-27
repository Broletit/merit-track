type ActivityRate = {
  label: string;
  registrations: number;
  attended: number;
};

export default function ActivityAttendanceRateChart({ items }: { items: ActivityRate[] }) {
  if (items.length === 0) {
    return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">Chưa có dữ liệu phù hợp.</div>;
  }

  const max = Math.max(1, ...items.flatMap((item) => [item.registrations, item.attended]));

  return (
    <div className="max-h-[460px] overflow-auto rounded-xl ring-1 ring-slate-100">
      <div className="min-w-[760px]">
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(220px,1.15fr)_minmax(320px,1.85fr)_72px] gap-3 border-b border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Hoạt động</span>
          <span>Số lượt</span>
          <span className="text-right">Tỷ lệ</span>
        </div>

        <div className="divide-y divide-slate-100">
      {items.map((item, index) => {
        const rate = item.registrations > 0
          ? Math.round((item.attended / item.registrations) * 100)
          : 0;

        return (
          <div key={`${item.label}-${index}`} className="grid grid-cols-[minmax(220px,1.15fr)_minmax(320px,1.85fr)_72px] items-center gap-3 px-3 py-3">
            <div className="text-sm font-semibold leading-5 text-slate-800">{item.label}</div>

            <div className="space-y-1.5">
              <Bar label="Đăng ký" value={item.registrations} width={(item.registrations / max) * 100} color="bg-blue-600" />
              <Bar label="Tham dự" value={item.attended} width={(item.attended / max) * 100} color="bg-emerald-600" />
            </div>

            <div className={`text-right text-base font-bold ${rate >= 70 ? "text-emerald-700" : rate >= 40 ? "text-amber-600" : "text-rose-600"}`}>
              {rate}%
            </div>
          </div>
        );
      })}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, width, color }: { label: string; value: number; width: number; color: string }) {
  return (
    <div className="grid grid-cols-[54px_minmax(0,1fr)_32px] items-center gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-semibold text-slate-700">{value}</span>
    </div>
  );
}
