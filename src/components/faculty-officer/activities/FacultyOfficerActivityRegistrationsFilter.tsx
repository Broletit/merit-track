"use client";
import CohortFilter from "@/components/shared/CohortFilter";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FacultyOfficerActivityClassOption } from "./types";
import FilterRow from "@/components/shared/filters/FilterRow";

export default function FacultyOfficerActivityRegistrationsFilter({
  classes,
}: {
  classes: FacultyOfficerActivityClassOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) params.set(key, value);
    else params.delete(key);

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (keyword.trim() === (searchParams.get("keyword") ?? "").trim()) return;
    const timer = setTimeout(() => {
      updateParam("keyword", keyword.trim());
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, searchParams]);

  return (
    <FilterRow className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,2fr)_repeat(3,minmax(155px,1fr))]">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo tên hoặc MSSV..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>
      <CohortFilter />
      <select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(event) => updateParam("status", event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="registered">Đã đăng ký</option>
        <option value="attended">Đã điểm danh</option>
        <option value="absent">Không tham gia</option>
      </select>
      <select
        value={classes.some(item=>String(item.id) === searchParams.get("classId")) ? searchParams.get("classId") ?? "" : ""}
        onChange={(event) => updateParam("classId", event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả lớp</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code}
          </option>
        ))}
      </select>
    </FilterRow>
  );
}
