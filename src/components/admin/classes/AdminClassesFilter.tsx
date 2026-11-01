"use client";
import FilterRow from "@/components/shared/filters/FilterRow";
import CohortFilter from "@/components/shared/CohortFilter";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function AdminClassesFilter({ majors }: { majors: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "keyword") params.delete("classId");
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    if (params.toString() === searchParams.toString()) return;
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (keyword.trim() === (searchParams.get("keyword") ?? "")) return;
    const timer = setTimeout(() => updateParam("keyword", keyword.trim()), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <FilterRow className="classes-filter-row grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="relative min-w-0">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm mã hoặc tên lớp..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>
      <CohortFilter />
      <select
        defaultValue={searchParams.get("officerStatus") ?? ""}
        onChange={(event) => updateParam("officerStatus", event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả tình trạng cán bộ</option>
        <option value="vacant">Chưa có CB lớp</option>
        <option value="partial">Chưa đạt số lượng CB tối đa</option>
        <option value="full">Đạt số lượng CB tối đa</option>
      </select>
      <select
        defaultValue={searchParams.get("major") ?? ""}
        onChange={(event) => updateParam("major", event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả ngành</option>
        {majors.map((major) => <option key={major} value={major}>{major}</option>)}
      </select>
    </FilterRow>
  );
}
