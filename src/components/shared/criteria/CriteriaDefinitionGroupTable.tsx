"use client";

import { useLayoutEffect, useRef, useState } from "react";
import CriteriaTable from "./CriteriaTable";

export type CriteriaDefinitionItem = {
  code: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  requiredCount: number;
  scoreMax: number;
  evidenceType: "auto" | "manual" | "both";
  activities: string[];
  conductScore: number | null;
};

export default function CriteriaDefinitionGroupTable({ items, officer }: { items: CriteriaDefinitionItem[]; officer: boolean }) {
  const pageSize = 5;
  const [requestedPage, setRequestedPage] = useState(1);
  const tableStart = useRef<HTMLDivElement>(null);
  const previousPage = useRef(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  useLayoutEffect(() => {
    if (page === previousPage.current) return;
    previousPage.current = page;
    tableStart.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [page]);
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize);
  const tableWidth = officer ? "82rem" : "76rem";

  return <div ref={tableStart} className="min-w-0 scroll-mt-4">
    <CriteriaTable containerClassName="rounded-none!" style={{ width: tableWidth, minWidth: tableWidth, tableLayout: "auto", counterReset: `system-table-row ${(page - 1) * pageSize}` }} className="criteria-definition-table [&_th]:whitespace-nowrap! [&_td]:whitespace-normal! [&_td_div]:whitespace-normal! [&_td]:[overflow-wrap:anywhere]">
      <colgroup>
        <col style={{ width: "4%", minWidth: "3rem" }} />
        <col style={{ width: "6%", minWidth: "4rem" }} />
        <col style={{ width: officer ? "43%" : "50%", minWidth: "30rem" }} />
        <col style={{ width: "10%", minWidth: "6.5rem" }} />
        {officer ? <col style={{ width: "7%", minWidth: "6.5rem" }} /> : null}
        <col style={{ width: "30%", minWidth: "15rem" }} />
      </colgroup>
      <thead className="bg-blue-800 text-white"><tr>
        <th className="px-2 py-3 text-sm">STT</th><th className="px-2 py-3 text-sm">Mã</th><th data-column-align="left" className="px-2 py-3 text-left text-sm">Tiêu chí</th><th className="px-2 py-3 text-sm">Bắt buộc</th>{officer ? <th className="px-2 py-3 text-sm">Điểm tối đa</th> : null}<th data-column-align="left" className="px-2 py-3 text-left text-sm">Hoạt động đáp ứng</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100">{visibleItems.map((item, index) => <tr key={item.code} className="even:bg-slate-50/60 hover:bg-blue-50/50">
        <td className="px-2 py-4 text-center text-sm">{(page - 1) * pageSize + index + 1}</td><td className="px-2 py-4 text-sm font-medium">{item.code}</td>
        <td data-column-align="left" className="px-2 py-4 text-left text-sm"><div className="whitespace-normal! break-words font-medium text-slate-900">{item.title}</div>{item.description ? <div className="mt-1 whitespace-normal! break-words text-slate-500">{item.description}</div> : null}</td>
        <td className="px-2 py-4 text-center"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.isRequired ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{item.isRequired ? "Có" : "Không"}</span></td>
        {officer ? <td className="px-2 py-4 text-center text-sm">{item.scoreMax}</td> : null}
        <td data-column-align="left" className="px-2 py-4 text-left text-sm text-slate-700"><div className="whitespace-normal! break-words">{item.activities.length ? item.activities.join(", ") : null}{item.activities.length && item.conductScore != null ? <br /> : null}{item.conductScore != null ? `Điểm rèn luyện tối thiểu: ${item.conductScore}` : null}{!item.activities.length && item.conductScore == null ? "Nộp minh chứng" : null}</div></td>
      </tr>)}</tbody>
    </CriteriaTable>
    {items.length > pageSize ? <div className="flex items-center justify-end gap-2 border-x border-b border-slate-200 px-3 py-2"><button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setRequestedPage(page - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300">‹</button><span className="whitespace-nowrap text-xs text-slate-500">Trang {page}/{totalPages}</span><button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setRequestedPage(page + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300">›</button></div> : null}
  </div>;
}
