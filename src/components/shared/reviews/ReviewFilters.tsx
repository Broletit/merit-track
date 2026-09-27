"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ReviewFilters({
  classOptions = [],
  showStatus = true,
}: {
  classOptions?: string[];
  showStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  const gridClass = useMemo(() => {
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
  }, [showStatus, classOptions.length]);

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
    <div className={`grid w-full gap-4 md:grid-cols-2 ${gridClass}`}>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm sinh viên / MSSV / đợt xét..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>

      {showStatus ? (
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(event) => updateParam("status", event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="submitted_v1">Chờ duyệt vòng 1</option>
          <option value="needs_revision_v1">Cần chỉnh sửa</option>
          <option value="submitted_v2">Chờ duyệt vòng 2</option>
          <option value="passed">Đạt</option>
          <option value="failed">Không đạt</option>
          <option value="closed">Đã đóng</option>
        </select>
      ) : null}

      {classOptions.length > 0 ? (
        <select
          defaultValue={searchParams.get("class") ?? ""}
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

      <select
        defaultValue={searchParams.get("sort") ?? "latest"}
        onChange={(event) => updateParam("sort", event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="latest">Mới cập nhật</option>
        <option value="oldest">Cũ nhất</option>
      </select>
    </div>
  );
}