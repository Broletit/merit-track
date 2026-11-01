import type { ReactNode } from "react";

export default function TableResultsFooter({
  totalResults,
  resultLabel = "kết quả",
  children,
}: {
  totalResults?: number;
  resultLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div data-table-results-footer className="flex flex-nowrap items-center justify-between gap-2 px-2 py-3 sm:px-4">
      {totalResults !== undefined ? (
        <p className="shrink-0 whitespace-nowrap text-xs text-slate-500 sm:text-sm" role="status">
          <span className="hidden sm:inline">Tìm thấy </span><span className="font-semibold text-slate-700">{totalResults}</span> {resultLabel}
        </p>
      ) : null}
      {children ? <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1 whitespace-nowrap text-xs sm:gap-2 sm:text-sm">{children}</div> : null}
    </div>
  );
}
