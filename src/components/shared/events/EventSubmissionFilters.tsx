"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ClassOption = { id: number; code: string };

export default function EventSubmissionFilters({ classes = [] }: { classes?: ClassOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => updateParam("keyword", keyword.trim()), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  return <div className={`grid gap-3 md:grid-cols-2 ${classes.length ? "xl:grid-cols-[minmax(0,1fr)_180px_220px]" : "xl:grid-cols-[minmax(0,1fr)_240px]"}`}>
    <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên sinh viên hoặc MSSV..." className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500" />
    {classes.length ? <select value={searchParams.get("classId") ?? ""} onChange={(event) => updateParam("classId", event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="">Tất cả lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select> : null}
    <select value={searchParams.get("status") ?? ""} onChange={(event) => updateParam("status", event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"><option value="">Tất cả trạng thái</option><option value="submitted_v1">Chờ duyệt vòng 1</option><option value="submitted_v2">Chờ duyệt vòng 2</option><option value="needs_revision_v1">Cần chỉnh sửa</option><option value="needs_revision_v2">Cần chỉnh sửa</option><option value="passed">Đã đạt</option><option value="failed">Không đạt</option></select>
  </div>;
}
