"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CheckinLogActivityOption } from "./types";

export default function FacultyOfficerAttendanceLogsFilter({
  activities,
}: {
  activities: CheckinLogActivityOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("logKeyword") ?? "");

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) params.set(key, value);
    else params.delete(key);

    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateParam("logKeyword", keyword.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, updateParam]);

  return (
    <div >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm tên hoặc MSSV..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
          />
        </div>

        <select
          defaultValue={searchParams.get("logActivityId") ?? ""}
          onChange={(event) => updateParam("logActivityId", event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        >
          <option value="">Tất cả hoạt động</option>
          {activities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>

        <select
          defaultValue={searchParams.get("logResult") ?? ""}
          onChange={(event) => updateParam("logResult", event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        >
          <option value="">Tất cả kết quả</option>
          <option value="success">Thành công</option>
          <option value="duplicate">Trùng</option>
          <option value="invalid">Không hợp lệ</option>
          <option value="out_of_window">Ngoài thời gian</option>
          <option value="not_registered">Chưa đăng ký</option>
        </select>

        <input
          type="date"
          defaultValue={searchParams.get("logFrom") ?? ""}
          onChange={(event) => updateParam("logFrom", event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        />

        <input
          type="date"
          defaultValue={searchParams.get("logTo") ?? ""}
          onChange={(event) => updateParam("logTo", event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>
    </div>
  );
}
