"use client";
import { Children, Fragment, cloneElement, isValidElement, useRef, useState, type ReactElement, type ReactNode, type TableHTMLAttributes } from "react";
import DataTable from "./DataTable";
import TableResultsFooter from "./TableResultsFooter";
import { scrollToTable } from "@/lib/ui/scrollToTable";

type NodeProps = { children?: ReactNode; colSpan?: number };
function flatten(nodes: ReactNode): ReactNode[] {
  return Children.toArray(nodes).flatMap(node => isValidElement<NodeProps>(node) && node.type === Fragment ? flatten(node.props.children) : [node]);
}
export default function PaginatedTable({ children, containerClassName = '', resultLabel = 'bản ghi', showResultCount = true, paginate = true, ...props }: TableHTMLAttributes<HTMLTableElement> & { containerClassName?: string; resultLabel?: string; showResultCount?: boolean; paginate?: boolean }) {
  const [requestedPage, setPage] = useState(1);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const sections = Children.toArray(children);
  const body = sections.find(node => isValidElement<NodeProps>(node) && node.type === 'tbody') as ReactElement<NodeProps> | undefined;
  const rows = flatten(body?.props.children);
  const records = rows.filter(row => {
    if (!isValidElement<NodeProps>(row) || row.type !== 'tr') return false;
    const cells = Children.toArray(row.props.children);
    return !(cells.length === 1 && isValidElement<NodeProps>(cells[0]) && Number(cells[0].props.colSpan) > 1);
  });
  const totalPages = paginate ? Math.max(1, Math.ceil(records.length / 10)) : 1;
  const page = Math.min(requestedPage, totalPages);
  const start = paginate ? (page - 1) * 10 : 0;
  const visible = new Set(paginate ? records.slice(start, start + 10) : records);
  const visibleRows = records.length ? rows.filter(row => visible.has(row) || (page === totalPages && !records.includes(row))) : rows;
  const arrow = (direction: 'left' | 'right') => <button type="button" aria-label={direction === 'left' ? 'Trang trước' : 'Trang sau'}
    disabled={direction === 'left' ? page <= 1 : page >= totalPages}
    onClick={() => {
      setPage(page + (direction === 'left' ? -1 : 1));
      if (scrollContainer.current) requestAnimationFrame(() => scrollToTable(scrollContainer.current));
    }}
    className="inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-slate-700 disabled:text-slate-300 sm:w-10">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d={direction === 'left' ? 'M9 1 2 6l7 5Z' : 'M3 1l7 5-7 5Z'}/></svg>
  </button>;
  const spacing = containerClassName.split(/\s+/).filter(name => /^(?:\w+:)?mt-/.test(name)).join(' ');
  return <div data-table-frame className={'min-w-0 max-w-full ' + spacing}>
    <div ref={scrollContainer} className={'min-w-0 max-w-full overflow-x-auto rounded-none border border-slate-200 ' + containerClassName}>
      <DataTable {...props} style={{ ...props.style, counterReset: 'system-table-row ' + start }}>
        {sections.map(section => section === body && body ? cloneElement(body, {}, visibleRows) : section)}
      </DataTable>
    </div>
    {paginate ? <TableResultsFooter totalResults={showResultCount ? records.length : undefined} resultLabel={resultLabel}>
      {arrow('left')}<span className="whitespace-nowrap text-xs text-slate-500 sm:text-sm">Trang {page}/{totalPages}</span>{arrow('right')}
    </TableResultsFooter> : null}
  </div>;
}
