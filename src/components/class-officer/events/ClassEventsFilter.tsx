"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ClassEventsFilter() {
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
    const timer = setTimeout(() => updateParam("keyword", keyword.trim()), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return (
    <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-[minmax(320px,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm tên đợt xét..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>

      <select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(event) => updateParam("status", event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả hồ sơ</option>
        <option value="submitted_v1">Chờ duyệt vòng 1</option>
        <option value="submitted_v2">Đã chuyển vòng 2</option>
        <option value="needs_revision_v1">Cần chỉnh sửa</option>
        <option value="passed">Đạt</option>
        <option value="failed">Không đạt</option>
      </select>

      <select
        defaultValue={searchParams.get("phase") ?? ""}
        onChange={(event) => updateParam("phase", event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả tình trạng nhận</option>
        <option value="not_open">Chưa mở nộp</option>
        <option value="accepting">Đang nhận hồ sơ</option>
        <option value="late_allowed">Đang nhận hồ sơ trễ</option>
        <option value="expired">Đã hết hạn nộp</option>
      </select>
    </div>
  );
}
