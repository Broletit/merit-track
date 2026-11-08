"use client";
import CohortFilter from "@/components/shared/CohortFilter";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterRow from "@/components/shared/filters/FilterRow";

type ClassOption = { id: number; code: string };

export default function EventSubmissionFilters({ classes: providedClasses, showCohort = true }: { classes?: ClassOption[]; showCohort?: boolean }) {
  const classes = providedClasses ?? [];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (keyword.trim() === (searchParams.get("keyword") ?? "").trim()) return;
    const timer = window.setTimeout(() => updateParam("keyword", keyword.trim()), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, searchParams]);

  return <FilterRow className={`grid w-full gap-3 md:grid-cols-2 ${classes.length || providedClasses !== undefined ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]" : showCohort ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}`}>
      <input data-filter-label="Tìm kiếm" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên sinh viên hoặc MSSV..." className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500" />
      {showCohort ? <div className="filter-field"><label>Khóa</label><CohortFilter /></div> : null}
      {providedClasses !== undefined ? <select value={searchParams.get("classId") ?? ""} onChange={(event) => updateParam("classId", event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="">Tất cả lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select> : null}
      <select value={searchParams.get("status") ?? ""} onChange={(event) => updateParam("status", event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="">Tất cả trạng thái</option><option value="submitted_v1">Chờ duyệt vòng 1</option><option value="submitted_v2">Chờ duyệt vòng 2</option><option value="needs_revision_v1">Cần chỉnh sửa</option><option value="needs_revision_v2">Cần chỉnh sửa</option><option value="passed">Đã đạt</option><option value="failed">Không đạt</option></select>
    </FilterRow>;
}
