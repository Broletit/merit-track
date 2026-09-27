"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CriteriaTemplatesFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(
    searchParams.get("keyword") ?? ""
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

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
      <div className="relative min-w-0 xl:col-span-2">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm tên bộ tiêu chuẩn..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>

      <select
        defaultValue={searchParams.get("forType") ?? ""}
        onChange={(event) =>
          updateParam("forType", event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả đối tượng</option>
        <option value="student">Sinh viên</option>
        <option value="officer">Cán bộ</option>
      </select>

      <select
        defaultValue={searchParams.get("sort") ?? "latest"}
        onChange={(event) =>
          updateParam("sort", event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="latest">Thời gian tạo gần nhất</option>
        <option value="oldest">Thời gian tạo xa nhất</option>
      </select>
    </div>
  );
}