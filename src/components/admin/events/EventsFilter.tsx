"use client";

import { resolveEventListPhase } from "@/lib/events/eventSubmissionPhase";
import FilterRow from "@/components/shared/filters/FilterRow";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function EventsFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(
    searchParams.get("keyword") ?? ""
  );

  const searchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const phase=resolveEventListPhase(searchParams.get("phase"),searchParams.get("status"));

  function updateParam(key: string, value: string) {
    if(searchTimer.current)clearTimeout(searchTimer.current);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cohort");
    params.delete("status");
    if(key!=="keyword"){if(keyword.trim())params.set("keyword",keyword.trim());else params.delete("keyword");}
    if(key!=="phase"&&phase)params.set("phase",phase);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.set("page", "1");

    router.replace(`${pathname}?${params.toString()}`, {scroll:false});
  }

  useEffect(() => {
    if(keyword.trim()===(searchParams.get("keyword")??"").trim())return;
    searchTimer.current = setTimeout(() => {
      updateParam("keyword", keyword.trim());
    }, 350);

    return () => {if(searchTimer.current)clearTimeout(searchTimer.current);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <FilterRow className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="relative min-w-0">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm tên đợt xét..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>
      <select
        aria-label="Lọc trạng thái đợt xét" value={phase}
        onChange={(event) => updateParam("phase", event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả trạng thái đợt xét</option>
        <option value="not_published">Nháp</option>
        <option value="not_open">Chưa mở nhận hồ sơ</option>
        <option value="accepting">Đang nhận hồ sơ</option>
        <option value="expired">Đã hết hạn</option>
        <option value="closed">Đã đóng</option>
      </select>

      <select
        defaultValue={searchParams.get("type") ?? ""}
        onChange={(event) =>
          updateParam("type", event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả đối tượng</option>
        <option value="student">Sinh viên</option>
        <option value="officer">Cán bộ</option>
      </select>
    </FilterRow>
  );
}
