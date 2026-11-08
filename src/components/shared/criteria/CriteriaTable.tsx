import type { TableHTMLAttributes } from "react";
import DataTable from "@/components/common/DataTable";

export default function CriteriaTable({ children, containerClassName = "", ...props }: TableHTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  const spacing = containerClassName.split(/\s+/).filter(name => /^(?:\w+:)?mt-/.test(name)).join(" ");
  return <div data-table-frame className={"min-w-0 w-full max-w-full " + spacing}>
    <div className={"min-w-0 w-full max-w-full overflow-x-auto rounded-none border border-slate-200 " + containerClassName}>
      <DataTable {...props} style={{ ...props.style, counterReset: props.style?.counterReset ?? "system-table-row 0" }}>{children}</DataTable>
    </div>
  </div>;
}
