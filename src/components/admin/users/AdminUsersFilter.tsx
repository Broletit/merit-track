"use client";
import useCohorts from "@/components/shared/useCohorts";
import FilterRow from "@/components/shared/filters/FilterRow";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ClassOption = {
  id: number;
  code: string;
  name: string;
  cohort: number | null;
};

export default function AdminUsersFilter({
  classes,
}: {
  classes: ClassOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { cohorts } = useCohorts();
  const cohort = searchParams.get("cohort") ?? "";
  const visibleClasses = cohort ? classes.filter(item => String(item.cohort) === cohort) : classes;
  const selectedClass = searchParams.get("classId") ?? "";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  function updateParam(key: string, value: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const params = new URLSearchParams(searchParams.toString());
    if (key === "cohort") params.delete("classId");
    if (key !== "keyword") {
      if (keyword.trim()) params.set("keyword", keyword.trim());
      else params.delete("keyword");
    }

    if (value) params.set(key, value);
    else params.delete(key);

    params.set("page", "1");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (keyword.trim() === (searchParams.get("keyword") ?? "").trim()) return;
    const timer = setTimeout(() => {
      updateParam("keyword", keyword.trim());
    }, 350);

    timerRef.current = timer;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <FilterRow className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-5">
      <div className="relative min-w-0">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm họ tên hoặc MSSV..."
          className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>
      <select aria-label="Lọc theo khóa" value={cohort} onChange={event => updateParam("cohort", event.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500">
        <option value="">Tất cả khóa</option>
        {cohorts.map(value => <option key={value} value={value}>Khóa {value}</option>)}
      </select>
      <select
        defaultValue={searchParams.get("role") ?? ""}
        onChange={(event) => updateParam("role", event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả vai trò</option>
        <option value="student">Sinh viên</option>
        <option value="class_officer">Cán bộ lớp</option>
        <option value="faculty_officer">Cán bộ khoa</option>
      </select>
      <select
        defaultValue={searchParams.get("active") ?? ""}
        onChange={(event) => updateParam("active", event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="1">Đang hoạt động</option>
        <option value="0">Đã vô hiệu hóa</option>
      </select>
      <select
        value={visibleClasses.some(item => String(item.id) === selectedClass) ? selectedClass : ""}
        onChange={(event) => updateParam("classId", event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả lớp</option>

        {visibleClasses.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code}
          </option>
        ))}
      </select>
    </FilterRow>
  );
}
