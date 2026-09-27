"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type EventOption = {
  id: number;
  title: string;
};

export default function AdminOfficerSubmissionsFilter({
  eventOptions,
}: {
  eventOptions: EventOption[];
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
    <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative min-w-0">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Cán bộ / MSSV..."
          className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>

      <select
        defaultValue={searchParams.get("eventId") ?? ""}
        onChange={(event) => updateParam("eventId", event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả đợt xét</option>

        {eventOptions.map((item) => (
          <option key={item.id} value={String(item.id)}>
            {item.title}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(event) => updateParam("status", event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="submitted_v1">Chờ duyệt</option>
        <option value="needs_revision_v1">Cần chỉnh sửa</option>
        <option value="passed">Đạt</option>
        <option value="failed">Không đạt</option>
        <option value="closed">Đã đóng</option>
      </select>

      <select
        defaultValue={searchParams.get("sort") ?? "latest"}
        onChange={(event) => updateParam("sort", event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="latest">Mới cập nhật</option>
        <option value="oldest">Cũ nhất</option>
        <option value="score_desc">Điểm cao nhất</option>
        <option value="score_asc">Điểm thấp nhất</option>
      </select>
    </div>
  );
}
