"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function ReportTabs({ activeTab }: { activeTab: "analysis" | "tables" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  function href(tab: "analysis" | "tables") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.set("page", "1");
    params.set("potentialPage", "1");
    return `${pathname}?${params.toString()}`;
  }
  return <nav className="flex w-fit border-b border-slate-200" aria-label="Nội dung báo cáo"><Link href={href("analysis")} className={`px-4 py-3 text-sm font-semibold transition ${activeTab === "analysis" ? "border-b-2 border-blue-700 text-blue-700" : "text-slate-500 hover:text-slate-800"}`}>Phân tích trực quan</Link><Link href={href("tables")} className={`px-4 py-3 text-sm font-semibold transition ${activeTab === "tables" ? "border-b-2 border-blue-700 text-blue-700" : "text-slate-500 hover:text-slate-800"}`}>Danh sách dữ liệu</Link></nav>;
}
