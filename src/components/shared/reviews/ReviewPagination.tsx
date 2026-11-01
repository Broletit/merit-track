import TableResultsFooter from "@/components/common/TableResultsFooter";
import PaginationArrow from "@/components/common/PaginationArrow";

export default function ReviewPagination({
  page,
  totalPages,
  totalResults,
  resultLabel,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  totalResults?: number;
  resultLabel?: string;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {

  function buildLink(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    params.set("page", String(nextPage));

    return `${basePath}?${params.toString()}`;
  }

  return (
    <TableResultsFooter totalResults={totalResults} resultLabel={resultLabel}>
        <PaginationArrow href={buildLink(Math.max(1,page-1))} direction="left" disabled={page<=1}/>
        <div className="text-sm text-slate-500">Trang {page}/{totalPages}</div>
        <PaginationArrow href={buildLink(Math.min(totalPages,page+1))} direction="right" disabled={page>=totalPages}/>
    </TableResultsFooter>
  );
}
