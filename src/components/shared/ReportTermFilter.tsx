"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ReportTermFilter({
  terms,
  selectedTermId,
}: {
  terms: Array<{
    id: number;
    name: string;
  }>;
  selectedTermId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set("termId", value);
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex justify-end">
      <select
        value={String(selectedTermId)}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-70 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500"
      >
        {terms.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}