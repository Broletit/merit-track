import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ReviewPagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function buildLink(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    params.set("page", String(nextPage));

    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm text-slate-500">
        Trang {page} / {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={buildLink(Math.max(1, page - 1))}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            page <= 1
              ? "pointer-events-none border-slate-100 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <ChevronLeft size={16} />
          Trước
        </Link>

        <Link
          href={buildLink(Math.min(totalPages, page + 1))}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            page >= totalPages
              ? "pointer-events-none border-slate-100 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Sau
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}