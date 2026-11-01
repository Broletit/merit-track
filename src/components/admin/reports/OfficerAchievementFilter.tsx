"use client";
import CohortFilter from "@/components/shared/CohortFilter";
import FilterRow from "@/components/shared/filters/FilterRow";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type EventOption = {
  id: number;
  title: string;
};

export default function OfficerAchievementFilter({
  events,
}: {
  events: EventOption[];
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
    params.set("potentialPage", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      updateParam("keyword", keyword.trim());
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <FilterRow className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="filter-field">
        <label htmlFor="officer-achievement-keyword">Tìm kiếm</label>
        <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          id="officer-achievement-keyword"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tên hoặc MSSV"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
        </div>
      </div>
      <div className="filter-field"><label htmlFor="officer-achievement-assessment">Đánh giá</label><select id="officer-achievement-assessment" defaultValue={searchParams.get("assessment") ?? ""} onChange={(event) => updateParam("assessment", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"><option value="">Tất cả đánh giá</option><option value="ready">Đủ điều kiện</option><option value="potential">Tiềm năng</option></select></div>
      <div className="filter-field"><label>Khóa</label><CohortFilter /></div>
      <div className="filter-field"><label htmlFor="officer-achievement-event">Đợt xét</label><select
        id="officer-achievement-event"
        defaultValue={searchParams.get("eventId") ?? ""}
        onChange={(event) => updateParam("eventId", event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả đợt xét cán bộ</option>
        {events.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
      </div>
    </FilterRow>
  );
}
