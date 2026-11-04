"use client";

import FilterRow from "@/components/shared/filters/FilterRow";
import useCohorts from "@/components/shared/useCohorts";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ClassOption = { id: number; code: string; cohort: number | null };

export default function AdminActivityRegistrationsFilter({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { cohorts } = useCohorts();
  const cohort = params.get("registrationCohort") ?? "";
  const selectedClass = params.get("registrationClassId") ?? "";
  const [keyword, setKeyword] = useState(params.get("registrationKeyword") ?? "");
  const visibleClasses = cohort ? classes.filter((item) => String(item.cohort) === cohort) : classes;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "registrationCohort") next.delete("registrationClassId");
    if (value) next.set(key, value); else next.delete(key);
    next.set("registrationPage", "1");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (keyword.trim() === (params.get("registrationKeyword") ?? "").trim()) return;
    const timer = window.setTimeout(() => update("registrationKeyword", keyword.trim()), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return <FilterRow className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="relative min-w-0"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm tên hoặc MSSV..." className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-500" /></div>
    <select aria-label="Khóa" value={cohort} onChange={(event) => update("registrationCohort", event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"><option value="">Tất cả khóa</option>{cohorts.map((value) => <option key={value} value={value}>Khóa {value}</option>)}</select>
    <select aria-label="Lớp" value={visibleClasses.some((item) => String(item.id) === selectedClass) ? selectedClass : ""} onChange={(event) => update("registrationClassId", event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"><option value="">Tất cả lớp</option>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
    <select aria-label="Trạng thái" value={params.get("registrationStatus") ?? ""} onChange={(event) => update("registrationStatus", event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"><option value="">Tất cả trạng thái</option><option value="unconfirmed">Chưa xác nhận</option><option value="attended">Đã điểm danh</option><option value="absent">Vắng</option></select>
  </FilterRow>;
}
