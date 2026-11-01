"use client";
import CohortFilter from "@/components/shared/CohortFilter";
import FilterRow from "@/components/shared/filters/FilterRow";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ReviewFilters({
  classOptions: providedClasses,
  showStatus = true,
  showRound = false,
  showSort = true,
  eventOptions = [],
  showEventFilter = true,
  searchPlaceholder = "Tìm sinh viên / MSSV / đợt xét...",
}: {
  classOptions?: string[];
  showStatus?: boolean;
  showRound?: boolean;
  showSort?: boolean;
  showEventFilter?: boolean;
  searchPlaceholder?: string;
  eventOptions?: Array<{ id: number; title: string }>;
}) {
  const classOptions = providedClasses ?? [];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  const gridClass = useMemo(() => {
    if (showRound && classOptions.length > 0) return "xl:grid-cols-5";
    if (eventOptions.length > 0 && showStatus && classOptions.length > 0) return "xl:grid-cols-[minmax(260px,2fr)_repeat(4,minmax(155px,1fr))]";
    if (eventOptions.length > 0 && !showRound && classOptions.length === 0) return "xl:grid-cols-3";
    if (showStatus && classOptions.length > 0) {
      return "lg:grid-cols-[minmax(320px,2fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)]";
    }

    if (showStatus && classOptions.length === 0) {
      return "lg:grid-cols-[minmax(320px,2fr)_minmax(180px,1fr)_minmax(180px,1fr)]";
    }

    if (!showStatus && classOptions.length > 0) {
      return "lg:grid-cols-[minmax(320px,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]";
    }

    return "lg:grid-cols-[minmax(320px,2fr)_minmax(220px,1fr)]";
  }, [showStatus, showRound, classOptions.length, eventOptions.length]);

  function updateParam(key: string, value: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const params = new URLSearchParams(searchParams.toString());
    if (!showEventFilter) params.delete("eventId");
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
  }, [keyword, searchParams]);

  return (
    <FilterRow className={`grid w-full gap-4 md:grid-cols-2 ${gridClass}`}>
      <div data-filter-label="Tìm kiếm" className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>
      <div className="filter-field"><label>Khóa</label><CohortFilter /></div>
      {showEventFilter && eventOptions.length > 0 ? (
        <select data-filter-label="Đợt xét" defaultValue={searchParams.get("eventId") ?? ""} onChange={(event) => updateParam("eventId", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500">
          <option value="">Tất cả đợt xét</option>
          {eventOptions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      ) : null}
      {showStatus ? (
        <select data-filter-label="Trạng thái hồ sơ"
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(event) => updateParam("status", event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="submitted_v1">Chờ duyệt vòng 1</option>
          <option value="needs_revision_v1">Cần chỉnh sửa</option>
          <option value="submitted_v2">Chờ duyệt vòng 2</option>
          <option value="passed">Đạt</option>
          <option value="failed">Không đạt</option>
        </select>
      ) : null}
      {showRound ? (
        <select data-filter-label="Vòng duyệt"
          defaultValue={searchParams.get("round") ?? ""}
          onChange={(event) => updateParam("round", event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        >
          <option value="">Tất cả vòng duyệt</option>
          <option value="1">Duyệt vòng 1</option>
          <option value="2">Duyệt vòng 2</option>
        </select>
      ) : null}
      {providedClasses !== undefined ? (
        <select data-filter-label="Lớp"
          value={classOptions.includes(searchParams.get("class") ?? "") ? searchParams.get("class") ?? "" : ""}
          onChange={(event) => updateParam("class", event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        >
          <option value="">Tất cả lớp</option>
          {classOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      ) : null}
      {showSort ? <select data-filter-label="Sắp xếp"
        defaultValue={searchParams.get("sort") ?? "latest"}
        onChange={(event) => updateParam("sort", event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="latest">Mới cập nhật</option>
        <option value="oldest">Cũ nhất</option>
      </select> : null}
    </FilterRow>
  );
}
