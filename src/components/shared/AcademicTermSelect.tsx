"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AcademicTermView } from "@/server/academic-terms/getAcademicTermForView";

export default function AcademicTermSelect({
  terms,
  selectedTermId,
  variant = "card",
}: {
  terms: AcademicTermView[];
  selectedTermId: number;
  variant?: "card" | "header";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function changeTerm(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("termId", value);
    params.delete("eventId");
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  const selectedTerm = terms.find((item) => item.id === selectedTermId);
  const selectedLabel = selectedTerm
    ? `${selectedTerm.name}${selectedTerm.isActive ? " - hiện hành" : ""}`
    : "Học kỳ";
  const horizontalSpace = selectedTerm?.isActive ? 5 : 7;
  const contentWidth = `${selectedLabel.length + horizontalSpace}ch`;

  const select = (
    <select
      aria-label="Học kỳ đang xem"
      value={selectedTermId}
      onChange={(event) => changeTerm(event.target.value)}
      style={variant === "header" ? { width: contentWidth } : undefined}
      className={
        variant === "header"
          ? "h-10 max-w-full rounded-xl border border-white/35 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-white focus:ring-2 focus:ring-white/25"
          : "h-11 min-w-65 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
      }
    >
      {terms.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
          {item.isActive ? " - hiện hành" : ""}
        </option>
      ))}
    </select>
  );

  if (variant === "header") {
    return <div className="max-w-full min-w-0">{select}</div>;
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Học kỳ đang xem
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Kỳ hiện hành được phép thao tác. Kỳ cũ chỉ dùng để xem lại dữ liệu.
          </div>
        </div>

        {select}
      </div>
    </section>
  );
}
