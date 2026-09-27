"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

export default function AdminUsersFilter({
  classes,
}: {
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
    <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        defaultValue={searchParams.get("classId") ?? ""}
        onChange={(event) => updateParam("classId", event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả lớp</option>

        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} - {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}