"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import TableResultsFooter from "@/components/common/TableResultsFooter";

const GROUPS_PER_PAGE = 3;

export default function CriteriaGroupsPagination({ children, className = "", totalGroups }: { children: ReactNode; className?: string; totalGroups: number }) {
  const groups = Children.toArray(children);
  const [requestedPage, setPage] = useState(1);
  const container = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(totalGroups / GROUPS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * GROUPS_PER_PAGE;
  function changePage(next: number) {
    setPage(next);
    requestAnimationFrame(() => container.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    }));
  }
  const arrow = (direction: "left" | "right") => <button type="button"
    aria-label={direction === "left" ? "Trang trước" : "Trang sau"}
    disabled={direction === "left" ? page <= 1 : page >= totalPages}
    onClick={() => changePage(page + (direction === "left" ? -1 : 1))}
    className="inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-slate-700 disabled:text-slate-300 sm:w-10">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d={direction === "left" ? "M9 1 2 6l7 5Z" : "M3 1l7 5-7 5Z"}/></svg>
  </button>;
  return <div ref={container} className={"min-w-0 scroll-mt-4 " + className}>
    <div className="space-y-8">{totalGroups ? groups.slice(start, start + GROUPS_PER_PAGE) : groups}</div>
    {totalGroups > 0 ? <TableResultsFooter totalResults={totalGroups} resultLabel="tiêu chuẩn">
      {arrow("left")}<span className="whitespace-nowrap text-xs text-slate-500 sm:text-sm">Trang {page}/{totalPages}</span>{arrow("right")}
    </TableResultsFooter> : null}
  </div>;
}
