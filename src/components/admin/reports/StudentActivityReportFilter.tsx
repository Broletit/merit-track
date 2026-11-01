"use client";
import CohortFilter from "@/components/shared/CohortFilter";
import FilterRow from "@/components/shared/filters/FilterRow";

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

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <FilterRow className="grid gap-4 md:grid-cols-3">
      <div className="filter-field"><label>Khóa</label><CohortFilter /></div>
      <div className="filter-field"><label htmlFor="student-activity-report-activity">Hoạt động</label><select
        id="student-activity-report-activity"
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
      </div>

      <div className="filter-field"><label htmlFor="student-activity-report-class">Lớp</label><select
        id="student-activity-report-class"
        value={classes.some(item=>String(item.id) === searchParams.get("classId")) ? searchParams.get("classId") ?? "" : ""}
        onChange={(event) => updateParam("classId", event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500"
      >
        <option value="">Tất cả lớp</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code}
          </option>
        ))}
      </select>
      </div>
    </FilterRow>
  );
}
