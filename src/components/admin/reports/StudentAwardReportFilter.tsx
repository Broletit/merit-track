"use client";
import CohortFilter from "@/components/shared/CohortFilter";
import FilterRow from "@/components/shared/filters/FilterRow";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

type EventOption = {
  id: number;
  title: string;
};

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

export default function StudentAwardReportFilter({
  events,
  classes,
}: {
  events: EventOption[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) params.set(key, value);
    else params.delete(key);

    params.delete("page");
    params.delete("criteriaPage");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const timer = setTimeout(() => updateParam("keyword", keyword.trim()), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <FilterRow className="grid gap-4 xl:grid-cols-4">
      <div className="filter-field"><label htmlFor="student-award-keyword">Tìm kiếm</label><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="student-award-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên hoặc MSSV" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div></div>
      <div className="filter-field"><label>Khóa</label><CohortFilter /></div>
      <div className="filter-field"><label htmlFor="student-award-report-event">Đợt xét</label><select
        id="student-award-report-event"
        defaultValue={searchParams.get("eventId") ?? ""}
        onChange={(event) => updateParam("eventId", event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả đợt xét trong kỳ</option>
        {events.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
      </div>

      <div className="filter-field"><label htmlFor="student-award-report-class">Lớp</label><select
        id="student-award-report-class"
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
      </div>
    </FilterRow>
  );
}
