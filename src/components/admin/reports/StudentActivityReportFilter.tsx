"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ActivityOption = {
  id: number;
  title: string;
};

type ClassOption = {
  id: number;
  code: string;
  name: string;
};

export default function StudentActivityReportFilter({
  activities,
  classes,
}: {
  activities: ActivityOption[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) params.set(key, value);
    else params.delete(key);

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <select
        defaultValue={searchParams.get("activityId") ?? ""}
        onChange={(event) => updateParam("activityId", event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả hoạt động trong kỳ</option>
        {activities.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("classId") ?? ""}
        onChange={(event) => updateParam("classId", event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả lớp</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} - {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}
