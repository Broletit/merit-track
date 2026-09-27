type Item = { label: string; primary: number; secondary: number };

export default function DualHorizontalBarChart({
  items,
  primaryLabel,
  secondaryLabel,
}: {
  items: Item[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  if (items.length === 0) return <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">Chưa có dữ liệu phù hợp.</div>;
  const max = Math.max(1, ...items.flatMap((item) => [item.primary, item.secondary]));
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
      <Legend color="#2563eb" label={primaryLabel}/><Legend color="#16a34a" label={secondaryLabel}/>
    </div>
    {items.map((item,index)=><div key={`${item.label}-${index}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="text-sm font-semibold leading-5 text-slate-800">{item.label}</div>
      <Bar label={primaryLabel} value={item.primary} width={item.primary/max*100} color="bg-blue-600" />
      <Bar label={secondaryLabel} value={item.secondary} width={item.secondary/max*100} color="bg-emerald-600" />
    </div>)}
  </div>;
}

function Bar({label,value,width,color}:{label:string;value:number;width:number;color:string}) {
  return <div className="mt-3 grid grid-cols-[72px_minmax(0,1fr)_36px] items-center gap-2 text-xs">
    <span className="text-slate-500">{label}</span>
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${color}`} style={{width:`${width}%`}}/></div>
    <span className="text-right font-semibold text-slate-700">{value}</span>
  </div>;
}
function Legend({color,label}:{color:string;label:string}) { return <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{backgroundColor:color}}/>{label}</span>; }
