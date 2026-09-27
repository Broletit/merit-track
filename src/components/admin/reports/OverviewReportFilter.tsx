"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TermOption = {
  id: number;
  name: string;
  isActive?: boolean;
};

export default function OverviewReportFilter({
  terms,
  selectedTermId,
}: {
  terms: TermOption[];
  selectedTermId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function changeTerm(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("termId", value);
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            Phạm vi báo cáo
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Chọn học kỳ để xem dữ liệu tổng quan.
          </div>
        </div>

        <div className="w-full min-w-0 sm:w-65 sm:shrink-0">
          <select
            value={
              searchParams.get("termId") ?? String(selectedTermId)
            }
            onChange={(event) => changeTerm(event.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
          >
            {terms.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
                {item.isActive ? " - hiện hành" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}