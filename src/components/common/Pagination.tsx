import Link from "next/link";

export default function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams?: Record<string, string | number | undefined>;
}) {
  if (totalPages <= 1) return null;

  function href(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });

    params.set("page", String(nextPage));

    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={href(Math.max(1, page - 1))}
        className={`rounded-xl border border-slate-200 px-4 py-2 text-sm ${
          page <= 1
            ? "pointer-events-none bg-slate-50 text-slate-300"
            : "bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Trước
      </Link>

      <div className="text-sm text-slate-500">
        Trang {page}/{totalPages}
      </div>

      <Link
        href={href(Math.min(totalPages, page + 1))}
        className={`rounded-xl border border-slate-200 px-4 py-2 text-sm ${
          page >= totalPages
            ? "pointer-events-none bg-slate-50 text-slate-300"
            : "bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Sau
      </Link>
    </div>
  );
}