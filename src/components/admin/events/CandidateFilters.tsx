"use client";
import CohortFilter from "@/components/shared/CohortFilter";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterRow from "@/components/shared/filters/FilterRow";

type Option = { value: string; label: string };

export default function CandidateFilters({
  classes,
  groups,
  initialKeyword,
  initialClass,
  initialGroup,
}: {
  classes: string[];
  groups: Option[];
  initialKeyword: string;
  initialClass: string;
  initialGroup: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(initialKeyword);
  const classCode = searchParams.get("classCode") ?? (searchParams.has("cohort") ? "" : initialClass);


  function navigate(values: { keyword?: string; classCode?: string; group?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextKeyword = values.keyword ?? keyword;
    const nextClass = values.classCode ?? classCode;
    const nextGroup = values.group ?? params.get("group") ?? "";

    if (nextKeyword.trim()) params.set("keyword", nextKeyword.trim());
    else params.delete("keyword");
    if (nextClass.trim()) params.set("classCode", nextClass.trim());
    else params.delete("classCode");
    if (nextGroup) params.set("group", nextGroup);
    else params.delete("group");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (keyword.trim() === (searchParams.get("keyword") ?? "").trim()) return;
    const timer = window.setTimeout(() => navigate({ keyword }), 350);
    return () => window.clearTimeout(timer);
    // Debounce only the keyword; dropdown changes apply immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, searchParams]);

  return (
    <FilterRow className="grid gap-3 lg:grid-cols-3">
      <label>
        <input
          aria-label="Tìm sinh viên"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Họ tên hoặc MSSV..."
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <CohortFilter />
      <label>
        <select aria-label="Lọc theo lớp" value={classCode}
          onChange={event=>navigate({classCode:event.target.value})}
          className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-blue-500">
          <option value="">Tất cả lớp</option>
          {classes.map(code=><option key={code} value={code}>{code}</option>)}
        </select>
      </label>
      <label>
        <select
          aria-label="Lọc theo phân loại"
          defaultValue={initialGroup}
          onChange={(event) => navigate({ group: event.target.value })}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tất cả phân loại</option>
          <optgroup label="Hồ sơ đã tham gia xét">
            {groups.filter((item) => item.value.startsWith("official_")).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </optgroup>
          <optgroup label="Sinh viên chưa tham gia xét">
            {groups.filter((item) => item.value.startsWith("candidate_")).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </optgroup>
        </select>
      </label>
    </FilterRow>
  );
}
