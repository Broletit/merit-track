import TableResultsFooter from "@/components/common/TableResultsFooter";
import PaginationArrow from "./PaginationArrow";

export default function Pagination({
  page,
  totalPages,
  totalResults,
  resultLabel,
  searchParams,
  paramName = "page",
}: {
  page: number;
  totalPages: number;
  totalResults?: number;
  resultLabel?: string;
  searchParams?: Record<string, string | number | undefined>;
  paramName?: string;
}) {

  function href(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });

    params.set(paramName, String(nextPage));

    return `?${params.toString()}`;
  }

  return (
    <TableResultsFooter totalResults={totalResults} resultLabel={resultLabel}>
      <PaginationArrow href={href(Math.max(1,page-1))} direction="left" disabled={page<=1}/>

      <div className="text-sm text-slate-500">
        Trang {page}/{totalPages}
      </div>

      <PaginationArrow href={href(Math.min(totalPages,page+1))} direction="right" disabled={page>=totalPages}/>
    </TableResultsFooter>
  );
}
