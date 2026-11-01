import DataTable from "./DataTable";
import type { TableHTMLAttributes } from "react";
export default function NumberedTable({ page = 1, style, ...props }: TableHTMLAttributes<HTMLTableElement> & { page?: number }) {
  const offset = (Number.isSafeInteger(page) ? Math.max(1, page) - 1 : 0) * 10;
  return <DataTable {...props} style={{ ...style, counterReset: 'system-table-row ' + offset }} />;
}
