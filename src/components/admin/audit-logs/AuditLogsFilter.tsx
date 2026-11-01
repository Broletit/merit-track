"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
export default function AuditLogsFilter({ actions }: { actions: Array<{value: string; label: string}> }) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const [target, setTarget] = useState(params.get("target") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function update(key: string, value: string) {
    if (timer.current) clearTimeout(timer.current);
    const next = new URLSearchParams();
    for (const name of ["termId", "action", "dateFrom", "dateTo"]) {
      const existing = params.get(name); if (existing) next.set(name, existing);
    }
    if (target.trim()) next.set("target", target.trim());
    if (value) next.set(key, value); else next.delete(key);
    next.set("page", "1");
    router.replace(pathname + "?" + next.toString(), { scroll: false });
  }
  useEffect(() => {
    if (target.trim() === (params.get("target") ?? "").trim()) return;
    timer.current = setTimeout(() => update("target", target.trim()), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  const inputClass = "mt-1.5 block h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500";
  const labelClass = "min-w-0 text-xs font-semibold text-slate-500";
  return <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    <label className={labelClass}>Đối tượng bị tác động<input value={target} onChange={event=>setTarget(event.target.value)} placeholder="Tìm họ tên hoặc MSSV..." className={inputClass}/></label>
    <label className={labelClass}>Loại thao tác<select value={params.get("action") ?? ""} onChange={event=>update("action",event.target.value)} className={inputClass}><option value="">Tất cả loại thao tác</option>{actions.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    <label className={labelClass}>Từ ngày<input type="date" value={params.get("dateFrom") ?? ""} onChange={event=>update("dateFrom",event.target.value)} className={inputClass}/></label>
    <label className={labelClass}>Đến ngày<input type="date" value={params.get("dateTo") ?? ""} onChange={event=>update("dateTo",event.target.value)} className={inputClass}/></label>
  </div>;
}
